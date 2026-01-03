import { memo, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useGoals } from '@/features/goals/hooks/useGoals';
import { getGoalDisplayProgress } from '@/features/goals/lib/progress';
import { useThemeStore } from '@/stores/themeStore';

interface GoalsCardProps {
  className?: string;
}

export const GoalsCard = memo(function GoalsCard({ className = '' }: GoalsCardProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const { goals, loading, habitData } = useGoals(undefined, {
    onlyActive: true,
    limit: 3,
  });

  const activeGoals = useMemo(
    () => goals.filter((goal) => !goal.completed).slice(0, 3),
    [goals]
  );

  if (loading) {
    return (
      <Card padding="none" variant="outlined" className={`overflow-hidden ${className}`}>
        <div className="px-3 py-2 border-b border-secondary-200 dark:border-secondary-700">
          <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">Active Goals</h3>
        </div>
        <div className="p-4 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  return (
    <Card padding="none" variant="outlined" className={`overflow-hidden ${className}`}>
      <div className="px-3 py-2 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">
          Active Goals ({activeGoals.length})
        </h3>
        <Link
          to="/goals"
          className="text-xs flex items-center gap-0.5 hover:opacity-80 transition-opacity"
          style={{ color: accentColor }}
        >
          View All
          <ChevronRight size={14} />
        </Link>
      </div>
      <div className="p-3">
        {activeGoals.length === 0 ? (
          <p className="text-xs text-secondary-500 dark:text-secondary-400 text-center py-1">
            No active goals. Set one to get started!
          </p>
        ) : (
          <ul className="space-y-2">
            {activeGoals.map((goal) => {
              // Calculate display progress (same logic as GoalCard)
              const hData = goal.linked_habit_id
                ? habitData.get(goal.linked_habit_id)
                : undefined;
              const habitCompletions = hData?.completions || 0;
              const displayProgress = getGoalDisplayProgress(goal, habitCompletions);

              return (
                <li key={goal.id} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300 line-clamp-1">
                      {goal.title}
                    </span>
                    <span className="text-xs text-secondary-500 dark:text-secondary-400 flex-shrink-0 ml-2">
                      {displayProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${displayProgress}%`, backgroundColor: accentColor }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
});
