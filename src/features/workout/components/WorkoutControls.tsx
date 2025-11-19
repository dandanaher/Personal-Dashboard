import { Pause, Play, Square } from 'lucide-react';

interface WorkoutControlsProps {
  isPaused: boolean;
  elapsedTime: string;
  exerciseProgress: string;
  onTogglePause: () => void;
  onEnd: () => void;
}

export default function WorkoutControls({
  isPaused,
  elapsedTime,
  exerciseProgress,
  onTogglePause,
  onEnd,
}: WorkoutControlsProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePause}
          className="p-2 rounded-full bg-primary-400 text-white hover:bg-primary-300 transition-colors"
          aria-label={isPaused ? 'Resume workout' : 'Pause workout'}
        >
          {isPaused ? (
            <Play className="h-5 w-5" />
          ) : (
            <Pause className="h-5 w-5" />
          )}
        </button>
        <button
          onClick={onEnd}
          className="p-2 rounded-full bg-primary-400 text-white hover:bg-red-500 transition-colors"
          aria-label="End workout"
        >
          <Square className="h-5 w-5" />
        </button>
      </div>

      <div className="text-center">
        <div className="text-xs text-primary-100">
          {exerciseProgress}
        </div>
      </div>

      <div className="text-right">
        <div className="text-lg font-mono font-bold text-white tabular-nums">
          {elapsedTime}
        </div>
      </div>
    </div>
  );
}
