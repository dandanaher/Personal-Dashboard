import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useHabits } from '@/features/habits/hooks/useHabits';
import { HOME_CACHE_TTL_MS, readCache, writeCache } from '@/lib/cache';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import supabase from '@/lib/supabase';
import type { Habit, HabitLog } from '@/lib/types';
import { logger } from '@/lib/logger';

interface HabitsCardProps {
  className?: string;
}

type HabitLogSummary = Pick<HabitLog, 'habit_id' | 'completed'>;

export const HabitsCard = memo(function HabitsCard({ className = '' }: HabitsCardProps) {
  const today = new Date();
  const todayString = format(today, 'yyyy-MM-dd');
  const user = useAuthStore((state) => state.user);
  const accentColor = useThemeStore((state) => state.accentColor);
  const { habits, loading: habitsLoading } = useHabits();

  const [habitLogs, setHabitLogs] = useState<HabitLogSummary[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const habitsCacheKey = user ? `home:habits:${user.id}` : null;
  const cachedHabits = useMemo(
    () => (habitsCacheKey ? readCache<Habit[]>(habitsCacheKey, HOME_CACHE_TTL_MS) : null),
    [habitsCacheKey]
  );
  const hasCachedHabits = cachedHabits !== null;
  const habitsToRender = habitsLoading && cachedHabits ? cachedHabits : habits;

  const logsCacheKey = user ? `home:habit-logs:${user.id}:${todayString}:completed` : null;
  const cachedLogs = useMemo(
    () => (logsCacheKey ? readCache<HabitLogSummary[]>(logsCacheKey, HOME_CACHE_TTL_MS) : null),
    [logsCacheKey]
  );
  const hasCachedLogs = cachedLogs !== null;
  const logsToRender = logsLoading && cachedLogs ? cachedLogs : habitLogs;

  const fetchTodayLogs = useCallback(async () => {
    if (!user) {
      setHabitLogs([]);
      setLogsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('habit_logs')
        .select('habit_id, completed')
        .eq('user_id', user.id)
        .eq('date', todayString)
        .eq('completed', true);

      if (error) throw error;
      setHabitLogs((data || []) as HabitLogSummary[]);
    } catch (err) {
      logger.error('Error fetching habit logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, [user, todayString]);

  useEffect(() => {
    void fetchTodayLogs();
  }, [fetchTodayLogs]);

  const { habitLogsMap, completedHabitsCount } = useMemo(() => {
    const logsMap = new Map(logsToRender.map((log) => [log.habit_id, log.completed]));
    const completedCount = habitsToRender.reduce(
      (count, habit) => count + (logsMap.get(habit.id) ? 1 : 0),
      0
    );
    return { habitLogsMap: logsMap, completedHabitsCount: completedCount };
  }, [logsToRender, habitsToRender]);

  const isLoading = habitsLoading && !hasCachedHabits;
  const logsReady = !logsLoading || hasCachedLogs;
  const completedLabel = logsReady ? completedHabitsCount : '--';

  useEffect(() => {
    if (!habitsCacheKey || habitsLoading) return;
    writeCache(
      habitsCacheKey,
      habits.filter((habit) => !habit.id.startsWith('temp-'))
    );
  }, [habitsCacheKey, habitsLoading, habits]);

  useEffect(() => {
    if (!logsCacheKey || logsLoading) return;
    writeCache(logsCacheKey, habitLogs);
  }, [logsCacheKey, logsLoading, habitLogs]);

  if (isLoading) {
    return (
      <Card padding="none" variant="outlined" className={`overflow-hidden ${className}`}>
        <div className="px-3 py-2 border-b border-secondary-200 dark:border-secondary-700">
          <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">Habits</h3>
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
          Habits ({completedLabel}/{habitsToRender.length})
        </h3>
        <Link
          to="/habits"
          className="text-xs flex items-center gap-0.5 hover:opacity-80 transition-opacity"
          style={{ color: accentColor }}
        >
          View All
          <ChevronRight size={14} />
        </Link>
      </div>
      <div className="p-3">
        {habitsToRender.length === 0 ? (
          <p className="text-xs text-secondary-500 dark:text-secondary-400 text-center py-1">
            No habits tracked yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {habitsToRender.slice(0, 4).map((habit) => {
              const isCompleted = logsReady && habitLogsMap.get(habit.id) === true;
              return (
                <li
                  key={habit.id}
                  className="flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-300"
                >
                  {isCompleted ? (
                    <CheckCircle2
                      size={14}
                      className="flex-shrink-0 text-green-600 dark:text-green-400"
                    />
                  ) : (
                    <Circle
                      size={14}
                      className="flex-shrink-0 text-secondary-400 dark:text-secondary-500"
                    />
                  )}
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: habit.color }}
                  />
                  <span className={isCompleted ? 'line-through opacity-60' : ''}>
                    {habit.name}
                  </span>
                </li>
              );
            })}
            {habitsToRender.length > 4 && (
              <li className="text-xs text-secondary-500 dark:text-secondary-400 text-center pt-0.5">
                +{habitsToRender.length - 4} more habits
              </li>
            )}
          </ul>
        )}
      </div>
    </Card>
  );
});
