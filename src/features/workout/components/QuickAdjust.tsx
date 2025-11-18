import { Minus, Plus } from 'lucide-react';

interface QuickAdjustProps {
  weight: number;
  reps: number;
  onAdjustWeight: (delta: number) => void;
  onAdjustReps: (delta: number) => void;
}

export default function QuickAdjust({
  weight,
  reps,
  onAdjustWeight,
  onAdjustReps,
}: QuickAdjustProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Weight adjustment */}
      <div className="flex items-center justify-between bg-secondary-100 dark:bg-secondary-800 rounded-lg p-2">
        <button
          onClick={() => onAdjustWeight(-2.5)}
          className="w-11 h-11 flex items-center justify-center rounded-lg bg-white dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-600 active:scale-95 transition-all touch-manipulation"
          aria-label="Decrease weight"
        >
          <Minus className="h-5 w-5" />
        </button>
        <div className="text-center px-2">
          <div className="text-lg font-bold text-secondary-900 dark:text-secondary-100">
            {weight}
          </div>
          <div className="text-xs text-secondary-500 dark:text-secondary-400">
            kg
          </div>
        </div>
        <button
          onClick={() => onAdjustWeight(2.5)}
          className="w-11 h-11 flex items-center justify-center rounded-lg bg-white dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-600 active:scale-95 transition-all touch-manipulation"
          aria-label="Increase weight"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Reps adjustment */}
      <div className="flex items-center justify-between bg-secondary-100 dark:bg-secondary-800 rounded-lg p-2">
        <button
          onClick={() => onAdjustReps(-1)}
          className="w-11 h-11 flex items-center justify-center rounded-lg bg-white dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-600 active:scale-95 transition-all touch-manipulation"
          aria-label="Decrease reps"
        >
          <Minus className="h-5 w-5" />
        </button>
        <div className="text-center px-2">
          <div className="text-lg font-bold text-secondary-900 dark:text-secondary-100">
            {reps}
          </div>
          <div className="text-xs text-secondary-500 dark:text-secondary-400">
            reps
          </div>
        </div>
        <button
          onClick={() => onAdjustReps(1)}
          className="w-11 h-11 flex items-center justify-center rounded-lg bg-white dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-600 active:scale-95 transition-all touch-manipulation"
          aria-label="Increase reps"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
