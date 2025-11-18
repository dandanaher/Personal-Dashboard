// Custom hook for workout template CRUD operations

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { WorkoutTemplate, WorkoutTemplateInsert, WorkoutTemplateUpdate, Exercise } from '@/lib/types';

// =============================================================================
// Types
// =============================================================================

interface UseWorkoutTemplatesReturn {
  templates: WorkoutTemplate[];
  loading: boolean;
  error: string | null;
  createTemplate: (name: string, description: string | null, exercises: Exercise[]) => Promise<WorkoutTemplate | null>;
  updateTemplate: (id: string, updates: Partial<{ name: string; description: string | null; exercises: Exercise[] }>) => Promise<boolean>;
  deleteTemplate: (id: string) => Promise<boolean>;
  duplicateTemplate: (id: string, newName: string) => Promise<WorkoutTemplate | null>;
  refetch: () => Promise<void>;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useWorkoutTemplates(): UseWorkoutTemplatesReturn {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    if (!user) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;
      setTemplates(data || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load workout templates');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`workout-templates-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workout_templates',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchTemplates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchTemplates]);

  // Create template
  const createTemplate = useCallback(
    async (
      name: string,
      description: string | null,
      exercises: Exercise[]
    ): Promise<WorkoutTemplate | null> => {
      if (!user) return null;

      try {
        const templateData: WorkoutTemplateInsert = {
          user_id: user.id,
          name,
          description,
          exercises,
        };

        const { data, error: insertError } = await supabase
          .from('workout_templates')
          .insert(templateData)
          .select()
          .single();

        if (insertError) throw insertError;

        // Optimistically add to state
        setTemplates(prev => [data, ...prev]);
        return data;
      } catch (err) {
        console.error('Error creating template:', err);
        setError('Failed to create template');
        return null;
      }
    },
    [user]
  );

  // Update template
  const updateTemplate = useCallback(
    async (
      id: string,
      updates: Partial<{ name: string; description: string | null; exercises: Exercise[] }>
    ): Promise<boolean> => {
      if (!user) return false;

      // Store previous state for rollback
      const previousTemplates = templates;

      try {
        // Optimistic update
        setTemplates(prev =>
          prev.map(t =>
            t.id === id
              ? { ...t, ...updates, updated_at: new Date().toISOString() }
              : t
          )
        );

        const updateData: WorkoutTemplateUpdate = {
          ...updates,
          updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
          .from('workout_templates')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        console.error('Error updating template:', err);
        // Rollback
        setTemplates(previousTemplates);
        setError('Failed to update template');
        return false;
      }
    },
    [user, templates]
  );

  // Delete template
  const deleteTemplate = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) return false;

      // Store previous state for rollback
      const previousTemplates = templates;

      try {
        // Optimistic delete
        setTemplates(prev => prev.filter(t => t.id !== id));

        const { error: deleteError } = await supabase
          .from('workout_templates')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;
        return true;
      } catch (err) {
        console.error('Error deleting template:', err);
        // Rollback
        setTemplates(previousTemplates);
        setError('Failed to delete template');
        return false;
      }
    },
    [user, templates]
  );

  // Duplicate template
  const duplicateTemplate = useCallback(
    async (id: string, newName: string): Promise<WorkoutTemplate | null> => {
      if (!user) return null;

      const template = templates.find(t => t.id === id);
      if (!template) {
        setError('Template not found');
        return null;
      }

      return createTemplate(newName, template.description, template.exercises);
    },
    [user, templates, createTemplate]
  );

  return {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    refetch: fetchTemplates,
  };
}
