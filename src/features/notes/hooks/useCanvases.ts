import { useState, useEffect, useCallback } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Canvas, CanvasInsert, CanvasUpdate } from '@/lib/types';

interface UseCanvasesReturn {
  canvases: Canvas[];
  loading: boolean;
  error: string | null;
  createCanvas: (name?: string, description?: string) => Promise<Canvas | null>;
  updateCanvas: (id: string, updates: CanvasUpdate) => Promise<boolean>;
  deleteCanvas: (id: string) => Promise<boolean>;
  updateLastAccessed: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useCanvases(): UseCanvasesReturn {
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const fetchCanvases = useCallback(async () => {
    if (!user) {
      setCanvases([]);
      setLoading(false);
      return;
    }

    try {
      const {
        data,
        error: fetchError,
      }: { data: Canvas[] | null; error: PostgrestError | null } = await supabase
        .from('canvases')
        .select('*')
        .eq('user_id', user.id)
        .order('last_accessed_at', { ascending: false });

      if (fetchError) throw fetchError;
      setCanvases(data ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch canvases');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createCanvas = useCallback(
    async (name = 'Untitled Canvas', description?: string): Promise<Canvas | null> => {
      if (!user) return null;

      try {
        const newCanvas: CanvasInsert = {
          user_id: user.id,
          name,
          description: description || null,
        };

        const {
          data,
          error: insertError,
        }: { data: Canvas | null; error: PostgrestError | null } = await supabase
          .from('canvases')
          .insert(newCanvas)
          .select()
          .single();

        if (insertError) throw insertError;

        if (!data) {
          throw new Error('Failed to create canvas');
        }
        const canvas = data;
        setCanvases((prev) => [canvas, ...prev]);
        return canvas;
      } catch (err) {
        console.error('Failed to create canvas:', err);
        setError(err instanceof Error ? err.message : 'Failed to create canvas');
        return null;
      }
    },
    [user]
  );

  const updateCanvas = useCallback(
    async (id: string, updates: CanvasUpdate): Promise<boolean> => {
      if (!user) return false;

      // Optimistic update
      setCanvases((prev) =>
        prev.map((canvas) =>
          canvas.id === id
            ? { ...canvas, ...updates, updated_at: new Date().toISOString() }
            : canvas
        )
      );

      try {
        const { error: updateError } = await supabase
          .from('canvases')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        console.error('Failed to update canvas:', err);
        await fetchCanvases(); // Rollback
        return false;
      }
    },
    [user, fetchCanvases]
  );

  const deleteCanvas = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) return false;

      // Optimistic update
      setCanvases((prev) => prev.filter((canvas) => canvas.id !== id));

      try {
        const { error: deleteError } = await supabase
          .from('canvases')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;
        return true;
      } catch (err) {
        console.error('Failed to delete canvas:', err);
        await fetchCanvases(); // Rollback
        return false;
      }
    },
    [user, fetchCanvases]
  );

  const updateLastAccessed = useCallback(
    async (id: string): Promise<void> => {
      if (!user) return;

      const now = new Date().toISOString();

      // Optimistic update
      setCanvases((prev) =>
        prev.map((canvas) =>
          canvas.id === id ? { ...canvas, last_accessed_at: now } : canvas
        )
      );

      try {
        await supabase
          .from('canvases')
          .update({ last_accessed_at: now })
          .eq('id', id)
          .eq('user_id', user.id);
      } catch (err) {
        console.error('Failed to update last accessed:', err);
      }
    },
    [user]
  );

  useEffect(() => {
    void fetchCanvases();
  }, [fetchCanvases]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`canvases-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'canvases',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void fetchCanvases();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, fetchCanvases]);

  return {
    canvases,
    loading,
    error,
    createCanvas,
    updateCanvas,
    deleteCanvas,
    updateLastAccessed,
    refetch: fetchCanvases,
  };
}

export default useCanvases;
