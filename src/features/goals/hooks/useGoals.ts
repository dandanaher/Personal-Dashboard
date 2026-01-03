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

interface UseGoalsOptions {
  onlyActive?: boolean;
  limit?: number;
}

export function useGoals(filterType?: FilterType, options: UseGoalsOptions = {}): UseGoalsReturn {
  const { onlyActive = false, limit } = options;
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [habitData, setHabitData] = useState<Map<string, HabitCompletionData>>(new Map());
  const { user } = useAuthStore();

  function goalMatchesFilters(goal: Goal) {
    if (onlyActive && goal.completed) return false;
    if (filterType && filterType !== 'all' && goal.type !== filterType) return false;
    return true;
  }

  const sortGoals = useCallback((goalsToSort: Goal[]) => {
    return [...goalsToSort].sort((a, b) => {
      if (!a.target_date && b.target_date) return 1;
      if (a.target_date && !b.target_date) return -1;
      if (a.target_date && b.target_date && a.target_date !== b.target_date) {
        return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, []);

  // Track goals currently being toggled to prevent double-toggling
  const togglingRef = useRef<Set<string>>(new Set());

  // Debounce timers for progress updates
  const progressDebounceRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingProgressRef = useRef<Map<string, { progress: number; completed: boolean }>>(
    new Map()
  );

  const fetchHabitDataForIds = useCallback(
    async (linkedHabitIds: string[]) => {
      if (!user || linkedHabitIds.length === 0) {
        return new Map<string, HabitCompletionData>();
      }

      // Fetch habit names
      const { data: habits } = await supabase
        .from('habits')
        .select('id, name')
        .eq('user_id', user.id)
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
      logs?.forEach((log: { habit_id: string }) => {
        const current = completionCounts.get(log.habit_id) || 0;
        completionCounts.set(log.habit_id, current + 1);
      });

      // Build habit data map
      const newHabitData = new Map<string, HabitCompletionData>();
      habits?.forEach((habit: { id: string; name: string }) => {
        newHabitData.set(habit.id, {
          habitId: habit.id,
          habitName: habit.name,
          completions: completionCounts.get(habit.id) || 0,
        });
      });

      return newHabitData;
    },
    [user]
  );

  // Fetch habit completion counts for linked goals
  const fetchHabitData = useCallback(
    async (goalsData: Goal[]) => {
      if (!user) return;

      const linkedHabitIds = [
        ...new Set(goalsData.filter((g) => g.linked_habit_id).map((g) => g.linked_habit_id!)),
      ];

      if (linkedHabitIds.length === 0) {
        setHabitData(new Map());
        return;
      }

      try {
        const newHabitData = await fetchHabitDataForIds(linkedHabitIds);
        setHabitData(newHabitData);
      } catch (err) {
        console.error('Failed to fetch habit data:', err);
      }
    },
    [user, fetchHabitDataForIds]
  );

  const syncHabitDataForGoals = useCallback(
    async (goalsData: Goal[]) => {
      const linkedHabitIds = [
        ...new Set(goalsData.filter((g) => g.linked_habit_id).map((g) => g.linked_habit_id!)),
      ];

      if (linkedHabitIds.length === 0) {
        if (habitData.size > 0) setHabitData(new Map());
        return;
      }

      const missingIds = linkedHabitIds.filter((id) => !habitData.has(id));
      const removedIds = Array.from(habitData.keys()).filter(
        (id) => !linkedHabitIds.includes(id)
      );

      if (removedIds.length > 0) {
        setHabitData((prev) => {
          const next = new Map(prev);
          removedIds.forEach((id) => next.delete(id));
          return next;
        });
      }

      if (missingIds.length > 0) {
        try {
          const newHabitData = await fetchHabitDataForIds(missingIds);
          setHabitData((prev) => {
            const next = new Map(prev);
            newHabitData.forEach((value, key) => {
              next.set(key, value);
            });
            return next;
          });
        } catch (err) {
          console.error('Failed to fetch habit data:', err);
        }
      }
    },
    [fetchHabitDataForIds, habitData]
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

      if (onlyActive) {
        query = query.eq('completed', false);
      }

      if (filterType && filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      const goalsData = sortGoals((data as Goal[]) || []);
      setGoals(goalsData);

      // Fetch habit data for linked goals
      await fetchHabitData(goalsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch goals');
    } finally {
      setLoading(false);
    }
  }, [user, filterType, fetchHabitData, onlyActive, limit, sortGoals]);

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

        const newGoal = data as Goal;
        let didUpdate = false;
        let nextGoalsSnapshot: Goal[] = [];
        setGoals((prev) => {
          if (!goalMatchesFilters(newGoal)) return prev;
          const sorted = sortGoals([...prev, newGoal]);
          const limited = limit ? sorted.slice(0, limit) : sorted;
          nextGoalsSnapshot = limited;
          didUpdate = true;
          return limited;
        });

        if (didUpdate) {
          void syncHabitDataForGoals(nextGoalsSnapshot);
        }

        return newGoal;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add goal');
        return null;
      }
    },
    [user, filterType, onlyActive, limit, sortGoals, syncHabitDataForGoals]
  );

  // Update goal with optimistic update
  const updateGoal = useCallback(
    async (id: string, updates: Partial<Goal>): Promise<boolean> => {
      // Store previous state for rollback
      const previousGoals = [...goals];

      // Optimistic update
      let didUpdate = false;
      let nextGoalsSnapshot: Goal[] = [];
      setGoals((prev) => {
        const updated = prev.map((g) =>
          g.id === id ? { ...g, ...updates, updated_at: new Date().toISOString() } : g
        );
        const filtered = updated.filter(goalMatchesFilters);
        const sorted = sortGoals(filtered);
        const limited = limit ? sorted.slice(0, limit) : sorted;
        nextGoalsSnapshot = limited;
        didUpdate = true;
        return limited;
      });

      try {
        const { error: updateError } = await supabase.from('goals').update(updates).eq('id', id);

        if (updateError) {
          // Rollback on error
          setGoals(previousGoals);
          setError(updateError.message);
          return false;
        }

        if (didUpdate) {
          void syncHabitDataForGoals(nextGoalsSnapshot);
          if (limit && nextGoalsSnapshot.length < limit) {
            void fetchGoals();
          }
        }

        return true;
      } catch (err) {
        // Rollback on error
        setGoals(previousGoals);
        setError(err instanceof Error ? err.message : 'Failed to update goal');
        return false;
      }
    },
    [goals, filterType, onlyActive, limit, sortGoals, syncHabitDataForGoals, fetchGoals]
  );

  // Update progress (quick action) with debouncing for database updates
  const updateProgress = useCallback((id: string, progress: number): Promise<boolean> => {
    const clampedProgress = Math.min(100, Math.max(0, progress));
    const completed = clampedProgress >= 100;

    // Optimistic update immediately for responsive UI
    setGoals((prev) => {
      const updated = prev.map((g) =>
        g.id === id
          ? { ...g, progress: clampedProgress, completed, updated_at: new Date().toISOString() }
          : g
      );
      const filtered = updated.filter(goalMatchesFilters);
      const sorted = sortGoals(filtered);
      return limit ? sorted.slice(0, limit) : sorted;
    });

    // Store pending update
    pendingProgressRef.current.set(id, { progress: clampedProgress, completed });

    // Clear existing debounce timer for this goal
    const existingTimer = progressDebounceRef.current.get(id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer to save to database
    const timer = setTimeout(() => {
      const pending = pendingProgressRef.current.get(id);
      if (!pending) return;

      progressDebounceRef.current.delete(id);
      pendingProgressRef.current.delete(id);

      void supabase
        .from('goals')
        .update({ progress: pending.progress, completed: pending.completed })
        .eq('id', id)
        .then(({ error: updateError }) => {
          if (updateError) {
            setError(updateError.message);
          }
        });
    }, 300); // Debounce for 300ms

    progressDebounceRef.current.set(id, timer);
    return Promise.resolve(true);
  }, [filterType, onlyActive, limit, sortGoals]);

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
      let didUpdate = false;
      let nextGoalsSnapshot: Goal[] = [];
      setGoals((prev) => {
        const updated = prev.filter((g) => g.id !== id);
        const sorted = sortGoals(updated);
        const limited = limit ? sorted.slice(0, limit) : sorted;
        nextGoalsSnapshot = limited;
        didUpdate = true;
        return limited;
      });

      try {
        const { error: deleteError } = await supabase.from('goals').delete().eq('id', id);

        if (deleteError) {
          // Rollback on error
          setGoals(previousGoals);
          setError(deleteError.message);
          return false;
        }

        if (didUpdate) {
          void syncHabitDataForGoals(nextGoalsSnapshot);
          if (limit && nextGoalsSnapshot.length < limit) {
            void fetchGoals();
          }
        }

        return true;
      } catch (err) {
        // Rollback on error
        setGoals(previousGoals);
        setError(err instanceof Error ? err.message : 'Failed to delete goal');
        return false;
      }
    },
    [goals, limit, sortGoals, syncHabitDataForGoals, fetchGoals]
  );

  // Initial fetch
  useEffect(() => {
    void fetchGoals();
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
        (payload) => {
          let didUpdate = false;
          let nextGoalsSnapshot: Goal[] = [];

            if (payload.eventType === 'INSERT') {
              const newGoal = payload.new as Goal;
              if (!goalMatchesFilters(newGoal)) return;
              setGoals((prev) => {
                if (prev.some((g) => g.id === newGoal.id)) return prev;
                const sorted = sortGoals([...prev, newGoal]);
                const limited = limit ? sorted.slice(0, limit) : sorted;
                nextGoalsSnapshot = limited;
                didUpdate = true;
                return limited;
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedGoal = payload.new as Goal;
              setGoals((prev) => {
                const exists = prev.some((g) => g.id === updatedGoal.id);
                if (!goalMatchesFilters(updatedGoal)) {
                  const filtered = prev.filter((g) => g.id !== updatedGoal.id);
                  const sorted = sortGoals(filtered);
                  const limited = limit ? sorted.slice(0, limit) : sorted;
                  nextGoalsSnapshot = limited;
                  didUpdate = true;
                  return limited;
                }
                const merged = exists
                  ? prev.map((g) => (g.id === updatedGoal.id ? updatedGoal : g))
                  : [...prev, updatedGoal];
                const sorted = sortGoals(merged);
                const limited = limit ? sorted.slice(0, limit) : sorted;
                nextGoalsSnapshot = limited;
                didUpdate = true;
                return limited;
              });
            } else if (payload.eventType === 'DELETE') {
              const deletedId = (payload.old as { id: string }).id;
              setGoals((prev) => {
                const updated = prev.filter((g) => g.id !== deletedId);
                const sorted = sortGoals(updated);
                const limited = limit ? sorted.slice(0, limit) : sorted;
                nextGoalsSnapshot = limited;
                didUpdate = true;
                return limited;
              });
            }

          if (didUpdate) {
            void syncHabitDataForGoals(nextGoalsSnapshot);
            if (limit && nextGoalsSnapshot.length < limit) {
              void fetchGoals();
            }
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, fetchGoals, filterType, onlyActive, limit, sortGoals, syncHabitDataForGoals]);

  // Real-time subscription for habit_logs (to update linked goal progress)
  useEffect(() => {
    if (!user) return;

    // Only subscribe if we have linked goals
    const linkedHabitIds = Array.from(habitData.keys());
    if (linkedHabitIds.length === 0) return;

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
        (payload) => {
          const habitId =
            (payload.new as { habit_id?: string })?.habit_id ||
            (payload.old as { habit_id?: string })?.habit_id;
          if (!habitId || !linkedHabitIds.includes(habitId)) return;

          void fetchHabitDataForIds([habitId]).then((updated) => {
            const next = updated.get(habitId);
            if (!next) return;
            setHabitData((prev) => {
              const nextMap = new Map(prev);
              nextMap.set(habitId, next);
              return nextMap;
            });
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, habitData, fetchHabitDataForIds]);

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
