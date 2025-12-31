import { RefreshCw, Plus } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { HabitCard } from './HabitCard';
import type { Habit, HabitLog } from '@/lib/types';

interface HabitListProps {
  habits: Habit[];
  loading: boolean;
  error: string | null;
  onEdit: (habit: Habit) => void;
  onDelete: (habit: Habit) => void;
  onRetry: () => void;
  onAddClick: () => void;
  onCompletionChange?: (habitId: string, isCompleted: boolean) => void;
  logsByHabit?: Record<string, HabitLog[]>;
}

// Loading skeleton for habit card
function HabitSkeleton() {
  return (
    <Card variant="outlined" padding="md">
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-secondary-200 dark:bg-secondary-700" />
            <div className="h-5 w-32 bg-secondary-200 dark:bg-secondary-700 rounded" />
          </div>
          <div className="flex gap-1">
            <div className="w-8 h-8 bg-secondary-200 dark:bg-secondary-700 rounded" />
            <div className="w-8 h-8 bg-secondary-200 dark:bg-secondary-700 rounded" />
            <div className="w-8 h-8 bg-secondary-200 dark:bg-secondary-700 rounded" />
          </div>
        </div>

        {/* Graph skeleton */}
        <div className="h-32 bg-secondary-100 dark:bg-secondary-800 rounded" />

        {/* Stats skeleton */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="h-16 bg-secondary-100 dark:bg-secondary-800 rounded" />
          <div className="h-16 bg-secondary-100 dark:bg-secondary-800 rounded" />
          <div className="h-16 bg-secondary-100 dark:bg-secondary-800 rounded" />
          <div className="h-16 bg-secondary-100 dark:bg-secondary-800 rounded" />
        </div>
      </div>
    </Card>
  );
}

export function HabitList({
  habits,
  loading,
  error,
  onEdit,
  onDelete,
  onRetry,
  onAddClick,
  onCompletionChange,
  logsByHabit,
}: HabitListProps) {
  // Error state
  if (error) {
    return (
      <Card variant="outlined" padding="md">
        <div className="text-center py-6">
          <p className="text-red-500 dark:text-red-400 mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <HabitSkeleton />
        <HabitSkeleton />
        <HabitSkeleton />
      </div>
    );
  }

  // Empty state
  if (habits.length === 0) {
    return (
      <Card variant="outlined" padding="lg">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary-100 dark:bg-secondary-800 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-secondary-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <p className="text-secondary-400 dark:text-secondary-500 mb-2 text-lg">No habits yet</p>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-6 max-w-xs mx-auto">
            Start tracking your daily habits and build better routines!
          </p>
          <Button variant="primary" onClick={onAddClick}>
            <Plus className="w-4 h-4 mr-2" />
            Create First Habit
          </Button>
        </div>
      </Card>
    );
  }

  // Render habits
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {habits.map((habit) => (
        <HabitCard
          key={habit.id}
          habit={habit}
          onEdit={() => onEdit(habit)}
          onDelete={() => onDelete(habit)}
          onCompletionChange={onCompletionChange}
          initialLogs={logsByHabit?.[habit.id]}
        />
      ))}
    </div>
  );
}
