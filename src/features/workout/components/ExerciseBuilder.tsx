import { useState } from 'react';
import { X, GripVertical } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import type { Exercise } from '@/lib/types';

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
  const [name, setName] = useState(exercise?.name || '');
  const [sets, setSets] = useState(exercise?.sets?.toString() || '3');
  const [reps, setReps] = useState(exercise?.reps_per_set?.toString() || '8');
  const [weight, setWeight] = useState(exercise?.weight?.toString() || '0');
  const [restTime, setRestTime] = useState(exercise?.rest_time?.toString() || '120');
  const [toFailure, setToFailure] = useState(exercise?.to_failure || false);
  const [notes, setNotes] = useState(exercise?.notes || '');

  const handleSave = () => {
    if (!name.trim()) return;

    const newExercise: Exercise = {
      name: name.trim(),
      sets: parseInt(sets) || 3,
      reps_per_set: parseInt(reps) || 8,
      weight: parseFloat(weight) || 0,
      rest_time: parseInt(restTime) || 120,
      to_failure: toFailure,
      notes: notes.trim() || undefined,
    };

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
          placeholder="e.g., Bench Press"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          autoFocus
        />
      </div>

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
                    ? 'bg-primary-500 text-white'
                    : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700'
                }
              `}
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

export function ExerciseItem({
  exercise,
  index,
  onEdit,
  onDelete,
  dragHandleProps,
}: ExerciseItemProps) {
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
          {exercise.to_failure && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
              +F
            </span>
          )}
        </div>
        <div className="text-sm text-secondary-600 dark:text-secondary-400 mt-0.5">
          {exercise.sets} × {exercise.reps_per_set} @ {exercise.weight}kg
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
