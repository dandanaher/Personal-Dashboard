import { memo } from 'react';
import { Circle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useTasks } from '@/features/todos/hooks/useTasks';
import { useThemeStore } from '@/stores/themeStore';

interface TasksCardProps {
  className?: string;
}

export const TasksCard = memo(function TasksCard({ className = '' }: TasksCardProps) {
  const today = new Date();
  const accentColor = useThemeStore((state) => state.accentColor);
  const { tasks, loading } = useTasks(today, { includeCompleted: false });

  if (loading) {
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
          Tasks Today ({tasks.length})
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
        {tasks.length === 0 ? (
          <p className="text-xs text-secondary-500 dark:text-secondary-400 text-center py-1">
            No tasks for today. You're all clear!
          </p>
        ) : (
          <ul className="space-y-1.5">
            {tasks.slice(0, 3).map((task) => (
              <li
                key={task.id}
                className="flex items-start gap-2 text-sm text-secondary-700 dark:text-secondary-300"
              >
                <Circle size={14} className="mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1">{task.title}</span>
              </li>
            ))}
            {tasks.length > 3 && (
              <li className="text-xs text-secondary-500 dark:text-secondary-400 text-center pt-0.5">
                +{tasks.length - 3} more tasks
              </li>
            )}
          </ul>
        )}
      </div>
    </Card>
  );
});
