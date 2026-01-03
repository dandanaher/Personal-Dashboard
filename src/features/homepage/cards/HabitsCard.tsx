import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useHabits } from '@/features/habits/hooks/useHabits';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import supabase from '@/lib/supabase';
import type { HabitLog } from '@/lib/types';
import { logger } from '@/lib/logger';

interface HabitsCardProps {
  className?: string;
}

export const HabitsCard = memo(function HabitsCard({ className = '' }: HabitsCardProps) {
  const today = new Date();
  const todayString = format(today, 'yyyy-MM-dd');
  const user = useAuthStore((state) => state.user);
  const accentColor = useThemeStore((state) => state.accentColor);
  const { habits, loading: habitsLoading } = useHabits();

  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const fetchTodayLogs = useCallback(async () => {
    if (!user) {
      setHabitLogs([]);
      setLogsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', todayString);

      if (error) throw error;
      setHabitLogs(data || []);
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
    const logsMap = new Map(habitLogs.map((log) => [log.habit_id, log.completed]));
    const completedCount = habits.reduce(
      (count, habit) => count + (logsMap.get(habit.id) ? 1 : 0),
      0
    );
    return { habitLogsMap: logsMap, completedHabitsCount: completedCount };
  }, [habitLogs, habits]);

  const isLoading = habitsLoading || logsLoading;

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
          Habits ({completedHabitsCount}/{habits.length})
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
        {habits.length === 0 ? (
          <p className="text-xs text-secondary-500 dark:text-secondary-400 text-center py-1">
            No habits tracked yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {habits.slice(0, 4).map((habit) => {
              const isCompleted = habitLogsMap.get(habit.id) === true;
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
            {habits.length > 4 && (
              <li className="text-xs text-secondary-500 dark:text-secondary-400 text-center pt-0.5">
                +{habits.length - 4} more habits
              </li>
            )}
          </ul>
        )}
      </div>
    </Card>
  );
});
