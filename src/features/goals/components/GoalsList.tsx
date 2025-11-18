import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Target, Plus } from 'lucide-react';
import { parseISO, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui';
import { Goal } from '@/lib/types';
import { GoalCard } from './GoalCard';

interface HabitCompletionData {
  habitId: string;
  habitName: string;
  completions: number;
}

interface GoalsListProps {
  goals: Goal[];
  loading: boolean;
  habitData: Map<string, HabitCompletionData>;
  onEdit: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
  onProgressChange: (goalId: string, progress: number) => void;
  onToggleComplete: (goalId: string) => void;
  onAddClick: () => void;
  emptyMessage?: string;
}

export function GoalsList({
  goals,
  loading,
  habitData,
  onEdit,
  onDelete,
  onProgressChange,
  onToggleComplete,
  onAddClick,
  emptyMessage = 'No goals',
}: GoalsListProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  // Separate active and completed goals
  const { activeGoals, completedGoals } = useMemo(() => {
    const active: Goal[] = [];
    const completed: Goal[] = [];

    goals.forEach(goal => {
      if (goal.completed) {
        completed.push(goal);
      } else {
        active.push(goal);
      }
    });

    // Sort active goals: overdue first, then by target date
    active.sort((a, b) => {
      const now = new Date();
      const aOverdue = a.target_date ? differenceInDays(parseISO(a.target_date), now) < 0 : false;
      const bOverdue = b.target_date ? differenceInDays(parseISO(b.target_date), now) < 0 : false;

      // Overdue goals come first
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Then sort by target date
      if (!a.target_date && !b.target_date) return 0;
      if (!a.target_date) return 1;
      if (!b.target_date) return -1;
      return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
    });

    // Sort completed goals by updated_at (most recent first)
    completed.sort((a, b) => {
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    return { activeGoals: active, completedGoals: completed };
  }, [goals]);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="h-40 bg-secondary-100 dark:bg-secondary-800 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Empty state
  if (goals.length === 0) {
    return (
      <div className="text-center py-12">
        <Target className="w-12 h-12 mx-auto text-secondary-400 dark:text-secondary-500 mb-4" />
        <p className="text-secondary-500 dark:text-secondary-400 mb-2">{emptyMessage}</p>
        <p className="text-sm text-secondary-400 dark:text-secondary-500 mb-4">
          Set your first goal and start tracking progress!
        </p>
        <Button onClick={onAddClick} variant="primary" className="gap-2">
          <Plus className="w-4 h-4" />
          Create Goal
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Goals Section */}
      {activeGoals.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300 flex items-center gap-2">
            <span>Active Goals</span>
            <span className="px-2 py-0.5 rounded-full bg-secondary-100 dark:bg-secondary-800 text-xs">
              {activeGoals.length}
            </span>
          </h2>
          <div className="space-y-3">
            {activeGoals.map(goal => {
              const hData = goal.linked_habit_id ? habitData.get(goal.linked_habit_id) : undefined;
              return (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => onEdit(goal)}
                  onDelete={() => onDelete(goal.id)}
                  onProgressChange={(progress) => onProgressChange(goal.id, progress)}
                  onToggleComplete={() => onToggleComplete(goal.id)}
                  linkedHabitName={hData?.habitName}
                  habitCompletions={hData?.completions}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Goals Section (Collapsible) */}
      {completedGoals.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-sm font-semibold text-secondary-700 dark:text-secondary-300 hover:text-secondary-900 dark:hover:text-white transition-colors w-full"
            aria-expanded={showCompleted}
            aria-controls="completed-goals"
          >
            {showCompleted ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <span>Completed</span>
            <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs">
              {completedGoals.length}
            </span>
          </button>

          {showCompleted && (
            <div id="completed-goals" className="space-y-3">
              {completedGoals.map(goal => {
                const hData = goal.linked_habit_id ? habitData.get(goal.linked_habit_id) : undefined;
                return (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={() => onEdit(goal)}
                    onDelete={() => onDelete(goal.id)}
                    onProgressChange={(progress) => onProgressChange(goal.id, progress)}
                    onToggleComplete={() => onToggleComplete(goal.id)}
                    linkedHabitName={hData?.habitName}
                    habitCompletions={hData?.completions}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Empty active goals but has completed */}
      {activeGoals.length === 0 && completedGoals.length > 0 && (
        <div className="text-center py-8">
          <p className="text-secondary-500 dark:text-secondary-400 mb-4">
            All goals completed! Time to set new ones.
          </p>
          <Button onClick={onAddClick} variant="primary" size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Goal
          </Button>
        </div>
      )}
    </div>
  );
}

export default GoalsList;
