import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns';
import { Button, Card } from '@/components/ui';
import { useThemeStore } from '@/stores/themeStore';
import { useTasks } from './hooks/useTasks';
import { TaskList } from './components/TaskList';
import { AddTaskForm } from './components/AddTaskForm';
import { ToastProvider, useToast } from './components/Toast';

function TasksPageContent() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { tasks, loading, error, addTask, toggleTask, deleteTask, refetch } = useTasks(selectedDate);
  const { showToast } = useToast();
  const { accentColor } = useThemeStore();

  // Navigate to previous day
  const goToPreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  // Navigate to next day
  const goToNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  // Go to today
  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Format display date
  const getDisplayDate = () => {
    if (isToday(selectedDate)) {
      return `Today, ${format(selectedDate, 'MMM d')}`;
    }
    if (isTomorrow(selectedDate)) {
      return `Tomorrow, ${format(selectedDate, 'MMM d')}`;
    }
    if (isYesterday(selectedDate)) {
      return `Yesterday, ${format(selectedDate, 'MMM d')}`;
    }
    return format(selectedDate, 'EEEE, MMM d');
  };

  // Handle add task with toast feedback
  const handleAddTask = async (title: string, description?: string) => {
    const success = await addTask(title, description);
    if (success) {
      showToast('Task added', 'success');
    } else {
      showToast('Failed to add task', 'error');
    }
    return success;
  };

  // Handle toggle task
  const handleToggleTask = async (taskId: string) => {
    await toggleTask(taskId);
  };

  // Handle delete task with confirmation
  const handleDeleteTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Simple confirmation
    const confirmed = window.confirm(`Delete "${task.title}"?`);
    if (!confirmed) return;

    await deleteTask(taskId);
    showToast('Task deleted', 'success');
  };

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <Card variant="default" padding="md">
        <div className="flex items-center justify-between">
          {/* Previous day button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousDay}
            aria-label="Previous day"
            className="p-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          {/* Date display and Today button */}
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-lg font-semibold text-secondary-900 dark:text-white">
              {getDisplayDate()}
            </h1>
            {!isToday(selectedDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goToToday}
                className="text-xs p-1"
                style={{ color: accentColor }}
              >
                <Calendar className="h-3 w-3 mr-1" />
                Today
              </Button>
            )}
          </div>

          {/* Next day button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextDay}
            aria-label="Next day"
            className="p-2"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </Card>

      {/* Add Task Form */}
      <Card variant="default" padding="md">
        <AddTaskForm onAdd={handleAddTask} />
      </Card>

      {/* Task List */}
      <TaskList
        tasks={tasks}
        loading={loading}
        error={error}
        onToggle={handleToggleTask}
        onDelete={handleDeleteTask}
        onRetry={refetch}
      />

      {/* Task count */}
      {!loading && !error && tasks.length > 0 && (
        <div className="text-center">
          <p className="text-sm text-secondary-400 dark:text-secondary-500">
            {tasks.filter(t => !t.completed).length} remaining
            {tasks.filter(t => t.completed).length > 0 &&
              ` • ${tasks.filter(t => t.completed).length} completed`
            }
          </p>
        </div>
      )}
    </div>
  );
}

function TasksPage() {
  return (
    <ToastProvider>
      <TasksPageContent />
    </ToastProvider>
  );
}

export default TasksPage;
