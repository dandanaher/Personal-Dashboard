import { memo, useEffect, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useGoals } from '@/features/goals/hooks/useGoals';
import { getGoalDisplayProgress } from '@/features/goals/lib/progress';
import { HOME_CACHE_TTL_MS, readCache, writeCache } from '@/lib/cache';
import type { Goal } from '@/lib/types';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

interface GoalsCardProps {
  className?: string;
}

export const GoalsCard = memo(function GoalsCard({ className = '' }: GoalsCardProps) {
  const user = useAuthStore((state) => state.user);
  const accentColor = useThemeStore((state) => state.accentColor);
  const { goals, loading, habitData } = useGoals(undefined, {
    onlyActive: true,
    limit: 3,
    deferHabitData: true,
  });

  const cacheKey = user ? `home:goals:${user.id}:active:3` : null;
  const cachedGoals = useMemo(
    () => (cacheKey ? readCache<Goal[]>(cacheKey, HOME_CACHE_TTL_MS) : null),
    [cacheKey]
  );
  const hasCachedGoals = cachedGoals !== null;
  const goalsToRender = loading && cachedGoals ? cachedGoals : goals;

  const habitCacheKey = user ? `home:goal-habit-completions:${user.id}` : null;
  const cachedHabitCompletions = useMemo(
    () =>
      habitCacheKey
        ? readCache<Record<string, number>>(habitCacheKey, HOME_CACHE_TTL_MS)
        : null,
    [habitCacheKey]
  );

  const habitCompletionsMap = useMemo(() => {
    if (habitData.size > 0) {
      const next = new Map<string, number>();
      habitData.forEach((value, key) => {
        next.set(key, value.completions);
      });
      return next;
    }
    if (cachedHabitCompletions) {
      return new Map(
        Object.entries(cachedHabitCompletions).map(([id, count]) => [id, Number(count)])
      );
    }
    return new Map<string, number>();
  }, [habitData, cachedHabitCompletions]);

  useEffect(() => {
    if (!cacheKey || loading) return;
    writeCache(cacheKey, goals);
  }, [cacheKey, goals, loading]);

  useEffect(() => {
    if (!habitCacheKey || habitData.size === 0) return;
    const next: Record<string, number> = {};
    habitData.forEach((value, key) => {
      next[key] = value.completions;
    });
    writeCache(habitCacheKey, next);
  }, [habitCacheKey, habitData]);

  if (loading && !hasCachedGoals) {
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
          Active Goals ({goalsToRender.length})
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
        {goalsToRender.length === 0 ? (
          <p className="text-xs text-secondary-500 dark:text-secondary-400 text-center py-1">
            No active goals. Set one to get started!
          </p>
        ) : (
          <ul className="space-y-2">
            {goalsToRender.map((goal) => {
              // Calculate display progress (same logic as GoalCard)
              const hData = goal.linked_habit_id
                ? habitCompletionsMap.get(goal.linked_habit_id)
                : undefined;
              const habitCompletions = hData;
              const displayProgress =
                habitCompletions !== undefined
                  ? getGoalDisplayProgress(goal, habitCompletions)
                  : goal.completed
                    ? 100
                    : goal.progress;

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
