import { useState, useEffect, useCallback } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { CanvasGroup } from '@/lib/types';

interface UseCanvasGroupsReturn {
  groups: CanvasGroup[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCanvasGroups(): UseCanvasGroupsReturn {
  const [groups, setGroups] = useState<CanvasGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const fetchGroups = useCallback(async () => {
    if (!user) {
      setGroups([]);
      setLoading(false);
      return;
    }

    try {
      const {
        data,
        error: fetchError,
      }: { data: CanvasGroup[] | null; error: PostgrestError | null } = await supabase
        .from('canvas_groups')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setGroups(data ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch canvas groups');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`canvas-groups-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'canvas_groups',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void fetchGroups();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, fetchGroups]);

  return { groups, loading, error, refetch: fetchGroups };
}

export default useCanvasGroups;
