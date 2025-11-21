import { useState, useMemo, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui';
import { useHabits } from './hooks';
import { HabitList, AddHabitModal } from './components';
import { useThemeStore } from '@/stores/themeStore';
import type { Habit } from '@/lib/types';

function HabitsPage() {
  const { habits, loading, error, addHabit, updateHabit, deleteHabit, refetch } = useHabits();
  const accentColor = useThemeStore((state) => state.accentColor);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [completionStatus, setCompletionStatus] = useState<Record<string, boolean>>({});
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  // Handle completion status changes from HabitCards
  const handleCompletionChange = useCallback((habitId: string, isCompleted: boolean) => {
    setCompletionStatus(prev => {
      if (prev[habitId] === isCompleted) return prev;
      return { ...prev, [habitId]: isCompleted };
    });
  }, []);

  // Extract unique habit types from all habits
  const habitTypes = useMemo(() => {
    const types = new Set<string>();
    habits.forEach(habit => {
      if (habit.habit_type) {
        types.add(habit.habit_type);
      }
    });
    return Array.from(types).sort();
  }, [habits]);

  // Filter habits based on selected filter
  const filteredHabits = useMemo(() => {
    if (!selectedFilter) {
      return habits;
    }
    return habits.filter(habit => habit.habit_type === selectedFilter);
  }, [habits, selectedFilter]);

  // Sort habits: incomplete first, completed last
  const sortedHabits = useMemo(() => {
    return [...filteredHabits].sort((a, b) => {
      const aCompleted = completionStatus[a.id] ?? false;
      const bCompleted = completionStatus[b.id] ?? false;

      if (aCompleted === bCompleted) {
        // Keep original order if both have same completion status
        return 0;
      }

      // Incomplete habits come first
      return aCompleted ? 1 : -1;
    });
  }, [filteredHabits, completionStatus]);

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

  const handleSave = async (name: string, color: string, description?: string, habitType?: string) => {
    return await addHabit(name, color, description, 'check', 7, habitType);
  };

  const handleUpdate = async (id: string, updates: { name: string; color: string; description?: string; habitType?: string }) => {
    return await updateHabit(id, {
      name: updates.name,
      color: updates.color,
      description: updates.description,
      habit_type: updates.habitType,
    });
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

      {/* Filter Tags */}
      {habitTypes.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedFilter(null)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
              ${selectedFilter === null
                ? 'text-white'
                : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700'
              }
            `}
            style={selectedFilter === null ? { backgroundColor: accentColor } : undefined}
          >
            All ({habits.length})
          </button>
          {habitTypes.map(type => {
            const count = habits.filter(h => h.habit_type === type).length;
            return (
              <button
                key={type}
                onClick={() => setSelectedFilter(type)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                  ${selectedFilter === type
                    ? 'text-white'
                    : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700'
                  }
                `}
                style={selectedFilter === type ? { backgroundColor: accentColor } : undefined}
              >
                {type} ({count})
              </button>
            );
          })}
        </div>
      )}

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
        existingTypes={habitTypes}
      />
    </div>
  );
}

export default HabitsPage;
