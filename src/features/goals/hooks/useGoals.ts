import { useState, useEffect, useCallback, useRef } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Goal } from '@/lib/types';
import { useAuthStore } from '@/stores/authStore';

export type GoalType = Goal['type'];
export type FilterType = 'all' | GoalType;

interface HabitCompletionData {
  habitId: string;
  habitName: string;
  completions: number;
}

type SupabaseResult<T> = { data: T | null; error: PostgrestError | null };

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
  deferHabitData?: boolean;
  includeHabitData?: boolean;
}

export function useGoals(filterType?: FilterType, options: UseGoalsOptions = {}): UseGoalsReturn {
  const { onlyActive = false, limit, deferHabitData = false, includeHabitData = true } = options;
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [habitData, setHabitData] = useState<Map<string, HabitCompletionData>>(new Map());
  const { user } = useAuthStore();

  const goalMatchesFilters = useCallback(
    (goal: Goal) => {
      if (onlyActive && goal.completed) return false;
      if (filterType && filterType !== 'all' && goal.type !== filterType) return false;
      return true;
    },
    [filterType, onlyActive]
  );

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
      const { data: habits, error: habitsError } = (await supabase
        .from('habits')
        .select('id, name')
        .eq('user_id', user.id)
        .in('id', linkedHabitIds)) as SupabaseResult<Array<{ id: string; name: string }>>;

      if (habitsError) throw habitsError;

      // Fetch completion counts for each habit
      const { data: logs, error: logsError } = (await supabase
        .from('habit_logs')
        .select('habit_id')
        .eq('user_id', user.id)
        .eq('completed', true)
        .in('habit_id', linkedHabitIds)) as SupabaseResult<Array<{ habit_id: string }>>;

      if (logsError) throw logsError;

      // Count completions per habit
      const completionCounts = new Map<string, number>();
      (logs || []).forEach((log) => {
        const current = completionCounts.get(log.habit_id) || 0;
        completionCounts.set(log.habit_id, current + 1);
      });

      // Build habit data map
      const newHabitData = new Map<string, HabitCompletionData>();
      (habits || []).forEach((habit) => {
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

      if (!includeHabitData) {
        return;
      }

      const linkedHabitIds = Array.from(
        new Set(
          goalsData.flatMap((goal) => (goal.linked_habit_id ? [goal.linked_habit_id] : []))
        )
      );

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
    [user, fetchHabitDataForIds, includeHabitData]
  );

  const syncHabitDataForGoals = useCallback(
    async (goalsData: Goal[]) => {
      if (!includeHabitData) return;

      const linkedHabitIds = Array.from(
        new Set(
          goalsData.flatMap((goal) => (goal.linked_habit_id ? [goal.linked_habit_id] : []))
        )
      );

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
    [fetchHabitDataForIds, habitData, includeHabitData]
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

      const { data, error: fetchError } = (await query) as SupabaseResult<Goal[]>;

      if (fetchError) {
        setError(fetchError.message);
        return;
      }

      const goalsData = sortGoals(data || []);
      setGoals(goalsData);

      // Fetch habit data for linked goals
      if (includeHabitData) {
        if (deferHabitData) {
          void fetchHabitData(goalsData);
        } else {
          await fetchHabitData(goalsData);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch goals');
    } finally {
      setLoading(false);
    }
  }, [
    user,
    filterType,
    fetchHabitData,
    onlyActive,
    limit,
    sortGoals,
    deferHabitData,
    includeHabitData,
  ]);

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
        const { data, error: insertError } = (await supabase
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
          .single()) as SupabaseResult<Goal>;

        if (insertError) {
          setError(insertError.message);
          return null;
        }

        if (!data) {
          setError('Failed to add goal');
          return null;
        }

        const newGoal = data;
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

        if (didUpdate && includeHabitData) {
          void syncHabitDataForGoals(nextGoalsSnapshot);
        }

        return newGoal;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add goal');
        return null;
      }
    },
    [user, limit, sortGoals, syncHabitDataForGoals, goalMatchesFilters]
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
        const { error: updateError } = (await supabase
          .from('goals')
          .update(updates)
          .eq('id', id)) as SupabaseResult<Goal[]>;

        if (updateError) {
          // Rollback on error
          setGoals(previousGoals);
          setError(updateError.message);
          return false;
        }

        if (didUpdate) {
          if (includeHabitData) {
            void syncHabitDataForGoals(nextGoalsSnapshot);
          }
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
    [goals, limit, sortGoals, syncHabitDataForGoals, fetchGoals, goalMatchesFilters]
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
  }, [goalMatchesFilters, limit, sortGoals]);

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

        return result;
      } finally {
        // Clear toggling state after a short delay to allow state to propagate
        setTimeout(() => {
          togglingRef.current.delete(id);
        }, 300);
      }
    },
    [goals, updateGoal]
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
        const { error: deleteError } = (await supabase
          .from('goals')
          .delete()
          .eq('id', id)) as SupabaseResult<Goal[]>;

        if (deleteError) {
          // Rollback on error
          setGoals(previousGoals);
          setError(deleteError.message);
          return false;
        }

        if (didUpdate) {
          if (includeHabitData) {
            void syncHabitDataForGoals(nextGoalsSnapshot);
          }
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
    const progressTimers = progressDebounceRef.current;
    const pendingProgress = pendingProgressRef.current;
    return () => {
      progressTimers.forEach((timer) => clearTimeout(timer));
      progressTimers.clear();
      pendingProgress.clear();
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
            if (includeHabitData) {
              void syncHabitDataForGoals(nextGoalsSnapshot);
            }
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
  }, [user, fetchGoals, limit, sortGoals, syncHabitDataForGoals, goalMatchesFilters]);

  // Real-time subscription for habit_logs (to update linked goal progress)
  useEffect(() => {
    if (!user || !includeHabitData) return;

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
  }, [user, habitData, fetchHabitDataForIds, includeHabitData]);

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
