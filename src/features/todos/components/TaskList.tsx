import { CheckSquare, AlertCircle } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { TaskItem } from './TaskItem';
import type { Task, TaskUpdate } from '@/lib/types';

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  onToggle: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onEdit?: (taskId: string, updates: TaskUpdate) => Promise<boolean>;
  onRetry: () => void;
}

// Skeleton loader for tasks
function TaskSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-start gap-3 p-4 bg-white dark:bg-secondary-800 rounded-lg">
        <div className="w-6 h-6 bg-secondary-200 dark:bg-secondary-700 rounded-md" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-3/4" />
          <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function TaskList({
  tasks,
  loading,
  error,
  onToggle,
  onDelete,
  onEdit,
  onRetry,
}: TaskListProps) {
  // Error state
  if (error) {
    return (
      <Card variant="outlined" className="text-center py-8">
        <AlertCircle className="h-10 w-10 mx-auto text-red-500 mb-3" />
        <h3 className="text-lg font-semibold text-secondary-700 dark:text-secondary-300 mb-2">
          Failed to load tasks
        </h3>
        <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">
          {error}
        </p>
        <Button variant="outline" onClick={onRetry}>
          Try Again
        </Button>
      </Card>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-2">
        <TaskSkeleton />
        <TaskSkeleton />
        <TaskSkeleton />
      </div>
    );
  }

  // Empty state
  if (tasks.length === 0) {
    return (
      <Card variant="outlined" className="text-center py-12">
        <CheckSquare className="h-12 w-12 mx-auto text-secondary-400 dark:text-secondary-500 mb-4" />
        <p className="text-secondary-500 dark:text-secondary-400 mb-2">
          No tasks for this day
        </p>
        <p className="text-sm text-secondary-400 dark:text-secondary-500">
          Add one to get started!
        </p>
      </Card>
    );
  }

  // Separate completed and incomplete tasks
  const incompleteTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  return (
    <div className="space-y-2">
      {/* Incomplete tasks */}
      {incompleteTasks.map(task => (
        <div key={task.id} className="group">
          <TaskItem
            task={task}
            onToggle={onToggle}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        </div>
      ))}

      {/* Completed tasks with separator */}
      {completedTasks.length > 0 && (
        <>
          {incompleteTasks.length > 0 && (
            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-secondary-200 dark:bg-secondary-700" />
              <span className="text-xs text-secondary-400 dark:text-secondary-500 uppercase tracking-wider">
                Completed ({completedTasks.length})
              </span>
              <div className="flex-1 h-px bg-secondary-200 dark:bg-secondary-700" />
            </div>
          )}
          {completedTasks.map(task => (
            <div key={task.id} className="group">
              <TaskItem
                task={task}
                onToggle={onToggle}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default TaskList;
