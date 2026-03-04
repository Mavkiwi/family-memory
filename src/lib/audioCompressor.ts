const WHISPER_LIMIT = 24 * 1024 * 1024;
const CHUNK_DURATION_SEC = 600;
const TARGET_SAMPLE_RATE = 16000;

export interface CompressionResult {
  files: File[];
  wasCompressed: boolean;
  originalSize: number;
  totalCompressedSize: number;
  chunkCount: number;
  recordingId: string;
}

export interface CompressionProgress {
  stage: 'decoding' | 'processing' | 'encoding' | 'complete';
  percent: number;
  message: string;
}

export async function compressAudioForTranscription(
  file: File,
  onProgress?: (progress: CompressionProgress) => void
): Promise<CompressionResult> {
  const recordingId = crypto.randomUUID();

  if (file.size <= WHISPER_LIMIT) {
    return {
      files: [file],
      wasCompressed: false,
      originalSize: file.size,
      totalCompressedSize: file.size,
      chunkCount: 1,
      recordingId,
    };
  }

  onProgress?.({ stage: 'decoding', percent: 10, message: 'Decoding audio...' });

  const audioContext = new AudioContext();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  await audioContext.close();

  const totalDuration = audioBuffer.duration;

  onProgress?.({ stage: 'processing', percent: 30, message: 'Compressing audio...' });

  const estimatedFullSize = TARGET_SAMPLE_RATE * 2 * totalDuration + 44;
  const needsSplitting = estimatedFullSize > WHISPER_LIMIT;
  const chunkDuration = needsSplitting ? CHUNK_DURATION_SEC : totalDuration;
  const totalChunks = needsSplitting ? Math.ceil(totalDuration / chunkDuration) : 1;

  const files: File[] = [];
  const baseName = file.name.replace(/\.[^.]+$/, '');

  for (let i = 0; i < totalChunks; i++) {
    const startTime = i * chunkDuration;
    const endTime = Math.min(startTime + chunkDuration, totalDuration);
    const duration = endTime - startTime;

    const progressPercent = 30 + Math.round((i / totalChunks) * 60);
    onProgress?.({
      stage: 'encoding',
      percent: progressPercent,
      message: totalChunks > 1
        ? `Processing chunk ${i + 1} of ${totalChunks}...`
        : 'Downsampling audio...',
    });

    const chunkSamples = Math.ceil(duration * TARGET_SAMPLE_RATE);
    const offlineCtx = new OfflineAudioContext(1, chunkSamples, TARGET_SAMPLE_RATE);

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0, startTime, duration);

    const renderedBuffer = await offlineCtx.startRendering();
    const wavBlob = encodeWAV(renderedBuffer);

    const chunkName = totalChunks > 1
      ? `${baseName}-part${i + 1}.wav`
      : `${baseName}-compressed.wav`;

    files.push(new File([wavBlob], chunkName, { type: 'audio/wav' }));
  }

  const totalCompressedSize = files.reduce((sum, f) => sum + f.size, 0);

  onProgress?.({ stage: 'complete', percent: 100, message: 'Compression complete!' });

  return {
    files,
    wasCompressed: true,
    originalSize: file.size,
    totalCompressedSize,
    chunkCount: totalChunks,
    recordingId,
  };
}

function encodeWAV(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numSamples = audioBuffer.length;
  const bytesPerSample = 2;
  const dataSize = numSamples * numChannels * bytesPerSample;
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const channelData = audioBuffer.getChannelData(0);
  let offset = headerSize;
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += bytesPerSample;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export function needsCompression(file: File): boolean {
  return file.size > WHISPER_LIMIT;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
