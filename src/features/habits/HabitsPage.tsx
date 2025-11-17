import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { useHabits } from './hooks';
import { HabitList, AddHabitModal } from './components';
import type { Habit } from '@/lib/types';

function HabitsPage() {
  const { habits, loading, error, addHabit, updateHabit, deleteHabit, refetch } = useHabits();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [deleteConfirmHabit, setDeleteConfirmHabit] = useState<Habit | null>(null);

  const handleAddClick = () => {
    setEditingHabit(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (habit: Habit) => {
    setEditingHabit(habit);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (habit: Habit) => {
    setDeleteConfirmHabit(habit);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmHabit) return;

    await deleteHabit(deleteConfirmHabit.id);
    setDeleteConfirmHabit(null);
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
        habits={habits}
        loading={loading}
        error={error}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onRetry={refetch}
        onAddClick={handleAddClick}
      />

      {/* Add/Edit Modal */}
      <AddHabitModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSave}
        editingHabit={editingHabit}
        onUpdate={handleUpdate}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmHabit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDeleteConfirmHabit(null);
            }
          }}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-secondary-900 rounded-xl shadow-xl p-6"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-description"
          >
            <h2
              id="delete-title"
              className="text-lg font-semibold text-secondary-900 dark:text-white mb-2"
            >
              Delete Habit
            </h2>
            <p
              id="delete-description"
              className="text-secondary-600 dark:text-secondary-400 mb-6"
            >
              Are you sure you want to delete "{deleteConfirmHabit.name}"? This will also delete all completion history. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmHabit(null)}
                fullWidth
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmDelete}
                fullWidth
                className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HabitsPage;
