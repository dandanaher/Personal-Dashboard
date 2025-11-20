import { useState, useMemo, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import type { Goal } from '@/lib/types';
import { useGoals, FilterType } from './hooks/useGoals';
import { GoalFilters } from './components/GoalFilters';
import { GoalsList } from './components/GoalsList';
import { AddGoalModal } from './components/AddGoalModal';

function GoalsPage() {
  // State
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

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
    return goals.filter(goal => goal.type === activeFilter);
  }, [goals, activeFilter]);

  // Calculate counts for each filter
  const filterCounts = useMemo(() => {
    const counts: Record<FilterType, number> = {
      all: goals.length,
      weekly: 0,
      monthly: 0,
      yearly: 0,
      open: 0,
    };

    goals.forEach(goal => {
      if (goal.type in counts) {
        counts[goal.type as FilterType]++;
      }
    });

    return counts;
  }, [goals]);

  // Get empty message based on filter
  const emptyMessage = useMemo(() => {
    if (activeFilter === 'all') {
      return 'No goals yet';
    }
    return `No ${activeFilter} goals`;
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

  const handleSave = useCallback(async (goalData: {
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
  }, [editingGoal, addGoal, updateGoal]);

  const handleDeleteClick = useCallback(async (goalId: string) => {
    if (window.confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
      await deleteGoal(goalId);
    }
  }, [deleteGoal]);

  const handleProgressChange = useCallback(async (goalId: string, progress: number) => {
    await updateProgress(goalId, progress);
  }, [updateProgress]);

  const handleToggleComplete = useCallback(async (goalId: string) => {
    await toggleComplete(goalId);
  }, [toggleComplete]);

  return (
    <div className="space-y-4">
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

      {/* Goals List */}
      <GoalsList
        goals={filteredGoals}
        loading={loading}
        habitData={habitData}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onProgressChange={handleProgressChange}
        onToggleComplete={handleToggleComplete}
        onAddClick={handleAddClick}
        emptyMessage={emptyMessage}
      />

      {/* Add/Edit Modal */}
      <AddGoalModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSave}
        editingGoal={editingGoal}
      />
    </div>
  );
}

export default GoalsPage;
