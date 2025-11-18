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
      <h1 className="text-3xl sm:text-4xl font-bold text-white uppercase tracking-tight mb-4">
        {exerciseName}
      </h1>

      {isFailureSet ? (
        <div className="space-y-2">
          <div className="text-xl text-orange-300 font-semibold">
            Failure Set
          </div>
          <div className="text-lg text-primary-100">
            Go until failure @ {weight}kg
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xl text-primary-100">
            Set {currentSet} of {totalSets}
          </div>
          <div className="text-2xl font-semibold text-white">
            {reps} reps @ {weight}kg
          </div>
        </div>
      )}
    </div>
  );
}
