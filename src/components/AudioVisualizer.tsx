import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  analyserNode: AnalyserNode | null;
  isRecording: boolean;
  color?: string;
}

export function AudioVisualizer({ analyserNode, isRecording, color = '#7c3aed' }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(undefined);

  useEffect(() => {
    if (!canvasRef.current || !analyserNode || !isRecording) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isRecording) return;

      animationRef.current = requestAnimationFrame(draw);
      analyserNode.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barCount = 32;
      const barWidth = canvas.width / barCount - 2;
      const centerY = canvas.height / 2;

      for (let i = 0; i < barCount; i++) {
        const index = Math.floor(i * bufferLength / barCount);
        const value = dataArray[index];
        const barHeight = (value / 255) * (canvas.height / 2 - 10);

        const x = i * (barWidth + 2);

        const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.5, `${color}aa`);
        gradient.addColorStop(1, color);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, centerY - barHeight, barWidth, barHeight * 2, 2);
        ctx.fill();
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyserNode, isRecording, color]);

  if (!isRecording) {
    return (
      <div className="h-20 flex items-center justify-center">
        <div className="flex gap-1 opacity-30">
          {Array.from({ length: 32 }).map((_, i) => (
            <div
              key={i}
              className="w-2 bg-muted-foreground rounded-full"
              style={{ height: `${Math.random() * 30 + 10}px` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={80}
      className="w-full max-w-xs mx-auto"
    />
  );
}
