import { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react';
import { addDays, subDays, isToday } from 'date-fns';
import { Button, Card } from '@/components/ui';
import { useThemeStore } from '@/stores/themeStore';
import { useTasks, useAllTasks } from './hooks';
import { TaskList } from './components/TaskList';
import { TaskItem } from './components/TaskItem';
import { AddTaskModal } from './components/AddTaskModal';
import { ToastProvider, useToast } from './components/Toast';
import { formatDisplayDate, formatDateHeader, toDateString, getTodayString } from '@/lib/dateUtils';
import type { Task, TaskUpdate } from '@/lib/types';

type ViewMode = 'all' | 'day' | string; // 'all' for overview, 'day' for day view, or task_type string

function TasksPageContent() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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

  // Extract unique task types from all tasks
  const taskTypes = useMemo(() => {
    const types = new Set<string>();
    allTasks.forEach((task) => {
      if (task.task_type) {
        types.add(task.task_type);
      }
    });
    return Array.from(types).sort();
  }, [allTasks]);

  // Filter tasks based on selected view mode
  const filteredTasks = useMemo(() => {
    if (viewMode === 'all') {
      return { upcoming: upcomingTasks, dateless: datelessTasks, overdue: overdueTasks };
    }
    if (viewMode === 'day') {
      return null; // Day view uses dayTasks
    }
    // Filter by task type
    return {
      upcoming: upcomingTasks.filter((t) => t.task_type === viewMode),
      dateless: datelessTasks.filter((t) => t.task_type === viewMode),
      overdue: overdueTasks.filter((t) => t.task_type === viewMode),
    };
  }, [viewMode, upcomingTasks, datelessTasks, overdueTasks]);

  // Calculate counts for each filter
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: allTasks.filter((t) => !t.completed).length,
      day: dayTasks.filter((t) => !t.completed).length,
    };

    taskTypes.forEach((type) => {
      counts[type] = allTasks.filter((t) => t.task_type === type && !t.completed).length;
    });

    return counts;
  }, [allTasks, dayTasks, taskTypes]);

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

  // Handle add task
  const handleAddClick = useCallback(() => {
    setEditingTask(null);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setEditingTask(null);
  }, []);

  const handleEditClick = useCallback((task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  }, []);

  const handleSaveTask = useCallback(
    async (taskData: {
      title: string;
      description?: string | null;
      date?: string | null;
      task_type?: string | null;
    }): Promise<boolean> => {
      if (editingTask) {
        // Update existing task
        const success =
          viewMode === 'day'
            ? await updateDayTask(editingTask.id, taskData as TaskUpdate)
            : await updateAllTask(editingTask.id, taskData as TaskUpdate);

        if (success) {
          showToast('Task updated', 'success');
          if (viewMode === 'day') refetchAll();
        } else {
          showToast('Failed to update task', 'error');
        }
        return success;
      } else {
        // Add new task
        const success =
          viewMode === 'day'
            ? await addDayTask(taskData.title, taskData.description || undefined, taskData.task_type)
            : await addAllTask(
                taskData.title,
                taskData.description || undefined,
                taskData.date,
                taskData.task_type
              );

        if (success) {
          showToast('Task added', 'success');
          if (viewMode === 'day') refetchAll();
        } else {
          showToast('Failed to add task', 'error');
        }
        return success;
      }
    },
    [
      editingTask,
      viewMode,
      addDayTask,
      addAllTask,
      updateDayTask,
      updateAllTask,
      showToast,
      refetchAll,
    ]
  );

  // Handle toggle task
  const handleToggleDayTask = async (taskId: string) => {
    await toggleDayTask(taskId);
    refetchAll();
  };

  const handleToggleOverviewTask = async (taskId: string) => {
    await toggleAllTask(taskId);
  };

  // Handle delete task
  const handleDeleteDayTask = async (taskId: string) => {
    const task = dayTasks.find((t) => t.id === taskId);
    if (!task) return;

    const confirmed = window.confirm(`Delete "${task.title}"?`);
    if (!confirmed) return;

    await deleteDayTask(taskId);
    showToast('Task deleted', 'success');
    refetchAll();
  };

  const handleDeleteOverviewTask = async (taskId: string) => {
    const allTasksList = [...(filteredTasks?.overdue || []), ...(filteredTasks?.upcoming || []), ...(filteredTasks?.dateless || [])];
    const task = allTasksList.find((t) => t.id === taskId);
    if (!task) return;

    const confirmed = window.confirm(`Delete "${task.title}"?`);
    if (!confirmed) return;

    await deleteAllTask(taskId);
    showToast('Task deleted', 'success');
  };

  // Handle edit task
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

  // Filter completed tasks by current view mode (for tag-specific tabs)
  const filteredCompletedTasks = useMemo(() => {
    if (viewMode === 'all' || viewMode === 'day') {
      return completedTasks;
    }
    // Filter by tag
    return completedTasks.filter((task) => task.task_type === viewMode);
  }, [completedTasks, viewMode]);

  // Group upcoming tasks by date for display
  const groupedUpcomingTasks = useMemo(() => {
    if (!filteredTasks) return {};
    const groups: { [key: string]: Task[] } = {};
    filteredTasks.upcoming.forEach((task) => {
      const date = task.date || 'No date';
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(task);
    });
    return groups;
  }, [filteredTasks]);

  const loading = viewMode === 'day' ? dayLoading : allLoading;
  const error = viewMode === 'day' ? dayError : allError;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Tasks</h1>
        <Button size="sm" onClick={handleAddClick} className="gap-2">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        <button
          onClick={() => setViewMode('all')}
          className={`
            px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0
            ${
              viewMode === 'all'
                ? 'text-white'
                : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700'
            }
          `}
          style={viewMode === 'all' ? { backgroundColor: accentColor } : undefined}
        >
          All ({filterCounts.all || 0})
        </button>
        <button
          onClick={() => setViewMode('day')}
          className={`
            px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0
            ${
              viewMode === 'day'
                ? 'text-white'
                : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700'
            }
          `}
          style={viewMode === 'day' ? { backgroundColor: accentColor } : undefined}
        >
          Day View ({filterCounts.day || 0})
        </button>
        {taskTypes.map((type) => (
          <button
            key={type}
            onClick={() => setViewMode(type)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0
              ${
                viewMode === type
                  ? 'text-white'
                  : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700'
              }
            `}
            style={viewMode === type ? { backgroundColor: accentColor } : undefined}
          >
            {type} ({filterCounts[type] || 0})
          </button>
        ))}
      </div>

      {viewMode === 'day' ? (
        // Day View Mode
        <>
          {/* Date Navigation */}
          <Card variant="default" padding="sm">
            <div className="flex items-center">
              {/* Left side - equal width container */}
              <div className="flex-1 flex items-center justify-start gap-1">
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToPreviousDay}
                    aria-label="Previous day"
                    className="p-1.5"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {/* Red circle indicator for uncompleted tasks before selected date */}
                  {hasTasksBeforeSelectedDate && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full"
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
              <h2 className="text-base font-semibold text-secondary-900 dark:text-white text-center">
                {displayDate}
              </h2>

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
                  className="p-1.5"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Task List for selected day */}
          <TaskList
            tasks={dayTasks}
            loading={dayLoading}
            error={dayError}
            onToggle={handleToggleDayTask}
            onDelete={handleDeleteDayTask}
            onEdit={handleEditDayTask}
            onEditClick={handleEditClick}
            onRetry={refetchDay}
          />

          {/* Task count */}
          {!dayLoading && !dayError && dayTasks.length > 0 && (
            <div className="text-center">
              <p className="text-xs text-secondary-400 dark:text-secondary-500">
                {dayTasks.filter((t) => !t.completed).length} remaining
                {dayTasks.filter((t) => t.completed).length > 0 &&
                  ` • ${dayTasks.filter((t) => t.completed).length} completed`}
              </p>
            </div>
          )}
        </>
      ) : (
        // Overview Mode (All or filtered by task type)
        <>
          {/* Loading state */}
          {loading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-secondary-200 dark:bg-secondary-700 rounded-lg" />
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {error && (
            <Card variant="outlined" className="text-center py-6">
              <AlertCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
              <h3 className="text-base font-semibold text-secondary-700 dark:text-secondary-300 mb-1">
                Failed to load tasks
              </h3>
              <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={refetchAll}>
                Try Again
              </Button>
            </Card>
          )}

          {/* Task Overview */}
          {!loading && !error && filteredTasks && (
            <>
              {/* Overdue Tasks */}
              {filteredTasks.overdue.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs font-semibold text-red-500 dark:text-red-400 px-1 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Overdue ({filteredTasks.overdue.length})
                  </h2>
                  <Card variant="default" padding="none">
                    <div className="divide-y divide-secondary-100 dark:divide-secondary-700">
                      {filteredTasks.overdue.map((task) => (
                        <div key={task.id} className="group">
                          <TaskItem
                            task={task}
                            onToggle={handleToggleOverviewTask}
                            onDelete={handleDeleteOverviewTask}
                            onEdit={handleEditOverviewTask}
                            onEditClick={handleEditClick}
                            showDate={true}
                          />
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {/* Upcoming Tasks by date */}
              {filteredTasks.upcoming.length > 0 && (
                <div className="space-y-3">
                  {Object.entries(groupedUpcomingTasks).map(([date, tasks]) => (
                    <div key={date} className="space-y-2">
                      <h2 className="text-xs font-semibold text-secondary-600 dark:text-secondary-400 px-1">
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
                                onEditClick={handleEditClick}
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
              {filteredTasks.dateless.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs font-semibold text-secondary-600 dark:text-secondary-400 px-1">
                    {viewMode === 'all' ? 'General Tasks' : viewMode} ({filteredTasks.dateless.length})
                  </h2>
                  <Card variant="default" padding="none">
                    <div className="divide-y divide-secondary-100 dark:divide-secondary-700">
                      {filteredTasks.dateless.map((task) => (
                        <div key={task.id} className="group">
                          <TaskItem
                            task={task}
                            onToggle={handleToggleOverviewTask}
                            onDelete={handleDeleteOverviewTask}
                            onEdit={handleEditOverviewTask}
                            onEditClick={handleEditClick}
                            showDate={false}
                          />
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {/* Empty state */}
              {filteredTasks.upcoming.length === 0 &&
                filteredTasks.dateless.length === 0 &&
                filteredTasks.overdue.length === 0 && (
                  <Card variant="outlined" className="text-center py-8">
                    <AlertCircle className="h-10 w-10 mx-auto text-secondary-400 dark:text-secondary-500 mb-3" />
                    <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-1">
                      {viewMode === 'all' ? 'No tasks yet' : `No ${viewMode} tasks`}
                    </p>
                    <p className="text-xs text-secondary-400 dark:text-secondary-500">
                      Click the Add button above to get started!
                    </p>
                  </Card>
                )}

              {/* Summary */}
              {(filteredTasks.upcoming.length > 0 ||
                filteredTasks.dateless.length > 0 ||
                filteredTasks.overdue.length > 0) && (
                <div className="text-center">
                  <p className="text-xs text-secondary-400 dark:text-secondary-500">
                    {filteredTasks.overdue.length +
                      filteredTasks.upcoming.length +
                      filteredTasks.dateless.length}{' '}
                    total tasks
                    {filteredTasks.overdue.length > 0 && (
                      <span className="text-red-500"> • {filteredTasks.overdue.length} overdue</span>
                    )}
                  </p>
                </div>
              )}

              {/* Completed Tasks Section (all views except 'day') */}
              {viewMode !== 'day' && filteredCompletedTasks.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowCompletedTasks(!showCompletedTasks)}
                    className="w-full flex items-center justify-between px-1 py-1.5 text-xs font-semibold text-secondary-600 dark:text-secondary-400 hover:text-secondary-800 dark:hover:text-secondary-200 transition-colors"
                  >
                    <span>Completed Tasks ({filteredCompletedTasks.length})</span>
                    {showCompletedTasks ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {showCompletedTasks && (
                    <Card variant="default" padding="none">
                      <div className="divide-y divide-secondary-100 dark:divide-secondary-700">
                        {filteredCompletedTasks.map((task) => (
                          <div key={task.id} className="group">
                            <TaskItem
                              task={task}
                              onToggle={handleToggleOverviewTask}
                              onDelete={handleDeleteOverviewTask}
                              onEdit={handleEditOverviewTask}
                              onEditClick={handleEditClick}
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

      {/* Add/Edit Modal */}
      <AddTaskModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSaveTask}
        editingTask={editingTask}
        existingTypes={taskTypes}
        defaultDate={viewMode === 'day' ? selectedDateString : undefined}
      />
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
