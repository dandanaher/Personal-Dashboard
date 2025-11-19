import type { ExerciseType, DistanceUnit } from '@/lib/types';

interface SetDisplayProps {
  exerciseName: string;
  currentSet: number;
  totalSets: number;
  exerciseType?: ExerciseType;

  // Strength fields
  reps?: number;
  weight?: number;

  // Cardio fields
  distance?: number;
  distanceUnit?: DistanceUnit;
  targetTime?: number;

  // Timed fields - uses targetTime and weight

  isFailureSet?: boolean;
}

export default function SetDisplay({
  exerciseName,
  currentSet,
  totalSets,
  exerciseType = 'strength',
  reps = 0,
  weight = 0,
  distance = 0,
  distanceUnit = 'km',
  targetTime = 0,
  isFailureSet = false,
}: SetDisplayProps) {
  // Format time as mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  };

  // Render content based on exercise type
  const renderContent = () => {
    if (isFailureSet) {
      return (
        <div className="space-y-2">
          <div className="text-xl text-orange-300 font-semibold">
            Failure Set
          </div>
          <div className="text-lg text-primary-100">
            Go until failure @ {weight}kg
          </div>
        </div>
      );
    }

    switch (exerciseType) {
      case 'strength':
        return (
          <div className="space-y-2">
            <div className="text-xl text-primary-100">
              Set {currentSet} of {totalSets}
            </div>
            <div className="text-2xl font-semibold text-white">
              {reps} reps @ {weight}kg
            </div>
          </div>
        );

      case 'cardio':
        return (
          <div className="space-y-2">
            <div className="text-xl text-primary-100">
              Target
            </div>
            <div className="text-2xl font-semibold text-white">
              {distance} {distanceUnit}
            </div>
            {targetTime > 0 && (
              <div className="text-lg text-primary-200">
                in {formatDuration(targetTime)}
              </div>
            )}
          </div>
        );

      case 'timed':
        return (
          <div className="space-y-2">
            <div className="text-xl text-primary-100">
              Set {currentSet} of {totalSets}
            </div>
            <div className="text-2xl font-semibold text-white">
              Hold for {formatDuration(targetTime)}
            </div>
            {weight > 0 && (
              <div className="text-lg text-primary-200">
                @ {weight}kg
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <div className="text-xl text-primary-100">
              Set {currentSet} of {totalSets}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="text-center">
      <h1 className="text-3xl sm:text-4xl font-bold text-white uppercase tracking-tight mb-4">
        {exerciseName}
      </h1>
      {renderContent()}
    </div>
  );
}
