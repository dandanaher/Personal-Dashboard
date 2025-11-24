import { Pause, Play, Square, Minimize2 } from 'lucide-react';

interface WorkoutControlsProps {
  isPaused: boolean;
  elapsedTime: string;
  exerciseProgress: string;
  onTogglePause: () => void;
  onEnd: () => void;
  onMinimize?: () => void;
  highlightColor?: string;
}

export default function WorkoutControls({
  isPaused,
  elapsedTime,
  exerciseProgress,
  onTogglePause,
  onEnd,
  onMinimize,
  highlightColor,
}: WorkoutControlsProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePause}
          className="p-2 rounded-full text-white hover:opacity-80 transition-colors"
          style={{ backgroundColor: highlightColor }}
          aria-label={isPaused ? 'Resume workout' : 'Pause workout'}
        >
          {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
        </button>
        <button
          onClick={onEnd}
          className="p-2 rounded-full text-white hover:bg-red-500 transition-colors"
          style={{ backgroundColor: highlightColor }}
          aria-label="End workout"
        >
          <Square className="h-5 w-5" />
        </button>
        {onMinimize && (
          <button
            onClick={onMinimize}
            className="p-2 rounded-full text-white hover:bg-white/20 transition-colors"
            style={{ backgroundColor: highlightColor }}
            aria-label="Minimize workout"
          >
            <Minimize2 className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="text-center">
        <div className="text-xs text-white/70">{exerciseProgress}</div>
      </div>

      <div className="text-right">
        <div className="text-lg font-mono font-bold text-white tabular-nums">{elapsedTime}</div>
      </div>
    </div>
  );
}
