// Custom hook for fetching workout history/sessions

import { useState, useEffect, useCallback } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { WorkoutSession, WorkoutSessionUpdate } from '@/lib/types';

// =============================================================================
// Types
// =============================================================================

interface UseWorkoutSessionsReturn {
  sessions: WorkoutSession[];
  loading: boolean;
  error: string | null;
  getSession: (id: string) => Promise<WorkoutSession | null>;
  updateSession: (id: string, updates: { notes?: string | null }) => Promise<boolean>;
  deleteSession: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useWorkoutSessions(): UseWorkoutSessionsReturn {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const {
        data,
        error: fetchError,
      }: { data: WorkoutSession[] | null; error: PostgrestError | null } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      setSessions(data ?? []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('Failed to load workout history');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`workout-sessions-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workout_sessions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void fetchSessions();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, fetchSessions]);

  // Get single session
  const getSession = useCallback(
    async (id: string): Promise<WorkoutSession | null> => {
      if (!user) return null;

      // Check local cache first
      const cached = sessions.find((s) => s.id === id);
      if (cached) return cached;

      try {
        const {
          data,
          error: fetchError,
        }: { data: WorkoutSession | null; error: PostgrestError | null } = await supabase
          .from('workout_sessions')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();

        if (fetchError) throw fetchError;
        return data ?? null;
      } catch (err) {
        console.error('Error fetching session:', err);
        return null;
      }
    },
    [user, sessions]
  );

  // Update session (mainly for notes)
  const updateSession = useCallback(
    async (id: string, updates: { notes?: string | null }): Promise<boolean> => {
      if (!user) return false;

      // Store previous state for rollback
      const previousSessions = sessions;

      try {
        // Optimistic update
        setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));

        const updateData: WorkoutSessionUpdate = updates;

        const { error: updateError } = await supabase
          .from('workout_sessions')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        console.error('Error updating session:', err);
        // Rollback
        setSessions(previousSessions);
        setError('Failed to update session');
        return false;
      }
    },
    [user, sessions]
  );

  // Delete session
  const deleteSession = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) return false;

      // Store previous state for rollback
      const previousSessions = sessions;

      try {
        // Optimistic delete
        setSessions((prev) => prev.filter((s) => s.id !== id));

        const { error: deleteError } = await supabase
          .from('workout_sessions')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;
        return true;
      } catch (err) {
        console.error('Error deleting session:', err);
        // Rollback
        setSessions(previousSessions);
        setError('Failed to delete session');
        return false;
      }
    },
    [user, sessions]
  );

  return {
    sessions,
    loading,
    error,
    getSession,
    updateSession,
    deleteSession,
    refetch: fetchSessions,
  };
}
