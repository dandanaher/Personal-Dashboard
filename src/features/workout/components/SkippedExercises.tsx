import type { Exercise } from '@/lib/types';
import { Button, Card } from '@/components/ui';

interface SkippedExercisesProps {
  skipped: number[];
  exercises: Exercise[];
  onReturn: (exerciseIdx: number) => void;
  onSkipAll: () => void;
}

export default function SkippedExercises({
  skipped,
  exercises,
  onReturn,
  onSkipAll,
}: SkippedExercisesProps) {
  const uniqueSkipped = Array.from(new Set(skipped)).filter((idx) => exercises[idx]);

  return (
    <div className="w-full max-w-lg mx-auto space-y-4 text-center text-white" data-no-tap>
      <Card className="bg-white/10 border-white/10">
        <div className="p-5">
          <h2 className="text-xl font-semibold mb-2 text-secondary-900 dark:text-secondary-50">
            Skipped Exercises
          </h2>
          <p className="text-sm text-secondary-600 dark:text-secondary-300">
            Finish these before ending your workout, or skip them to complete now.
          </p>
        </div>

        <div className="px-5 pb-4 space-y-2">
          {uniqueSkipped.map((idx) => (
            <button
              key={idx}
              onClick={() => onReturn(idx)}
              className="w-full text-left px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-secondary-900 dark:text-secondary-100"
            >
              <div className="text-sm font-medium">{exercises[idx].name}</div>
              <div className="text-xs text-secondary-500 dark:text-secondary-400">
                Tap to resume this exercise
              </div>
            </button>
          ))}
        </div>

        <div className="px-5 pb-5">
          <Button fullWidth variant="outline" onClick={onSkipAll}>
            Finish Workout (Skip Remaining)
          </Button>
        </div>
      </Card>
    </div>
  );
}
