import { useState, useCallback } from 'react';
import { Mic, Upload, PenLine, SkipForward, Loader2 } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { AudioVisualizer } from './AudioVisualizer';
import { DurationTimer } from './DurationTimer';
import { compressAudioForTranscription, formatSize, type CompressionProgress } from '@/lib/audioCompressor';
import { respondApi } from '@/lib/api';

type TabId = 'record' | 'upload' | 'write';

interface ResponseTabsProps {
  token: string;
  onComplete: () => void;
  onSkip: () => void;
}

export function ResponseTabs({ token, onComplete, onSkip }: ResponseTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('record');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState('');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [compressionProgress, setCompressionProgress] = useState<CompressionProgress | null>(null);

  const { isRecording, duration, analyserNode, startRecording, stopRecording, error: recError } = useAudioRecorder();

  const MAX_DURATION = 300; // 5 minutes

  const handleStopRecording = useCallback(async () => {
    const blob = await stopRecording();
    if (blob) setRecordedBlob(blob);
  }, [stopRecording]);

  // Auto-stop at max duration
  if (isRecording && duration >= MAX_DURATION) {
    handleStopRecording();
  }

  const handleSubmitAudio = useCallback(async (blob: Blob) => {
    setSubmitting(true);
    setError(null);
    try {
      // Compress if needed
      const file = new File([blob], 'recording.webm', { type: blob.type });
      const compressed = await compressAudioForTranscription(file, setCompressionProgress);
      const audioFile = compressed.files[0];

      // Get upload URL
      const { r2_key } = await respondApi.getUploadUrl(
        token,
        audioFile.name,
        audioFile.type,
        audioFile.size
      );

      // Upload
      await respondApi.uploadFile(token, r2_key, audioFile, audioFile.type);

      // Complete
      await respondApi.completeUpload(token, {
        r2_key,
        type: 'audio',
        file_size: audioFile.size,
        duration_seconds: duration,
        mime_type: audioFile.type,
      });

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setSubmitting(false);
      setCompressionProgress(null);
    }
  }, [token, duration, onComplete]);

  const handleSubmitText = useCallback(async () => {
    if (!textContent.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await respondApi.submitText(token, textContent.trim());
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }, [token, textContent, onComplete]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setError('Please select an audio file');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const compressed = await compressAudioForTranscription(file, setCompressionProgress);
      const audioFile = compressed.files[0];

      const { r2_key } = await respondApi.getUploadUrl(token, audioFile.name, audioFile.type, audioFile.size);
      await respondApi.uploadFile(token, r2_key, audioFile, audioFile.type);
      await respondApi.completeUpload(token, {
        r2_key,
        type: 'audio',
        file_size: audioFile.size,
        mime_type: audioFile.type,
      });

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setSubmitting(false);
      setCompressionProgress(null);
    }
  }, [token, onComplete]);

  const handleSkip = useCallback(async () => {
    setSubmitting(true);
    try {
      await respondApi.skip(token);
      onSkip();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip');
    } finally {
      setSubmitting(false);
    }
  }, [token, onSkip]);

  const tabs: { id: TabId; label: string; icon: typeof Mic }[] = [
    { id: 'record', label: 'Record', icon: Mic },
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'write', label: 'Write', icon: PenLine },
  ];

  return (
    <div className="space-y-4">
      {/* Tab buttons */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            disabled={isRecording || submitting}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            } disabled:opacity-50`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[200px]">
        {activeTab === 'record' && (
          <div className="space-y-4 text-center">
            <AudioVisualizer analyserNode={analyserNode} isRecording={isRecording} />
            <DurationTimer duration={duration} isRecording={isRecording} maxDuration={MAX_DURATION} />

            {!isRecording && !recordedBlob && (
              <button
                onClick={startRecording}
                disabled={submitting}
                className="mx-auto flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Mic className="w-5 h-5" />
                Start Recording
              </button>
            )}

            {isRecording && (
              <button
                onClick={handleStopRecording}
                className="mx-auto flex items-center gap-2 bg-destructive text-destructive-foreground px-6 py-3 rounded-full text-sm font-medium animate-recording-pulse"
              >
                <div className="w-3 h-3 bg-white rounded-sm" />
                Stop Recording
              </button>
            )}

            {recordedBlob && !isRecording && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Recording: {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')} ({formatSize(recordedBlob.size)})
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setRecordedBlob(null)}
                    disabled={submitting}
                    className="px-4 py-2 border border-border rounded-md text-sm hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    Re-record
                  </button>
                  <button
                    onClick={() => handleSubmitAudio(recordedBlob)}
                    disabled={submitting}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Submit Recording
                  </button>
                </div>
              </div>
            )}

            {recError && <p className="text-sm text-destructive">{recError}</p>}
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Upload an existing audio file (MP3, WAV, M4A, WebM)
            </p>
            <label className="mx-auto flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:border-primary transition-colors">
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Choose audio file</span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                disabled={submitting}
                className="hidden"
              />
            </label>
          </div>
        )}

        {activeTab === 'write' && (
          <div className="space-y-4">
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Write your answer here..."
              disabled={submitting}
              rows={6}
              className="w-full border border-input rounded-md p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {textContent.length.toLocaleString()} characters
              </span>
              <button
                onClick={handleSubmitText}
                disabled={submitting || !textContent.trim()}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Submit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Compression progress */}
      {compressionProgress && compressionProgress.stage !== 'complete' && (
        <div className="bg-secondary rounded-md p-3">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>{compressionProgress.message}</span>
          </div>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${compressionProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3">
          {error}
        </div>
      )}

      {/* Skip button */}
      <button
        onClick={handleSkip}
        disabled={submitting || isRecording}
        className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 disabled:opacity-50"
      >
        <SkipForward className="w-4 h-4" />
        Skip this question
      </button>
    </div>
  );
}
