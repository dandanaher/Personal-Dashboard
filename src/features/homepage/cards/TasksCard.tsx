import { memo, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Circle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useTasks } from '@/features/todos/hooks/useTasks';
import { HOME_CACHE_TTL_MS, readCache, writeCache } from '@/lib/cache';
import type { Task } from '@/lib/types';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

interface TasksCardProps {
  className?: string;
}

export const TasksCard = memo(function TasksCard({ className = '' }: TasksCardProps) {
  const today = new Date();
  const todayString = format(today, 'yyyy-MM-dd');
  const user = useAuthStore((state) => state.user);
  const accentColor = useThemeStore((state) => state.accentColor);
  const { tasks, loading } = useTasks(today, { includeCompleted: false });

  const cacheKey = user ? `home:tasks:${user.id}:${todayString}:active` : null;
  const cachedTasks = useMemo(
    () => (cacheKey ? readCache<Task[]>(cacheKey, HOME_CACHE_TTL_MS) : null),
    [cacheKey]
  );
  const hasCachedTasks = cachedTasks !== null;
  const tasksToRender = loading && cachedTasks ? cachedTasks : tasks;

  useEffect(() => {
    if (!cacheKey || loading) return;
    writeCache(
      cacheKey,
      tasks.filter((task) => !task.id.startsWith('temp-'))
    );
  }, [cacheKey, loading, tasks]);

  if (loading && !hasCachedTasks) {
    return (
      <Card padding="none" variant="outlined" className={`overflow-hidden ${className}`}>
        <div className="px-3 py-2 border-b border-secondary-200 dark:border-secondary-700">
          <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">Tasks Today</h3>
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
          Tasks Today ({tasksToRender.length})
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
        {tasksToRender.length === 0 ? (
          <p className="text-xs text-secondary-500 dark:text-secondary-400 text-center py-1">
            No tasks for today. You're all clear!
          </p>
        ) : (
          <ul className="space-y-1.5">
            {tasksToRender.slice(0, 3).map((task) => (
              <li
                key={task.id}
                className="flex items-start gap-2 text-sm text-secondary-700 dark:text-secondary-300"
              >
                <Circle size={14} className="mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1">{task.title}</span>
              </li>
            ))}
            {tasksToRender.length > 3 && (
              <li className="text-xs text-secondary-500 dark:text-secondary-400 text-center pt-0.5">
                +{tasksToRender.length - 3} more tasks
              </li>
            )}
          </ul>
        )}
      </div>
    </Card>
  );
});
