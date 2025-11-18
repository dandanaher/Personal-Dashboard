interface SetDisplayProps {
  exerciseName: string;
  currentSet: number;
  totalSets: number;
  reps: number;
  weight: number;
  isFailureSet?: boolean;
}

export default function SetDisplay({
  exerciseName,
  currentSet,
  totalSets,
  reps,
  weight,
  isFailureSet = false,
}: SetDisplayProps) {
  return (
    <div className="text-center">
      <h1 className="text-3xl sm:text-4xl font-bold text-secondary-900 dark:text-secondary-100 uppercase tracking-tight mb-4">
        {exerciseName}
      </h1>

      {isFailureSet ? (
        <div className="space-y-2">
          <div className="text-xl text-orange-600 dark:text-orange-400 font-semibold">
            Failure Set
          </div>
          <div className="text-lg text-secondary-600 dark:text-secondary-400">
            Go until failure @ {weight}kg
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xl text-secondary-600 dark:text-secondary-400">
            Set {currentSet} of {totalSets}
          </div>
          <div className="text-2xl font-semibold text-secondary-900 dark:text-secondary-100">
            {reps} reps @ {weight}kg
          </div>
        </div>
      )}
    </div>
  );
}
