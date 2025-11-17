import { useState, useEffect, useCallback } from 'react';
import supabase from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Habit } from '@/lib/types';

interface UseHabitsReturn {
  habits: Habit[];
  loading: boolean;
  error: string | null;
  addHabit: (name: string, color: string, description?: string, icon?: string, targetFrequency?: number) => Promise<boolean>;
  updateHabit: (id: string, updates: Partial<Pick<Habit, 'name' | 'color' | 'description' | 'icon' | 'target_frequency'>>) => Promise<boolean>;
  deleteHabit: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useHabits(): UseHabitsReturn {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuthStore();

  const fetchHabits = useCallback(async () => {
    if (!user) {
      setHabits([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setHabits(data || []);
    } catch (err) {
      console.error('Error fetching habits:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch habits');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addHabit = useCallback(async (
    name: string,
    color: string,
    description?: string,
    icon: string = 'check',
    targetFrequency: number = 7
  ): Promise<boolean> => {
    if (!user) return false;

    // Create temporary habit for optimistic update
    const tempId = `temp-${Date.now()}`;
    const tempHabit: Habit = {
      id: tempId,
      user_id: user.id,
      name,
      description: description || null,
      color,
      icon,
      target_frequency: targetFrequency,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Optimistic update
    setHabits(prev => [...prev, tempHabit]);

    try {
      const { data, error: insertError } = await supabase
        .from('habits')
        .insert({
          user_id: user.id,
          name,
          description: description || null,
          color,
          icon,
          target_frequency: targetFrequency,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Replace temp habit with real one
      setHabits(prev => prev.map(h => h.id === tempId ? data : h));
      return true;
    } catch (err) {
      console.error('Error adding habit:', err);
      // Rollback optimistic update
      setHabits(prev => prev.filter(h => h.id !== tempId));
      setError(err instanceof Error ? err.message : 'Failed to add habit');
      return false;
    }
  }, [user]);

  const updateHabit = useCallback(async (
    id: string,
    updates: Partial<Pick<Habit, 'name' | 'color' | 'description' | 'icon' | 'target_frequency'>>
  ): Promise<boolean> => {
    if (!user) return false;

    // Store original for rollback
    const originalHabit = habits.find(h => h.id === id);
    if (!originalHabit) return false;

    // Optimistic update
    setHabits(prev => prev.map(h =>
      h.id === id
        ? { ...h, ...updates, updated_at: new Date().toISOString() }
        : h
    ));

    try {
      const { error: updateError } = await supabase
        .from('habits')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;
      return true;
    } catch (err) {
      console.error('Error updating habit:', err);
      // Rollback
      setHabits(prev => prev.map(h => h.id === id ? originalHabit : h));
      setError(err instanceof Error ? err.message : 'Failed to update habit');
      return false;
    }
  }, [user, habits]);

  const deleteHabit = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    // Store original for rollback
    const originalHabit = habits.find(h => h.id === id);
    if (!originalHabit) return false;

    // Optimistic update
    setHabits(prev => prev.filter(h => h.id !== id));

    try {
      const { error: deleteError } = await supabase
        .from('habits')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;
      return true;
    } catch (err) {
      console.error('Error deleting habit:', err);
      // Rollback
      setHabits(prev => [...prev, originalHabit].sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ));
      setError(err instanceof Error ? err.message : 'Failed to delete habit');
      return false;
    }
  }, [user, habits]);

  // Initial fetch
  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`habits-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'habits',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchHabits();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchHabits]);

  return {
    habits,
    loading,
    error,
    addHabit,
    updateHabit,
    deleteHabit,
    refetch: fetchHabits,
  };
}
