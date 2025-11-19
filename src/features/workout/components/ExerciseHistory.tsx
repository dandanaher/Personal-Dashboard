import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { X, TrendingUp, Award } from 'lucide-react';
import { useScrollLock } from '@/hooks/useScrollLock';
import type { CompletedExercise } from '@/lib/types';

interface ExerciseHistoryProps {
  exercise: CompletedExercise;
  onClose: () => void;
}

export default function ExerciseHistory({
  exercise,
  onClose,
}: ExerciseHistoryProps) {
  const allSetsHitTarget = exercise.main_sets.every(
    set => set.reps >= exercise.target_reps
  );

  // Prevent body scroll when modal is open
  useScrollLock(true);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed top-0 left-0 w-full h-full z-[60] flex items-end md:items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        className="
          w-full md:max-w-md
          bg-white dark:bg-secondary-900
          rounded-t-3xl md:rounded-3xl
          shadow-xl
          animate-slide-up md:animate-fade-in
          max-h-[80vh] overflow-hidden flex flex-col
        "
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-history-title"
      >
        {/* Handle bar for mobile */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-secondary-300 dark:bg-secondary-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-secondary-200 dark:border-secondary-700">
          <h2
            id="exercise-history-title"
            className="text-lg font-semibold text-secondary-900 dark:text-secondary-100"
          >
            {exercise.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-secondary-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Target info */}
          <div className="mb-4 p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary-600 dark:text-secondary-400">
                Target
              </span>
              <span className="font-medium text-secondary-900 dark:text-secondary-100">
                {exercise.target_sets} × {exercise.target_reps} @ {exercise.weight}kg
              </span>
            </div>
            {allSetsHitTarget && (
              <div className="flex items-center gap-1.5 mt-2 text-green-600 dark:text-green-400 text-sm">
                <TrendingUp className="h-4 w-4" />
                All sets hit target!
              </div>
            )}
          </div>

          {/* Main sets */}
          <div className="space-y-2 mb-4">
            <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
              Main Sets
            </h3>
            {exercise.main_sets.map((set, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-secondary-200 dark:bg-secondary-700 text-xs font-medium">
                    {index + 1}
                  </span>
                  <div>
                    <span className="font-medium text-secondary-900 dark:text-secondary-100">
                      {set.reps} reps
                    </span>
                    <span className="text-secondary-500 dark:text-secondary-400">
                      {' '}@ {set.weight}kg
                    </span>
                  </div>
                </div>
                <div className="text-xs text-secondary-500 dark:text-secondary-400">
                  {format(new Date(set.completed_at), 'h:mm:ss a')}
                </div>
              </div>
            ))}
          </div>

          {/* Failure set */}
          {exercise.failure_set && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
                Failure Set
              </h3>
              <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center rounded-full bg-orange-200 dark:bg-orange-800 text-xs font-medium text-orange-700 dark:text-orange-300">
                    F
                  </span>
                  <div>
                    <span className="font-medium text-secondary-900 dark:text-secondary-100">
                      {exercise.failure_set.reps} reps
                    </span>
                    <span className="text-secondary-500 dark:text-secondary-400">
                      {' '}@ {exercise.failure_set.weight}kg
                    </span>
                  </div>
                </div>
                <div className="text-xs text-secondary-500 dark:text-secondary-400">
                  {format(new Date(exercise.failure_set.completed_at), 'h:mm:ss a')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>,
    document.body
  );
}

// Session detail view showing all exercises
interface SessionDetailProps {
  templateName: string;
  startedAt: string;
  duration: number | null;
  exercises: CompletedExercise[];
  notes: string | null;
  onClose: () => void;
}

export function SessionDetail({
  templateName,
  startedAt,
  duration,
  exercises,
  notes,
  onClose,
}: SessionDetailProps) {
  const totalVolume = exercises.reduce((total, exercise) => {
    const mainVolume = exercise.main_sets.reduce(
      (sum, set) => sum + set.reps * set.weight,
      0
    );
    const failureVolume = exercise.failure_set
      ? exercise.failure_set.reps * exercise.failure_set.weight
      : 0;
    return total + mainVolume + failureVolume;
  }, 0);

  // Prevent body scroll when modal is open
  useScrollLock(true);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed top-0 left-0 w-full h-full z-[60] flex items-end md:items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        className="
          w-full md:max-w-lg
          bg-white dark:bg-secondary-900
          rounded-t-3xl md:rounded-3xl
          shadow-xl
          animate-slide-up md:animate-fade-in
          max-h-[90vh] overflow-hidden flex flex-col
        "
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-detail-title"
      >
        {/* Handle bar for mobile */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-secondary-300 dark:bg-secondary-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-secondary-200 dark:border-secondary-700">
          <div>
            <h2
              id="session-detail-title"
              className="text-lg font-semibold text-secondary-900 dark:text-secondary-100"
            >
              {templateName}
            </h2>
            <p className="text-sm text-secondary-500 dark:text-secondary-400">
              {format(new Date(startedAt), 'EEEE, MMM d, yyyy • h:mm a')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-secondary-500" />
          </button>
        </div>

        {/* Summary */}
        <div className="px-4 py-3 bg-secondary-50 dark:bg-secondary-800/50 border-b border-secondary-200 dark:border-secondary-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-secondary-900 dark:text-secondary-100">
                {duration ? `${Math.floor(duration / 60)}m` : '--'}
              </div>
              <div className="text-xs text-secondary-500 dark:text-secondary-400">
                Duration
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-secondary-900 dark:text-secondary-100">
                {exercises.reduce((sum, e) => sum + e.main_sets.length + (e.failure_set ? 1 : 0), 0)}
              </div>
              <div className="text-xs text-secondary-500 dark:text-secondary-400">
                Sets
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-secondary-900 dark:text-secondary-100">
                {(totalVolume / 1000).toFixed(1)}k
              </div>
              <div className="text-xs text-secondary-500 dark:text-secondary-400">
                Volume
              </div>
            </div>
          </div>
        </div>

        {/* Exercises */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {exercises.map((exercise, index) => {
            const allSetsHit = exercise.main_sets.every(
              s => s.reps >= exercise.target_reps
            );

            return (
              <div
                key={index}
                className="p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-secondary-900 dark:text-secondary-100">
                    {exercise.name}
                  </h3>
                  {allSetsHit && (
                    <Award className="h-4 w-4 text-green-500" />
                  )}
                </div>

                <div className="space-y-1">
                  {exercise.main_sets.map((set, setIdx) => (
                    <div
                      key={setIdx}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-secondary-600 dark:text-secondary-400">
                        Set {setIdx + 1}
                      </span>
                      <span className={`font-medium ${
                        set.reps >= exercise.target_reps
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-secondary-900 dark:text-secondary-100'
                      }`}>
                        {set.reps} × {set.weight}kg
                      </span>
                    </div>
                  ))}
                  {exercise.failure_set && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-orange-600 dark:text-orange-400">
                        Failure
                      </span>
                      <span className="font-medium text-orange-600 dark:text-orange-400">
                        {exercise.failure_set.reps} × {exercise.failure_set.weight}kg
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Notes */}
        {notes && (
          <div className="p-4 border-t border-secondary-200 dark:border-secondary-700">
            <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Notes
            </h3>
            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              {notes}
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>,
    document.body
  );
}
