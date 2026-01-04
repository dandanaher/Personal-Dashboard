import { useState, useEffect, useCallback } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Folder, FolderInsert, FolderUpdate } from '@/lib/types';

interface UseFoldersReturn {
  folders: Folder[];
  loading: boolean;
  error: string | null;
  createFolder: (name?: string, parentId?: string | null) => Promise<Folder | null>;
  updateFolder: (id: string, updates: FolderUpdate) => Promise<boolean>;
  deleteFolder: (id: string) => Promise<boolean>;
  getFolderPath: (folderId: string) => Folder[];
  refetch: () => Promise<void>;
}

export function useFolders(): UseFoldersReturn {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const fetchFolders = useCallback(async () => {
    if (!user) {
      setFolders([]);
      setLoading(false);
      return;
    }

    try {
      const {
        data,
        error: fetchError,
      }: { data: Folder[] | null; error: PostgrestError | null } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setFolders(data ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch folders');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createFolder = useCallback(
    async (name = 'New Folder', parentId: string | null = null): Promise<Folder | null> => {
      if (!user) return null;

      try {
        const newFolder: FolderInsert = {
          user_id: user.id,
          name,
          parent_id: parentId,
        };

        const {
          data,
          error: insertError,
        }: { data: Folder | null; error: PostgrestError | null } = await supabase
          .from('folders')
          .insert(newFolder)
          .select()
          .single();

        if (insertError) throw insertError;

        if (!data) {
          throw new Error('Failed to create folder');
        }
        const folder = data;
        setFolders((prev) => [...prev, folder].sort((a, b) => a.name.localeCompare(b.name)));
        return folder;
      } catch (err) {
        console.error('Failed to create folder:', err);
        setError(err instanceof Error ? err.message : 'Failed to create folder');
        return null;
      }
    },
    [user]
  );

  const updateFolder = useCallback(
    async (id: string, updates: FolderUpdate): Promise<boolean> => {
      if (!user) return false;

      // Optimistic update
      setFolders((prev) =>
        prev.map((folder) => (folder.id === id ? { ...folder, ...updates } : folder))
      );

      try {
        const { error: updateError } = await supabase
          .from('folders')
          .update(updates)
          .eq('id', id)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        console.error('Failed to update folder:', err);
        await fetchFolders(); // Rollback
        return false;
      }
    },
    [user, fetchFolders]
  );

  const deleteFolder = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) return false;

      // Optimistic update
      setFolders((prev) => prev.filter((folder) => folder.id !== id));

      try {
        const { error: deleteError } = await supabase
          .from('folders')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;
        return true;
      } catch (err) {
        console.error('Failed to delete folder:', err);
        await fetchFolders(); // Rollback
        return false;
      }
    },
    [user, fetchFolders]
  );

  // Get the folder hierarchy path from root to the specified folder
  const getFolderPath = useCallback(
    (folderId: string): Folder[] => {
      const path: Folder[] = [];
      let current = folders.find((f) => f.id === folderId);

      while (current) {
        path.unshift(current);
        const parentId = current.parent_id;
        current = parentId ? folders.find((f) => f.id === parentId) : undefined;
      }

      return path;
    },
    [folders]
  );

  useEffect(() => {
    void fetchFolders();
  }, [fetchFolders]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`folders-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'folders',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void fetchFolders();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, fetchFolders]);

  return {
    folders,
    loading,
    error,
    createFolder,
    updateFolder,
    deleteFolder,
    getFolderPath,
    refetch: fetchFolders,
  };
}

export default useFolders;
