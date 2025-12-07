import { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  List,
  CalendarDays,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { addDays, subDays, isToday } from 'date-fns';
import { Button, Card } from '@/components/ui';
import { useThemeStore } from '@/stores/themeStore';
import { useTasks, useAllTasks } from './hooks';
import { TaskList } from './components/TaskList';
import { TaskItem } from './components/TaskItem';
import { AddTaskForm } from './components/AddTaskForm';
import { ToastProvider, useToast } from './components/Toast';
import { formatDisplayDate, formatDateHeader, toDateString, getTodayString } from '@/lib/dateUtils';
import type { Task, TaskUpdate } from '@/lib/types';

type ViewMode = 'day' | 'overview';

function TasksPageContent() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);

  // Day view tasks
  const {
    tasks: dayTasks,
    loading: dayLoading,
    error: dayError,
    addTask: addDayTask,
    toggleTask: toggleDayTask,
    deleteTask: deleteDayTask,
    updateTask: updateDayTask,
    refetch: refetchDay,
  } = useTasks(selectedDate);

  // All tasks for overview
  const {
    allTasks,
    upcomingTasks,
    datelessTasks,
    overdueTasks,
    loading: allLoading,
    error: allError,
    addTask: addAllTask,
    toggleTask: toggleAllTask,
    deleteTask: deleteAllTask,
    updateTask: updateAllTask,
    refetch: refetchAll,
  } = useAllTasks();

  const selectedDateString = toDateString(selectedDate);
  const todayString = getTodayString();

  // Check if there are uncompleted tasks BEFORE the selected date
  const hasTasksBeforeSelectedDate = useMemo(
    () =>
      allTasks.some(
        (task) =>
          !task.completed &&
          task.date !== null &&
          task.date < selectedDateString &&
          task.date < todayString
      ),
    [allTasks, selectedDateString, todayString]
  );

  const { showToast } = useToast();
  const { accentColor } = useThemeStore();

  // Navigation handlers
  const goToPreviousDay = useCallback(() => {
    setSelectedDate((prev) => subDays(prev, 1));
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate((prev) => addDays(prev, 1));
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  // Display date string
  const displayDate = useMemo(() => formatDisplayDate(selectedDate), [selectedDate]);

  // Handle add task for day view
  const handleAddDayTask = async (title: string, description?: string) => {
    const success = await addDayTask(title, description);
    if (success) {
      showToast('Task added', 'success');
      refetchAll(); // Refresh overview
    } else {
      showToast('Failed to add task', 'error');
    }
    return success;
  };

  // Handle add task for overview
  const handleAddOverviewTask = async (
    title: string,
    description?: string,
    date?: string | null
  ) => {
    const success = await addAllTask(title, description, date);
    if (success) {
      showToast('Task added', 'success');
    } else {
      showToast('Failed to add task', 'error');
    }
    return success;
  };

  // Handle toggle task for day view
  const handleToggleDayTask = async (taskId: string) => {
    await toggleDayTask(taskId);
    refetchAll(); // Refresh overview
  };

  // Handle toggle task for overview
  const handleToggleOverviewTask = async (taskId: string) => {
    await toggleAllTask(taskId);
  };

  // Handle delete task for day view
  const handleDeleteDayTask = async (taskId: string) => {
    const task = dayTasks.find((t) => t.id === taskId);
    if (!task) return;

    const confirmed = window.confirm(`Delete "${task.title}"?`);
    if (!confirmed) return;

    await deleteDayTask(taskId);
    showToast('Task deleted', 'success');
    refetchAll(); // Refresh overview
  };

  // Handle delete task for overview
  const handleDeleteOverviewTask = async (taskId: string) => {
    const allTasks = [...overdueTasks, ...upcomingTasks, ...datelessTasks];
    const task = allTasks.find((t) => t.id === taskId);
    if (!task) return;

    const confirmed = window.confirm(`Delete "${task.title}"?`);
    if (!confirmed) return;

    await deleteAllTask(taskId);
    showToast('Task deleted', 'success');
  };

  // Handle edit task for day view
  const handleEditDayTask = async (taskId: string, updates: TaskUpdate): Promise<boolean> => {
    const success = await updateDayTask(taskId, updates);
    if (success) {
      showToast('Task updated', 'success');
      refetchAll();
    } else {
      showToast('Failed to update task', 'error');
    }
    return success;
  };

  // Handle edit task for overview
  const handleEditOverviewTask = async (taskId: string, updates: TaskUpdate): Promise<boolean> => {
    const success = await updateAllTask(taskId, updates);
    if (success) {
      showToast('Task updated', 'success');
    } else {
      showToast('Failed to update task', 'error');
    }
    return success;
  };

  // Get completed tasks sorted reverse chronologically (newest first)
  const completedTasks = useMemo(
    () =>
      allTasks
        .filter((task) => task.completed)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()),
    [allTasks]
  );

  // Group upcoming tasks by date for display
  const groupedUpcomingTasks = useMemo(() => {
    const groups: { [key: string]: Task[] } = {};
    upcomingTasks.forEach((task) => {
      const date = task.date || 'No date';
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(task);
    });
    return groups;
  }, [upcomingTasks]);

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <Card variant="default" padding="md">
        <div className="flex items-center justify-center gap-2">
          <Button
            variant={viewMode === 'overview' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('overview')}
            className="flex-1"
          >
            <List className="h-4 w-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={viewMode === 'day' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('day')}
            className="flex-1"
          >
            <CalendarDays className="h-4 w-4 mr-2" />
            Day View
          </Button>
        </div>
      </Card>

      {viewMode === 'day' ? (
        // Day View Mode
        <>
          {/* Date Navigation */}
          <Card variant="default" padding="md">
            <div className="flex items-center">
              {/* Left side - equal width container */}
              <div className="flex-1 flex items-center justify-start gap-1">
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToPreviousDay}
                    aria-label="Previous day"
                    className="p-2"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  {/* Red circle indicator for uncompleted tasks before selected date */}
                  {hasTasksBeforeSelectedDate && (
                    <span
                      className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
                      title="You have uncompleted tasks from previous days"
                    />
                  )}
                </div>
                {/* Today button on left when viewing future dates */}
                {!isToday(selectedDate) && selectedDate > new Date() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToToday}
                    className="text-xs px-2 py-1"
                    style={{ color: accentColor }}
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Today
                  </Button>
                )}
              </div>

              {/* Date display - centered */}
              <h1 className="text-lg font-semibold text-secondary-900 dark:text-white text-center">
                {displayDate}
              </h1>

              {/* Right side - equal width container */}
              <div className="flex-1 flex items-center justify-end gap-1">
                {/* Today button on right when viewing past dates */}
                {!isToday(selectedDate) && selectedDate < new Date() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToToday}
                    className="text-xs px-2 py-1"
                    style={{ color: accentColor }}
                  >
                    Today
                    <Calendar className="h-3 w-3 ml-1" />
                  </Button>
                )}
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
            </div>
          </Card>

          {/* Add Task Form */}
          <Card variant="default" padding="md">
            <AddTaskForm
              onAdd={handleAddDayTask}
              defaultDate={selectedDateString}
              showDateToggle={false}
            />
          </Card>

          {/* Task List for selected day */}
          <TaskList
            tasks={dayTasks}
            loading={dayLoading}
            error={dayError}
            onToggle={handleToggleDayTask}
            onDelete={handleDeleteDayTask}
            onEdit={handleEditDayTask}
            onRetry={refetchDay}
          />

          {/* Task count */}
          {!dayLoading && !dayError && dayTasks.length > 0 && (
            <div className="text-center">
              <p className="text-sm text-secondary-400 dark:text-secondary-500">
                {dayTasks.filter((t) => !t.completed).length} remaining
                {dayTasks.filter((t) => t.completed).length > 0 &&
                  ` • ${dayTasks.filter((t) => t.completed).length} completed`}
              </p>
            </div>
          )}
        </>
      ) : (
        // Overview Mode
        <>
          {/* Add Task Form for overview */}
          <Card variant="default" padding="md">
            <AddTaskForm onAdd={handleAddOverviewTask} defaultDate={null} showDateToggle={true} />
          </Card>

          {/* Loading state */}
          {allLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-secondary-200 dark:bg-secondary-700 rounded-lg" />
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {allError && (
            <Card variant="outlined" className="text-center py-8">
              <AlertCircle className="h-10 w-10 mx-auto text-red-500 mb-3" />
              <h3 className="text-lg font-semibold text-secondary-700 dark:text-secondary-300 mb-2">
                Failed to load tasks
              </h3>
              <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">{allError}</p>
              <Button variant="outline" onClick={refetchAll}>
                Try Again
              </Button>
            </Card>
          )}

          {/* Task Overview */}
          {!allLoading && !allError && (
            <>
              {/* Overdue Tasks */}
              {overdueTasks.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold text-red-500 dark:text-red-400 px-1 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Overdue ({overdueTasks.length})
                  </h2>
                  <Card variant="default" padding="none">
                    <div className="divide-y divide-secondary-100 dark:divide-secondary-700">
                      {overdueTasks.map((task) => (
                        <div key={task.id} className="group">
                          <TaskItem
                            task={task}
                            onToggle={handleToggleOverviewTask}
                            onDelete={handleDeleteOverviewTask}
                            onEdit={handleEditOverviewTask}
                            showDate={true}
                          />
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {/* Upcoming Tasks by date */}
              {upcomingTasks.length > 0 && (
                <div className="space-y-4">
                  {Object.entries(groupedUpcomingTasks).map(([date, tasks]) => (
                    <div key={date} className="space-y-2">
                      <h2 className="text-sm font-semibold text-secondary-600 dark:text-secondary-400 px-1">
                        {formatDateHeader(date)}
                      </h2>
                      <Card variant="default" padding="none">
                        <div className="divide-y divide-secondary-100 dark:divide-secondary-700">
                          {tasks.map((task) => (
                            <div key={task.id} className="group">
                              <TaskItem
                                task={task}
                                onToggle={handleToggleOverviewTask}
                                onDelete={handleDeleteOverviewTask}
                                onEdit={handleEditOverviewTask}
                                showDate={false}
                              />
                            </div>
                          ))}
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
              )}

              {/* Dateless/General Tasks */}
              {datelessTasks.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold text-secondary-600 dark:text-secondary-400 px-1">
                    General Tasks ({datelessTasks.length})
                  </h2>
                  <Card variant="default" padding="none">
                    <div className="divide-y divide-secondary-100 dark:divide-secondary-700">
                      {datelessTasks.map((task) => (
                        <div key={task.id} className="group">
                          <TaskItem
                            task={task}
                            onToggle={handleToggleOverviewTask}
                            onDelete={handleDeleteOverviewTask}
                            onEdit={handleEditOverviewTask}
                            showDate={false}
                          />
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {/* Empty state */}
              {upcomingTasks.length === 0 &&
                datelessTasks.length === 0 &&
                overdueTasks.length === 0 && (
                  <Card variant="outlined" className="text-center py-12">
                    <List className="h-12 w-12 mx-auto text-secondary-400 dark:text-secondary-500 mb-4" />
                    <p className="text-secondary-500 dark:text-secondary-400 mb-2">No tasks yet</p>
                    <p className="text-sm text-secondary-400 dark:text-secondary-500">
                      Add a task above to get started!
                    </p>
                  </Card>
                )}

              {/* Summary */}
              {(upcomingTasks.length > 0 ||
                datelessTasks.length > 0 ||
                overdueTasks.length > 0) && (
                <div className="text-center">
                  <p className="text-sm text-secondary-400 dark:text-secondary-500">
                    {overdueTasks.length + upcomingTasks.length + datelessTasks.length} total tasks
                    {overdueTasks.length > 0 && (
                      <span className="text-red-500"> • {overdueTasks.length} overdue</span>
                    )}
                  </p>
                </div>
              )}

              {/* Completed Tasks Section */}
              {completedTasks.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                    className="w-full flex items-center justify-between px-1 py-2 text-sm font-semibold text-secondary-600 dark:text-secondary-400 hover:text-secondary-800 dark:hover:text-secondary-200 transition-colors"
                  >
                    <span>Completed Tasks ({completedTasks.length})</span>
                    {showCompletedTasks ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {showCompletedTasks && (
                    <Card variant="default" padding="none">
                      <div className="divide-y divide-secondary-100 dark:divide-secondary-700">
                        {completedTasks.map((task) => (
                          <div key={task.id} className="group">
                            <TaskItem
                              task={task}
                              onToggle={handleToggleOverviewTask}
                              onDelete={handleDeleteOverviewTask}
                              onEdit={handleEditOverviewTask}
                              showDate={true}
                            />
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </>
          )}
        </>
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
