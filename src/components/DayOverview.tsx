import { format } from 'date-fns';
import { useTasks } from '@/features/todos/hooks/useTasks';
import { useHabits } from '@/features/habits/hooks/useHabits';
import { useGoals } from '@/features/goals/hooks/useGoals';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { useCallback, useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import type { HabitLog } from '@/lib/types';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import LoadingSpinner from './ui/LoadingSpinner';
import Card from './ui/Card';

interface DayOverviewProps {
  className?: string;
}

export function DayOverview({ className = '' }: DayOverviewProps) {
  const today = new Date();
  const todayString = format(today, 'yyyy-MM-dd');
  const { user } = useAuthStore();
  const { accentColor } = useThemeStore();

  // Fetch data from all features
  const { tasks, loading: tasksLoading } = useTasks(today);
  const { habits, loading: habitsLoading } = useHabits();
  const { goals, loading: goalsLoading } = useGoals();

  // Fetch today's habit logs
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
      console.error('Error fetching habit logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, [user, todayString]);

  useEffect(() => {
    void fetchTodayLogs();
  }, [fetchTodayLogs]);

  // Loading state
  const isLoading = tasksLoading || habitsLoading || goalsLoading || logsLoading;

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <LoadingSpinner />
      </div>
    );
  }

  // Filter data for today
  const incompleteTasks = tasks.filter((task) => !task.completed);
  const activeGoals = goals.filter((goal) => !goal.completed).slice(0, 3); // Show top 3
  const habitLogsMap = new Map(habitLogs.map((log) => [log.habit_id, log.completed]));

  return (
    <div className={`space-y-3 ${className}`}>
      <h2 className="text-base font-bold text-secondary-900 dark:text-white">Day Overview</h2>

      {/* Tasks Section */}
      <Card padding="none" variant="outlined" className="overflow-hidden">
        <div className="px-3 py-2 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">
            Tasks Today ({incompleteTasks.length})
          </h3>
          <Link
            to="/tasks"
            className="text-xs flex items-center gap-0.5 hover:opacity-80 transition-opacity"
            style={{ color: accentColor }}
          >
            View All
            <ChevronRight size={14} />
          </Link>
        </div>
        <div className="p-3">
          {incompleteTasks.length === 0 ? (
            <p className="text-xs text-secondary-500 dark:text-secondary-400 text-center py-1">
              No tasks for today. You're all clear!
            </p>
          ) : (
            <ul className="space-y-1.5">
              {incompleteTasks.slice(0, 3).map((task) => (
                <li
                  key={task.id}
                  className="flex items-start gap-2 text-sm text-secondary-700 dark:text-secondary-300"
                >
                  <Circle size={14} className="mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1">{task.title}</span>
                </li>
              ))}
              {incompleteTasks.length > 3 && (
                <li className="text-xs text-secondary-500 dark:text-secondary-400 text-center pt-0.5">
                  +{incompleteTasks.length - 3} more tasks
                </li>
              )}
            </ul>
          )}
        </div>
      </Card>

      {/* Habits Section */}
      <Card padding="none" variant="outlined" className="overflow-hidden">
        <div className="px-3 py-2 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">
            Habits ({habits.filter((h) => habitLogsMap.get(h.id)).length}/{habits.length})
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

      {/* Goals Section */}
      <Card padding="none" variant="outlined" className="overflow-hidden">
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
              {activeGoals.map((goal) => (
                <li key={goal.id} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300 line-clamp-1">
                      {goal.title}
                    </span>
                    <span className="text-xs text-secondary-500 dark:text-secondary-400 flex-shrink-0 ml-2">
                      {goal.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-1.5">
                    <div
                      className="bg-primary-600 dark:bg-primary-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

export default DayOverview;
