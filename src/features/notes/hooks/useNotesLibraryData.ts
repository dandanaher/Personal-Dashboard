import { useState, useEffect, useCallback } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Canvas, Folder, CanvasGroup, Note } from '@/lib/types';

interface UseNotesLibraryDataReturn {
    notes: Note[];
    canvases: Canvas[];
    folders: Folder[];
    groups: CanvasGroup[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    // CRUD operations
    createCanvas: (name?: string, description?: string) => Promise<Canvas | null>;
    updateCanvas: (id: string, updates: Partial<Canvas>) => Promise<boolean>;
    deleteCanvas: (id: string) => Promise<boolean>;
    createFolder: (name?: string, parentId?: string | null) => Promise<Folder | null>;
    updateFolder: (id: string, updates: Partial<Folder>) => Promise<boolean>;
    deleteFolder: (id: string) => Promise<boolean>;
}

/**
 * Combined hook that fetches all notes library data in parallel
 * This improves performance by eliminating the waterfall of sequential fetches
 */
export function useNotesLibraryData(): UseNotesLibraryDataReturn {
    const [notes, setNotes] = useState<Note[]>([]);
    const [canvases, setCanvases] = useState<Canvas[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [groups, setGroups] = useState<CanvasGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuthStore();

    const fetchAll = useCallback(async () => {
        if (!user) {
            setNotes([]);
            setCanvases([]);
            setFolders([]);
            setGroups([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Fetch all data in parallel
            const [notesResult, canvasesResult, foldersResult, groupsResult] = await Promise.all([
                supabase
                    .from('notes')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('updated_at', { ascending: false }),
                supabase
                    .from('canvases')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('last_accessed_at', { ascending: false }),
                supabase
                    .from('folders')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('name', { ascending: true }),
                supabase
                    .from('canvas_groups')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: true }),
            ]);

            if (notesResult.error) throw notesResult.error;
            if (canvasesResult.error) throw canvasesResult.error;
            if (foldersResult.error) throw foldersResult.error;
            if (groupsResult.error) throw groupsResult.error;

            setNotes((notesResult.data as Note[]) ?? []);
            setCanvases((canvasesResult.data as Canvas[]) ?? []);
            setFolders((foldersResult.data as Folder[]) ?? []);
            setGroups((groupsResult.data as CanvasGroup[]) ?? []);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch library data');
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Canvas CRUD operations
    const createCanvas = useCallback(
        async (name = 'Untitled Canvas', description?: string): Promise<Canvas | null> => {
            if (!user) return null;

            try {
                const {
                    data,
                    error: insertError,
                }: { data: Canvas | null; error: PostgrestError | null } = await supabase
                    .from('canvases')
                    .insert({
                        user_id: user.id,
                        name,
                        description: description || null,
                    })
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
                return null;
            }
        },
        [user]
    );

    const updateCanvas = useCallback(
        async (id: string, updates: Partial<Canvas>): Promise<boolean> => {
            if (!user) return false;

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
                await fetchAll();
                return false;
            }
        },
        [user, fetchAll]
    );

    const deleteCanvas = useCallback(
        async (id: string): Promise<boolean> => {
            if (!user) return false;

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
                await fetchAll();
                return false;
            }
        },
        [user, fetchAll]
    );

    // Folder CRUD operations
    const createFolder = useCallback(
        async (name = 'New Folder', parentId: string | null = null): Promise<Folder | null> => {
            if (!user) return null;

            try {
                const {
                    data,
                    error: insertError,
                }: { data: Folder | null; error: PostgrestError | null } = await supabase
                    .from('folders')
                    .insert({
                        user_id: user.id,
                        name,
                        parent_id: parentId,
                    })
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
                return null;
            }
        },
        [user]
    );

    const updateFolder = useCallback(
        async (id: string, updates: Partial<Folder>): Promise<boolean> => {
            if (!user) return false;

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
                await fetchAll();
                return false;
            }
        },
        [user, fetchAll]
    );

    const deleteFolder = useCallback(
        async (id: string): Promise<boolean> => {
            if (!user) return false;

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
                await fetchAll();
                return false;
            }
        },
        [user, fetchAll]
    );

    useEffect(() => {
        void fetchAll();
    }, [fetchAll]);

    // Real-time subscriptions for all tables
    useEffect(() => {
        if (!user) return;

        const channels = [
            supabase
                .channel(`notes-library-${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'notes',
                        filter: `user_id=eq.${user.id}`,
                    },
                    () => void fetchAll()
                )
                .subscribe(),
            supabase
                .channel(`canvases-library-${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'canvases',
                        filter: `user_id=eq.${user.id}`,
                    },
                    () => void fetchAll()
                )
                .subscribe(),
            supabase
                .channel(`folders-library-${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'folders',
                        filter: `user_id=eq.${user.id}`,
                    },
                    () => void fetchAll()
                )
                .subscribe(),
            supabase
                .channel(`groups-library-${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'canvas_groups',
                        filter: `user_id=eq.${user.id}`,
                    },
                    () => void fetchAll()
                )
                .subscribe(),
        ];

        return () => {
            channels.forEach((channel) => void supabase.removeChannel(channel));
        };
    }, [user, fetchAll]);

    return {
        notes,
        canvases,
        folders,
        groups,
        loading,
        error,
        refetch: fetchAll,
        createCanvas,
        updateCanvas,
        deleteCanvas,
        createFolder,
        updateFolder,
        deleteFolder,
    };
}

export default useNotesLibraryData;
