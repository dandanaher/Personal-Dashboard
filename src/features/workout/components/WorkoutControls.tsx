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
          className="p-2 rounded-lg bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
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
          className="p-2 rounded-lg bg-secondary-100 dark:bg-secondary-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          aria-label="End workout"
        >
          <Square className="h-5 w-5" />
        </button>
      </div>

      <div className="text-center">
        <div className="text-xs text-secondary-500 dark:text-secondary-400">
          {exerciseProgress}
        </div>
      </div>

      <div className="text-right">
        <div className="text-lg font-mono font-bold text-secondary-900 dark:text-secondary-100 tabular-nums">
          {elapsedTime}
        </div>
      </div>
    </div>
  );
}
