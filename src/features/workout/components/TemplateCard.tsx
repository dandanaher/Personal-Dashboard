import { Play, Edit2, Copy, Trash2, Clock, Dumbbell, Link } from 'lucide-react';
import { Card } from '@/components/ui';
import { useThemeStore } from '@/stores/themeStore';
import { useHabits } from '@/features/habits/hooks/useHabits';
import type { WorkoutTemplate, WorkoutSession } from '@/lib/types';
import {
  calculateEstimatedDuration,
  calculateAverageDuration,
  formatTime,
} from '../lib/workoutEngine';

interface TemplateCardProps {
  template: WorkoutTemplate;
  sessions: WorkoutSession[];
  onStart: (template: WorkoutTemplate) => void;
  onEdit: (template: WorkoutTemplate) => void;
  onDuplicate: (template: WorkoutTemplate) => void;
  onDelete: (template: WorkoutTemplate) => void;
}

export default function TemplateCard({
  template,
  sessions,
  onStart,
  onEdit,
  onDuplicate,
  onDelete,
}: TemplateCardProps) {
  const { accentColor } = useThemeStore();
  const { habits } = useHabits();
  const exerciseCount = template.exercises.length;

  // Calculate duration - use historical average if available, otherwise estimate
  const averageDuration = calculateAverageDuration(sessions, template);
  const estimatedDuration = calculateEstimatedDuration(template.exercises);
  const displayDuration = averageDuration ?? estimatedDuration;
  const isHistoricalAverage = averageDuration !== null;

  // Find the linked habit name if template has one
  const linkedHabit = template.linked_habit_id
    ? habits.find((h) => h.id === template.linked_habit_id)
    : null;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-secondary-900 dark:text-secondary-100 truncate">
            {template.name}
          </h3>
          {template.description && (
            <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1 line-clamp-2">
              {template.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-secondary-500 dark:text-secondary-400">
            <span className="flex items-center gap-1">
              <Dumbbell className="h-3.5 w-3.5" />
              {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}
            </span>
            <span
              className="flex items-center gap-1"
              title={isHistoricalAverage ? 'Average from completed workouts' : 'Estimated duration'}
            >
              <Clock className="h-3.5 w-3.5" />
              {isHistoricalAverage ? '' : '~'}
              {formatTime(displayDuration)}
            </span>
            {linkedHabit && (
              <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400">
                <Link className="h-3.5 w-3.5" />
                {linkedHabit.name}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => onStart(template)}
          className="flex-shrink-0 w-12 h-12 rounded-full text-white flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ backgroundColor: accentColor }}
          aria-label={`Start ${template.name}`}
        >
          <Play className="h-5 w-5 ml-0.5" />
        </button>
      </div>

      {/* Exercise preview */}
      {template.exercises.length > 0 && (
        <div className="mt-3 pt-3 border-t border-secondary-200 dark:border-secondary-700">
          <div className="flex flex-wrap gap-1.5">
            {template.exercises.slice(0, 4).map((exercise, idx) => (
              <span
                key={idx}
                className="text-xs px-2 py-0.5 rounded-full bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400"
              >
                {exercise.name}
              </span>
            ))}
            {template.exercises.length > 4 && (
              <span className="text-xs px-2 py-0.5 text-secondary-500">
                +{template.exercises.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 pt-3 border-t border-secondary-200 dark:border-secondary-700 flex items-center gap-2">
        <button
          onClick={() => onEdit(template)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-secondary-600 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded-full transition-colors"
        >
          <Edit2 className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          onClick={() => onDuplicate(template)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-secondary-600 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded-full transition-colors"
        >
          <Copy className="h-3.5 w-3.5" />
          Duplicate
        </button>
        <button
          onClick={() => onDelete(template)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-secondary-600 dark:text-secondary-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors ml-auto"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </Card>
  );
}
