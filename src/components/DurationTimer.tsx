import { AlertTriangle } from 'lucide-react';

interface DurationTimerProps {
  duration: number;
  isRecording: boolean;
  maxDuration?: number;
}

export function DurationTimer({ duration, isRecording, maxDuration = 300 }: DurationTimerProps) {
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const isWarning = duration >= maxDuration - 30;
  const isMaxed = duration >= maxDuration;

  return (
    <div className="text-center space-y-1">
      <div
        className={`text-2xl font-mono font-bold transition-colors ${
          isMaxed ? 'text-destructive animate-pulse' :
          isWarning ? 'text-primary' :
          'text-foreground'
        }`}
      >
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </div>
      {isRecording && isWarning && !isMaxed && (
        <div className="flex items-center justify-center gap-1 text-primary text-xs">
          <AlertTriangle className="w-3 h-3" />
          <span>Approaching {Math.floor(maxDuration / 60)} min limit</span>
        </div>
      )}
      {isRecording && isMaxed && (
        <div className="flex items-center justify-center gap-1 text-destructive text-xs">
          <AlertTriangle className="w-3 h-3" />
          <span>Max duration reached</span>
        </div>
      )}
    </div>
  );
}
