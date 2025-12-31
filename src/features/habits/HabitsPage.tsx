import { useState, useMemo, useCallback } from 'react';
import { Plus, Grid, Tag } from 'lucide-react';
import { Button } from '@/components/ui';
import { useHabits, useAllHabitLogs } from './hooks';
import { HabitList, AddHabitModal } from './components';
import { useThemeStore } from '@/stores/themeStore';
import { useSidebarStore } from '@/stores/sidebarStore';
import type { Habit } from '@/lib/types';

function HabitsPage() {
  const { habits, loading, error, addHabit, updateHabit, deleteHabit, refetch } = useHabits();
  const { logsByHabit } = useAllHabitLogs();
  const accentColor = useThemeStore((state) => state.accentColor);
  const { isCollapsed } = useSidebarStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [completionStatus, setCompletionStatus] = useState<Record<string, boolean>>({});
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  // Desktop layout classes
  const desktopPageClasses = `hidden lg:flex fixed inset-0 ${isCollapsed ? 'lg:left-20' : 'lg:left-64'} transition-all duration-300`;

  // Handle completion status changes from HabitCards
  const handleCompletionChange = useCallback((habitId: string, isCompleted: boolean) => {
    setCompletionStatus((prev) => {
      if (prev[habitId] === isCompleted) return prev;
      return { ...prev, [habitId]: isCompleted };
    });
  }, []);

  // Extract unique habit types from all habits
  const habitTypes = useMemo(() => {
    const types = new Set<string>();
    habits.forEach((habit) => {
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
    return habits.filter((habit) => habit.habit_type === selectedFilter);
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

  const handleAddClick = useCallback(() => {
    setEditingHabit(null);
    setIsModalOpen(true);
  }, []);

  const handleEditClick = useCallback((habit: Habit) => {
    setEditingHabit(habit);
    setIsModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback(
    async (habit: Habit) => {
      if (
        window.confirm(
          `Are you sure you want to delete "${habit.name}"? This will also delete all completion history. This action cannot be undone.`
        )
      ) {
        await deleteHabit(habit.id);
      }
    },
    [deleteHabit]
  );

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setEditingHabit(null);
  }, []);

  const handleSave = useCallback(
    async (name: string, color: string, description?: string, habitType?: string) => {
      return await addHabit(name, color, description, 'check', 7, habitType);
    },
    [addHabit]
  );

  const handleUpdate = useCallback(
    async (
      id: string,
      updates: { name: string; color: string; description?: string; habitType?: string }
    ) => {
      return await updateHabit(id, {
        name: updates.name,
        color: updates.color,
        description: updates.description,
        habit_type: updates.habitType,
      });
    },
    [updateHabit]
  );

  const handleFilterChange = useCallback((filter: string | null) => {
    setSelectedFilter(filter);
  }, []);

  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Habits</h1>
          <Button size="sm" onClick={handleAddClick} className="gap-2">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {/* Filter Tags */}
        {habitTypes.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            <button
              onClick={() => handleFilterChange(null)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0
                ${selectedFilter === null
                  ? 'text-white'
                  : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700'
                }
              `}
              style={selectedFilter === null ? { backgroundColor: accentColor } : undefined}
            >
              All ({habits.length})
            </button>
            {habitTypes.map((type) => {
              const count = habits.filter((h) => h.habit_type === type).length;
              return (
                <button
                  key={type}
                  onClick={() => handleFilterChange(type)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0
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
      </div>

      {/* Desktop View */}
      <div className={desktopPageClasses}>
        {/* Left Panel - Filters */}
        <div className="w-64 flex-shrink-0 h-full border-r border-secondary-200 dark:border-secondary-800 bg-white dark:bg-secondary-900 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="h-[60px] flex items-center justify-between px-4 border-b border-secondary-200 dark:border-secondary-800 flex-shrink-0">
            <h1 className="text-xl font-bold text-secondary-900 dark:text-white">Habits</h1>
            <Button size="sm" onClick={handleAddClick} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {/* Filter List */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-1">
              <button
                onClick={() => handleFilterChange(null)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedFilter === null
                  ? 'text-white'
                  : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800'
                  }`}
                style={selectedFilter === null ? { backgroundColor: accentColor } : undefined}
              >
                <Grid className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 text-left">All Habits</span>
                <span className="text-xs opacity-70">{habits.length}</span>
              </button>

              {habitTypes.length > 0 && (
                <>
                  <div className="pt-3 pb-1 px-3">
                    <span className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">Categories</span>
                  </div>
                  {habitTypes.map((type) => {
                    const count = habits.filter((h) => h.habit_type === type).length;
                    return (
                      <button
                        key={type}
                        onClick={() => handleFilterChange(type)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedFilter === type
                          ? 'text-white'
                          : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800'
                          }`}
                        style={selectedFilter === type ? { backgroundColor: accentColor } : undefined}
                      >
                        <Tag className="h-4 w-4 flex-shrink-0" />
                        <span className="flex-1 text-left">{type}</span>
                        <span className="text-xs opacity-70">{count}</span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Content */}
        <div className="flex-1 flex flex-col overflow-hidden bg-light-bg dark:bg-secondary-900">
          {/* Header */}
          <div className="h-[60px] flex items-center px-6 border-b border-secondary-200 dark:border-secondary-800 bg-white dark:bg-secondary-900 flex-shrink-0">
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
              {selectedFilter || 'All Habits'}
            </h2>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <HabitList
              habits={sortedHabits}
              loading={loading}
              error={error}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              onRetry={refetch}
              onAddClick={handleAddClick}
              onCompletionChange={handleCompletionChange}
              logsByHabit={logsByHabit}
            />
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AddHabitModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSave}
        editingHabit={editingHabit}
        onUpdate={handleUpdate}
        existingTypes={habitTypes}
        defaultType={selectedFilter}
      />
    </>
  );
}

export default HabitsPage;
