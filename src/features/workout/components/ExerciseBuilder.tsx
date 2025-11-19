import { useState } from 'react';
import { X, GripVertical, Dumbbell, Timer, Route } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useThemeStore } from '@/stores/themeStore';
import type { Exercise, ExerciseType, DistanceUnit } from '@/lib/types';

interface ExerciseBuilderProps {
  exercise?: Exercise;
  onSave: (exercise: Exercise) => void;
  onCancel: () => void;
}

const REST_TIME_PRESETS = [
  { label: '1m', value: 60 },
  { label: '1.5m', value: 90 },
  { label: '2m', value: 120 },
  { label: '3m', value: 180 },
];

export default function ExerciseBuilder({
  exercise,
  onSave,
  onCancel,
}: ExerciseBuilderProps) {
  const { accentColor } = useThemeStore();
  const [name, setName] = useState(exercise?.name || '');
  const [type, setType] = useState<ExerciseType>(exercise?.type || 'strength');
  const [sets, setSets] = useState(exercise?.sets?.toString() || '3');

  // Strength fields
  const [reps, setReps] = useState(exercise?.reps_per_set?.toString() || '8');
  const [weight, setWeight] = useState(exercise?.weight?.toString() || '0');

  // Cardio fields
  const [distance, setDistance] = useState(exercise?.distance?.toString() || '5');
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>(exercise?.distance_unit || 'km');
  // Store target time in minutes for the input (with 0.5 resolution for 30 sec increments)
  const [targetTimeMinutes, setTargetTimeMinutes] = useState(
    exercise?.target_time ? (exercise.target_time / 60).toString() : '30'
  );

  // Timed fields - duration in minutes
  const [durationMinutes, setDurationMinutes] = useState(
    exercise?.target_time ? (exercise.target_time / 60).toString() : '1'
  );

  // Convert minutes to seconds for saving
  const getTargetTimeSeconds = () => Math.round(parseFloat(targetTimeMinutes) * 60) || 1800;
  const getDurationSeconds = () => Math.round(parseFloat(durationMinutes) * 60) || 60;

  const [restTime, setRestTime] = useState(exercise?.rest_time?.toString() || '120');
  const [toFailure, setToFailure] = useState(exercise?.to_failure || false);
  const [notes, setNotes] = useState(exercise?.notes || '');

  const handleSave = () => {
    if (!name.trim()) return;

    const baseExercise = {
      name: name.trim(),
      type,
      sets: parseInt(sets) || (type === 'cardio' ? 1 : 3),
      rest_time: parseInt(restTime) || 120,
      to_failure: type === 'strength' ? toFailure : false,
      notes: notes.trim() || undefined,
    };

    let newExercise: Exercise;

    switch (type) {
      case 'strength':
        newExercise = {
          ...baseExercise,
          reps_per_set: parseInt(reps) || 8,
          weight: parseFloat(weight) || 0,
        };
        break;
      case 'cardio':
        newExercise = {
          ...baseExercise,
          distance: parseFloat(distance) || 5,
          distance_unit: distanceUnit,
          target_time: getTargetTimeSeconds(),
        };
        break;
      case 'timed':
        newExercise = {
          ...baseExercise,
          target_time: getDurationSeconds(),
          weight: parseFloat(weight) || undefined,
        };
        break;
      default:
        newExercise = baseExercise;
    }

    onSave(newExercise);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="space-y-4" onKeyDown={handleKeyDown}>
      <div>
        <Input
          label="Exercise Name"
          placeholder={
            type === 'strength' ? 'e.g., Bench Press' :
            type === 'cardio' ? 'e.g., Running' :
            'e.g., Plank'
          }
          value={name}
          onChange={e => setName(e.target.value)}
          required
          autoFocus
        />
      </div>

      {/* Exercise Type Selector with Folder-Style Card */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
          Exercise Type
        </label>
        <div className="grid grid-cols-3 gap-0">
          <button
            type="button"
            onClick={() => setType('strength')}
            className={`
              flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors
              rounded-tl-lg border-t border-l border-r
              ${type === 'strength'
                ? 'text-white relative z-10'
                : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700 border-secondary-300 dark:border-secondary-600'
              }
            `}
            style={type === 'strength' ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
          >
            <Dumbbell className="h-4 w-4" />
            Strength
          </button>
          <button
            type="button"
            onClick={() => setType('cardio')}
            className={`
              flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors
              border-t border-r
              ${type === 'cardio'
                ? 'text-white relative z-10'
                : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700 border-secondary-300 dark:border-secondary-600'
              }
            `}
            style={type === 'cardio' ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
          >
            <Route className="h-4 w-4" />
            Cardio
          </button>
          <button
            type="button"
            onClick={() => setType('timed')}
            className={`
              flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors
              rounded-tr-lg border-t border-r
              ${type === 'timed'
                ? 'text-white relative z-10'
                : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700 border-secondary-300 dark:border-secondary-600'
              }
            `}
            style={type === 'timed' ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
          >
            <Timer className="h-4 w-4" />
            Timed
          </button>
        </div>

        {/* Folder-style card content */}
        <div className="border border-t-0 border-secondary-300 dark:border-secondary-600 rounded-b-lg p-4 bg-secondary-50 dark:bg-secondary-800/50 -mt-px">
          {/* Strength Fields */}
          {type === 'strength' && (
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Sets"
                type="number"
                min="1"
                max="20"
                value={sets}
                onChange={e => setSets(e.target.value)}
                required
              />
              <Input
                label="Reps"
                type="number"
                min="1"
                max="100"
                value={reps}
                onChange={e => setReps(e.target.value)}
                required
              />
              <Input
                label="Weight (kg)"
                type="number"
                min="0"
                step="0.5"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                required
              />
            </div>
          )}

          {/* Cardio Fields */}
          {type === 'cardio' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">
                  Distance
                </label>
                <div className="flex">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={distance}
                    onChange={e => setDistance(e.target.value)}
                    className="w-full min-h-touch px-4 py-3 text-base rounded-l-lg border border-r-0 border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setDistanceUnit('km')}
                    className={`px-3 py-3 text-sm font-medium border-y border-l transition-colors ${
                      distanceUnit === 'km'
                        ? 'text-white'
                        : 'bg-white dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 border-secondary-300 dark:border-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                    }`}
                    style={distanceUnit === 'km' ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
                  >
                    Km
                  </button>
                  <button
                    type="button"
                    onClick={() => setDistanceUnit('m')}
                    className={`px-3 py-3 text-sm font-medium border-y transition-colors ${
                      distanceUnit === 'm'
                        ? 'text-white'
                        : 'bg-white dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 border-secondary-300 dark:border-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                    }`}
                    style={distanceUnit === 'm' ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
                  >
                    M
                  </button>
                  <button
                    type="button"
                    onClick={() => setDistanceUnit('mi')}
                    className={`px-3 py-3 text-sm font-medium border-y border-r rounded-r-lg transition-colors ${
                      distanceUnit === 'mi'
                        ? 'text-white'
                        : 'bg-white dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 border-secondary-300 dark:border-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                    }`}
                    style={distanceUnit === 'mi' ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
                  >
                    Mi
                  </button>
                </div>
              </div>
              <Input
                label="Time (min)"
                type="number"
                min="0.5"
                step="0.5"
                value={targetTimeMinutes}
                onChange={e => setTargetTimeMinutes(e.target.value)}
              />
            </div>
          )}

          {/* Timed Fields */}
          {type === 'timed' && (
            <div className="flex gap-3">
              <div className="w-16">
                <Input
                  label="Sets"
                  type="number"
                  min="1"
                  max="20"
                  value={sets}
                  onChange={e => setSets(e.target.value)}
                  required
                />
              </div>
              <div className="w-24">
                <Input
                  label="Duration"
                  type="number"
                  min="0.5"
                  max="60"
                  step="0.5"
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Input
                  label="Optional Weight (kg)"
                  type="number"
                  min="0"
                  step="0.5"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
          Rest Time
        </label>
        <div className="flex gap-2 mb-2">
          {REST_TIME_PRESETS.map(preset => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setRestTime(preset.value.toString())}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${
                  restTime === preset.value.toString()
                    ? 'text-white'
                    : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700'
                }
              `}
              style={restTime === preset.value.toString() ? { backgroundColor: accentColor } : undefined}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <Input
          type="number"
          min="10"
          max="600"
          step="10"
          value={restTime}
          onChange={e => setRestTime(e.target.value)}
          helperText="Seconds"
        />
      </div>

      {/* To Failure Toggle - Strength Only */}
      {type === 'strength' && (
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={toFailure}
              onChange={e => setToFailure(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-secondary-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-secondary-600 peer-checked:bg-primary-600"></div>
          </label>
          <div>
            <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
              To Failure
            </span>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">
              Add extra set until failure after main sets
            </p>
          </div>
        </div>
      )}

      <div>
        <Input
          label="Notes (optional)"
          placeholder="e.g., Focus on slow negatives"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={!name.trim()}>
          {exercise ? 'Update' : 'Add'} Exercise
        </Button>
      </div>
    </div>
  );
}

// Exercise item for list display
interface ExerciseItemProps {
  exercise: Exercise;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  dragHandleProps?: object;
}

// Helper to format exercise details based on type
function getExerciseDetails(exercise: Exercise): string {
  const type = exercise.type || 'strength';

  switch (type) {
    case 'strength':
      return `${exercise.sets} × ${exercise.reps_per_set || 0} @ ${exercise.weight || 0}kg`;
    case 'cardio': {
      const distance = exercise.distance || 0;
      const unit = exercise.distance_unit || 'km';
      const targetMins = Math.floor((exercise.target_time || 0) / 60);
      const targetSecs = (exercise.target_time || 0) % 60;
      return `${distance}${unit} in ${targetMins}:${targetSecs.toString().padStart(2, '0')}`;
    }
    case 'timed': {
      const duration = exercise.target_time || 0;
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      const timeStr = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
      const weightStr = exercise.weight ? ` @ ${exercise.weight}kg` : '';
      return `${exercise.sets} × ${timeStr}${weightStr}`;
    }
    default:
      return `${exercise.sets} sets`;
  }
}

// Helper to get type badge color
function getTypeBadgeColor(type: ExerciseType | undefined): string {
  switch (type) {
    case 'cardio':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
    case 'timed':
      return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
    default:
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  }
}

export function ExerciseItem({
  exercise,
  index,
  onEdit,
  onDelete,
  dragHandleProps,
}: ExerciseItemProps) {
  const exerciseType = exercise.type || 'strength';
  const typeLabel = exerciseType.charAt(0).toUpperCase() + exerciseType.slice(1);

  return (
    <div className="flex items-center gap-3 p-3 bg-secondary-50 dark:bg-secondary-800/50 rounded-lg">
      <div {...dragHandleProps} className="cursor-grab text-secondary-400">
        <GripVertical className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-secondary-500 dark:text-secondary-400">
            {index + 1}
          </span>
          <span className="font-medium text-secondary-900 dark:text-secondary-100 truncate">
            {exercise.name}
          </span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${getTypeBadgeColor(exercise.type)}`}>
            {typeLabel}
          </span>
          {exercise.to_failure && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
              +F
            </span>
          )}
        </div>
        <div className="text-sm text-secondary-600 dark:text-secondary-400 mt-0.5">
          {getExerciseDetails(exercise)}
          <span className="mx-1">·</span>
          {Math.floor(exercise.rest_time / 60)}:{(exercise.rest_time % 60).toString().padStart(2, '0')} rest
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 text-secondary-500 hover:text-primary-600 dark:hover:text-primary-400 rounded transition-colors"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 text-secondary-500 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
