import { useState, useMemo, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { useHabits } from './hooks';
import { HabitList, AddHabitModal } from './components';
import type { Habit } from '@/lib/types';

function HabitsPage() {
  const { habits, loading, error, addHabit, updateHabit, deleteHabit, refetch } = useHabits();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [completionStatus, setCompletionStatus] = useState<Record<string, boolean>>({});

  // Handle completion status changes from HabitCards
  const handleCompletionChange = useCallback((habitId: string, isCompleted: boolean) => {
    setCompletionStatus(prev => {
      if (prev[habitId] === isCompleted) return prev;
      return { ...prev, [habitId]: isCompleted };
    });
  }, []);

  // Sort habits: incomplete first, completed last
  const sortedHabits = useMemo(() => {
    return [...habits].sort((a, b) => {
      const aCompleted = completionStatus[a.id] ?? false;
      const bCompleted = completionStatus[b.id] ?? false;

      if (aCompleted === bCompleted) {
        // Keep original order if both have same completion status
        return 0;
      }

      // Incomplete habits come first
      return aCompleted ? 1 : -1;
    });
  }, [habits, completionStatus]);

  const handleAddClick = () => {
    setEditingHabit(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (habit: Habit) => {
    setEditingHabit(habit);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (habit: Habit) => {
    if (window.confirm(`Are you sure you want to delete "${habit.name}"? This will also delete all completion history. This action cannot be undone.`)) {
      await deleteHabit(habit.id);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingHabit(null);
  };

  const handleSave = async (name: string, color: string, description?: string) => {
    return await addHabit(name, color, description);
  };

  const handleUpdate = async (id: string, updates: { name: string; color: string; description?: string }) => {
    return await updateHabit(id, updates);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Habits</h1>
        <Button size="sm" onClick={handleAddClick} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Habit</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Habit List */}
      <HabitList
        habits={sortedHabits}
        loading={loading}
        error={error}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onRetry={refetch}
        onAddClick={handleAddClick}
        onCompletionChange={handleCompletionChange}
      />

      {/* Add/Edit Modal */}
      <AddHabitModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSave}
        editingHabit={editingHabit}
        onUpdate={handleUpdate}
      />
    </div>
  );
}

export default HabitsPage;
