import { useState, useMemo, useCallback } from 'react';
import { Plus, Target, Calendar, CalendarDays, CalendarRange, Clock, Infinity } from 'lucide-react';
import { Button } from '@/components/ui';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useThemeStore } from '@/stores/themeStore';
import type { Goal } from '@/lib/types';
import { useGoals, FilterType } from './hooks/useGoals';
import { GoalFilters } from './components/GoalFilters';
import { KanbanBoard } from './components/KanbanBoard';
import { AddGoalModal } from './components/AddGoalModal';

const filterConfig: { value: FilterType; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All Goals', icon: <Target className="h-4 w-4 flex-shrink-0" /> },
  { value: 'weekly', label: 'This Week', icon: <CalendarDays className="h-4 w-4 flex-shrink-0" /> },
  { value: 'monthly', label: 'This Month', icon: <Calendar className="h-4 w-4 flex-shrink-0" /> },
  { value: 'yearly', label: 'This Year', icon: <CalendarRange className="h-4 w-4 flex-shrink-0" /> },
  { value: 'custom', label: 'Custom Date', icon: <Clock className="h-4 w-4 flex-shrink-0" /> },
  { value: 'open', label: 'No Deadline', icon: <Infinity className="h-4 w-4 flex-shrink-0" /> },
];

function GoalsPage() {
  // State
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const { isCollapsed } = useSidebarStore();
  const { accentColor } = useThemeStore();

  // Desktop layout classes
  const desktopPageClasses = `hidden lg:flex fixed inset-0 ${isCollapsed ? 'lg:left-20' : 'lg:left-64'} transition-all duration-300`;

  // Get goals from hook
  const {
    goals,
    loading,
    error,
    habitData,
    addGoal,
    updateGoal,
    updateProgress,
    toggleComplete,
    deleteGoal,
  } = useGoals();

  // Filter goals based on active filter
  const filteredGoals = useMemo(() => {
    if (activeFilter === 'all') return goals;
    return goals.filter((goal) => goal.type === activeFilter);
  }, [goals, activeFilter]);

  // Calculate counts for each filter
  const filterCounts = useMemo(() => {
    const counts: Record<FilterType, number> = {
      all: goals.length,
      weekly: 0,
      monthly: 0,
      yearly: 0,
      custom: 0,
      open: 0,
    };

    goals.forEach((goal) => {
      if (goal.type in counts) {
        counts[goal.type as FilterType]++;
      }
    });

    return counts;
  }, [goals]);

  // Get empty message based on filter
  const emptyMessage = useMemo(() => {
    const messages: Record<FilterType, string> = {
      all: 'No goals yet',
      weekly: 'No goals this week',
      monthly: 'No goals this month',
      yearly: 'No goals this year',
      custom: 'No goals with custom date',
      open: 'No goals without deadline',
    };
    return messages[activeFilter];
  }, [activeFilter]);

  // Handlers
  const handleAddClick = useCallback(() => {
    setEditingGoal(null);
    setIsModalOpen(true);
  }, []);

  const handleEditClick = useCallback((goal: Goal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setEditingGoal(null);
  }, []);

  const handleSave = useCallback(
    async (goalData: {
      title: string;
      description?: string | null;
      type: Goal['type'];
      target_date?: string | null;
      progress?: number;
      linked_habit_id?: string | null;
      target_completions?: number | null;
    }): Promise<boolean> => {
      if (editingGoal) {
        // Update existing goal
        return updateGoal(editingGoal.id, goalData);
      } else {
        // Add new goal
        const result = await addGoal(goalData);
        return result !== null;
      }
    },
    [editingGoal, addGoal, updateGoal]
  );

  const handleDeleteClick = useCallback(
    async (goalId: string) => {
      if (
        window.confirm('Are you sure you want to delete this goal? This action cannot be undone.')
      ) {
        await deleteGoal(goalId);
      }
    },
    [deleteGoal]
  );

  const handleProgressChange = useCallback(
    async (goalId: string, progress: number) => {
      await updateProgress(goalId, progress);
    },
    [updateProgress]
  );

  const handleToggleComplete = useCallback(
    async (goalId: string) => {
      await toggleComplete(goalId);
    },
    [toggleComplete]
  );

  const activeFilterLabel = filterConfig.find(f => f.value === activeFilter)?.label || 'Goals';

  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Goals</h1>
          <Button size="sm" onClick={handleAddClick} className="gap-2">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {/* Filters */}
        <GoalFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={filterCounts}
        />

        {/* Error state */}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Kanban Board */}
        <KanbanBoard
          goals={filteredGoals}
          loading={loading}
          habitData={habitData}
          onEdit={handleEditClick}
          onDelete={(goalId) => void handleDeleteClick(goalId)}
          onProgressChange={(goalId, progress) => void handleProgressChange(goalId, progress)}
          onToggleComplete={(goalId) => void handleToggleComplete(goalId)}
          onAddClick={handleAddClick}
          emptyMessage={emptyMessage}
        />
      </div>

      {/* Desktop View */}
      <div className={desktopPageClasses}>
        {/* Left Panel - Filters */}
        <div className="w-64 flex-shrink-0 h-full border-r border-secondary-200 dark:border-secondary-800 bg-white dark:bg-secondary-900 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="h-[60px] flex items-center justify-between px-4 border-b border-secondary-200 dark:border-secondary-800 flex-shrink-0">
            <h1 className="text-xl font-bold text-secondary-900 dark:text-white">Goals</h1>
            <Button size="sm" onClick={handleAddClick} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {/* Filter List */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-1">
              {filterConfig.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setActiveFilter(filter.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeFilter === filter.value
                    ? 'text-white'
                    : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800'
                    }`}
                  style={activeFilter === filter.value ? { backgroundColor: accentColor } : undefined}
                >
                  {filter.icon}
                  <span className="flex-1 text-left">{filter.label}</span>
                  <span className="text-xs opacity-70">{filterCounts[filter.value] || 0}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-light-bg dark:bg-secondary-900">
          {/* Header */}
          <div className="h-[60px] flex items-center px-6 border-b border-secondary-200 dark:border-secondary-800 bg-white dark:bg-secondary-900 flex-shrink-0">
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
              {activeFilterLabel}
            </h2>
          </div>

          {/* Error state */}
          {error && (
            <div className="m-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <KanbanBoard
              goals={filteredGoals}
              loading={loading}
              habitData={habitData}
              onEdit={handleEditClick}
              onDelete={(goalId) => void handleDeleteClick(goalId)}
              onProgressChange={(goalId, progress) => void handleProgressChange(goalId, progress)}
              onToggleComplete={(goalId) => void handleToggleComplete(goalId)}
              onAddClick={handleAddClick}
              emptyMessage={emptyMessage}
            />
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AddGoalModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSave}
        editingGoal={editingGoal}
      />
    </>
  );
}

export default GoalsPage;
