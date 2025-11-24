import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Goal } from '@/lib/types';
import { useAuthStore } from '@/stores/authStore';
import { incrementXP } from '@/features/gamification/hooks/useProfileStats';
import { XP_REWARDS } from '@/features/gamification/utils';

export type GoalType = Goal['type'];
export type FilterType = 'all' | GoalType;

interface HabitCompletionData {
  habitId: string;
  habitName: string;
  completions: number;
}

interface UseGoalsReturn {
  goals: Goal[];
  loading: boolean;
  error: string | null;
  habitData: Map<string, HabitCompletionData>;
  addGoal: (goalData: {
    title: string;
    description?: string | null;
    type: GoalType;
    target_date?: string | null;
    progress?: number;
    linked_habit_id?: string | null;
    target_completions?: number | null;
  }) => Promise<Goal | null>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<boolean>;
  updateProgress: (id: string, progress: number) => Promise<boolean>;
  toggleComplete: (id: string) => Promise<boolean>;
  deleteGoal: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useGoals(filterType?: FilterType): UseGoalsReturn {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [habitData, setHabitData] = useState<Map<string, HabitCompletionData>>(new Map());
  const { user } = useAuthStore();

  // Track goals currently being toggled to prevent double-toggling
  const togglingRef = useRef<Set<string>>(new Set());

  // Debounce timers for progress updates
  const progressDebounceRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingProgressRef = useRef<Map<string, { progress: number; completed: boolean }>>(
    new Map()
  );

  // Fetch habit completion counts for linked goals
  const fetchHabitData = useCallback(
    async (goalsData: Goal[]) => {
      if (!user) return;

      // Get unique habit IDs from goals
      const linkedHabitIds = [
        ...new Set(goalsData.filter((g) => g.linked_habit_id).map((g) => g.linked_habit_id!)),
      ];

      if (linkedHabitIds.length === 0) {
        setHabitData(new Map());
        return;
      }

      try {
        // Fetch habit names
        const { data: habits } = await supabase
          .from('habits')
          .select('id, name')
          .in('id', linkedHabitIds);

        // Fetch completion counts for each habit
        const { data: logs } = await supabase
          .from('habit_logs')
          .select('habit_id')
          .eq('user_id', user.id)
          .eq('completed', true)
          .in('habit_id', linkedHabitIds);

        // Count completions per habit
        const completionCounts = new Map<string, number>();
        logs?.forEach((log) => {
          const current = completionCounts.get(log.habit_id) || 0;
          completionCounts.set(log.habit_id, current + 1);
        });

        // Build habit data map
        const newHabitData = new Map<string, HabitCompletionData>();
        habits?.forEach((habit) => {
          newHabitData.set(habit.id, {
            habitId: habit.id,
            habitName: habit.name,
            completions: completionCounts.get(habit.id) || 0,
          });
        });

        setHabitData(newHabitData);
      } catch (err) {
        console.error('Failed to fetch habit data:', err);
      }
    },
    [user]
  );

  // Fetch goals with optional filter
  const fetchGoals = useCallback(async () => {
    if (!user) {
      setGoals([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      let query = supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('target_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (filterType && filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      const goalsData = data || [];
      setGoals(goalsData);

      // Fetch habit data for linked goals
      await fetchHabitData(goalsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch goals');
    } finally {
      setLoading(false);
    }
  }, [user, filterType, fetchHabitData]);

  // Add goal with optimistic update
  const addGoal = useCallback(
    async (goalData: {
      title: string;
      description?: string | null;
      type: GoalType;
      target_date?: string | null;
      progress?: number;
      linked_habit_id?: string | null;
      target_completions?: number | null;
    }): Promise<Goal | null> => {
      if (!user) return null;

      try {
        const { data, error: insertError } = await supabase
          .from('goals')
          .insert({
            user_id: user.id,
            title: goalData.title,
            description: goalData.description || null,
            type: goalData.type,
            target_date: goalData.target_date || null,
            progress: goalData.progress || 0,
            completed: false,
            linked_habit_id: goalData.linked_habit_id || null,
            target_completions: goalData.target_completions || null,
          })
          .select()
          .single();

        if (insertError) {
          setError(insertError.message);
          return null;
        }

        setGoals((prev) => {
          const newGoals = [data, ...prev];
          // Re-sort by target date
          return newGoals.sort((a, b) => {
            if (!a.target_date && !b.target_date) return 0;
            if (!a.target_date) return 1;
            if (!b.target_date) return -1;
            return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
          });
        });

        // Refetch habit data if this goal is linked
        if (data.linked_habit_id) {
          fetchHabitData([...goals, data]);
        }

        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add goal');
        return null;
      }
    },
    [user, goals, fetchHabitData]
  );

  // Update goal with optimistic update
  const updateGoal = useCallback(
    async (id: string, updates: Partial<Goal>): Promise<boolean> => {
      // Store previous state for rollback
      const previousGoals = [...goals];

      // Optimistic update
      setGoals((prev) =>
        prev.map((g) =>
          g.id === id ? { ...g, ...updates, updated_at: new Date().toISOString() } : g
        )
      );

      try {
        const { error: updateError } = await supabase.from('goals').update(updates).eq('id', id);

        if (updateError) {
          // Rollback on error
          setGoals(previousGoals);
          setError(updateError.message);
          return false;
        }

        // Refetch habit data if linked_habit_id changed
        if ('linked_habit_id' in updates) {
          const updatedGoals = goals.map((g) => (g.id === id ? { ...g, ...updates } : g));
          fetchHabitData(updatedGoals);
        }

        return true;
      } catch (err) {
        // Rollback on error
        setGoals(previousGoals);
        setError(err instanceof Error ? err.message : 'Failed to update goal');
        return false;
      }
    },
    [goals, fetchHabitData]
  );

  // Update progress (quick action) with debouncing for database updates
  const updateProgress = useCallback(async (id: string, progress: number): Promise<boolean> => {
    const clampedProgress = Math.min(100, Math.max(0, progress));
    const completed = clampedProgress >= 100;

    // Optimistic update immediately for responsive UI
    setGoals((prev) =>
      prev.map((g) =>
        g.id === id
          ? { ...g, progress: clampedProgress, completed, updated_at: new Date().toISOString() }
          : g
      )
    );

    // Store pending update
    pendingProgressRef.current.set(id, { progress: clampedProgress, completed });

    // Clear existing debounce timer for this goal
    const existingTimer = progressDebounceRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer to save to database
    const timer = setTimeout(async () => {
      const pending = pendingProgressRef.current.get(id);
      if (!pending) return;

      progressDebounceRef.current.delete(id);
      pendingProgressRef.current.delete(id);

      try {
        const { error: updateError } = await supabase
          .from('goals')
          .update({ progress: pending.progress, completed: pending.completed })
          .eq('id', id);

        if (updateError) {
          setError(updateError.message);
          // Could refetch here to get correct state, but optimistic update might be acceptable
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update progress');
      }
    }, 300); // Debounce for 300ms

    progressDebounceRef.current.set(id, timer);
    return true;
  }, []);

  // Toggle completion
  const toggleComplete = useCallback(
    async (id: string): Promise<boolean> => {
      // Prevent double-toggling
      if (togglingRef.current.has(id)) {
        return false;
      }

      const goal = goals.find((g) => g.id === id);
      if (!goal) return false;

      // Mark as toggling
      togglingRef.current.add(id);

      const newCompleted = !goal.completed;
      // When reopening, set to 99% if was at 100% to prevent immediate re-completion
      const newProgress = newCompleted ? 100 : goal.progress >= 100 ? 99 : goal.progress;

      try {
        const result = await updateGoal(id, {
          completed: newCompleted,
          progress: newProgress,
        });

        // Award XP for completing a goal (Drive)
        if (result && newCompleted && user) {
          await incrementXP(user.id, 'drive', XP_REWARDS.GOAL_COMPLETE);
        }

        return result;
      } finally {
        // Clear toggling state after a short delay to allow state to propagate
        setTimeout(() => {
          togglingRef.current.delete(id);
        }, 300);
      }
    },
    [goals, updateGoal, user]
  );

  // Delete goal with optimistic update
  const deleteGoal = useCallback(
    async (id: string): Promise<boolean> => {
      // Store previous state for rollback
      const previousGoals = [...goals];

      // Optimistic update
      setGoals((prev) => prev.filter((g) => g.id !== id));

      try {
        const { error: deleteError } = await supabase.from('goals').delete().eq('id', id);

        if (deleteError) {
          // Rollback on error
          setGoals(previousGoals);
          setError(deleteError.message);
          return false;
        }

        return true;
      } catch (err) {
        // Rollback on error
        setGoals(previousGoals);
        setError(err instanceof Error ? err.message : 'Failed to delete goal');
        return false;
      }
    },
    [goals]
  );

  // Initial fetch
  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      progressDebounceRef.current.forEach((timer) => clearTimeout(timer));
      progressDebounceRef.current.clear();
      pendingProgressRef.current.clear();
    };
  }, []);

  // Real-time subscription for goals
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`goals-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goals',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchGoals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchGoals]);

  // Real-time subscription for habit_logs (to update linked goal progress)
  useEffect(() => {
    if (!user) return;

    // Only subscribe if we have linked goals
    const hasLinkedGoals = goals.some((g) => g.linked_habit_id);
    if (!hasLinkedGoals) return;

    const channel = supabase
      .channel(`habit-logs-for-goals-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'habit_logs',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchHabitData(goals);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, goals, fetchHabitData]);

  return {
    goals,
    loading,
    error,
    habitData,
    addGoal,
    updateGoal,
    updateProgress,
    toggleComplete,
    deleteGoal,
    refetch: fetchGoals,
  };
}

export default useGoals;
