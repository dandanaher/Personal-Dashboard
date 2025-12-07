import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import supabase from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/lib/logger';
import type { Task, TaskInsert, TaskUpdate } from '@/lib/types';
import { incrementXP } from '@/features/gamification/hooks/useProfileStats';
import { XP_REWARDS } from '@/features/gamification/utils';

interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  addTask: (title: string, description?: string) => Promise<boolean>;
  toggleTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  updateTask: (taskId: string, updates: TaskUpdate) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useTasks(date: Date): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const dateString = format(date, 'yyyy-MM-dd');

  // Sort tasks: incomplete first, then by order_index, then by created_at
  const sortTasks = useCallback((tasksToSort: Task[]): Task[] => {
    return [...tasksToSort].sort((a, b) => {
      // Completed tasks go to bottom
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      // Then by order_index
      if (a.order_index !== b.order_index) {
        return a.order_index - b.order_index;
      }
      // Then by created_at
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, []);

  // Fetch tasks for the selected date
  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateString)
        .order('order_index', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setTasks(sortTasks(data || []));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tasks';
      setError(errorMessage);
      logger.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [user, dateString, sortTasks]);

  // Add a new task with optimistic update
  const addTask = useCallback(
    async (title: string, description?: string): Promise<boolean> => {
      if (!user) return false;

      // Calculate new order_index (max + 1)
      const maxOrderIndex = tasks.reduce((max, task) => Math.max(max, task.order_index), 0);

      // Create temporary task for optimistic update
      const tempId = `temp-${Date.now()}`;
      const tempTask: Task = {
        id: tempId,
        user_id: user.id,
        title,
        description: description || null,
        completed: false,
        date: dateString,
        order_index: maxOrderIndex + 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Optimistic update
      setTasks((prev) => sortTasks([...prev, tempTask]));

      try {
        const insertData: TaskInsert = {
          user_id: user.id,
          title,
          description: description || null,
          completed: false,
          date: dateString,
          order_index: maxOrderIndex + 1,
        };

        const { data, error: insertError } = await supabase
          .from('tasks')
          .insert(insertData)
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        // Replace temp task with real task
        setTasks((prev) => sortTasks(prev.map((task) => (task.id === tempId ? data : task))));

        return true;
      } catch (err) {
        // Rollback optimistic update
        setTasks((prev) => prev.filter((task) => task.id !== tempId));
        const errorMessage = err instanceof Error ? err.message : 'Failed to add task';
        setError(errorMessage);
        logger.error('Error adding task:', err);
        return false;
      }
    },
    [user, dateString, tasks, sortTasks]
  );

  // Toggle task completion with optimistic update
  const toggleTask = useCallback(
    async (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const newCompleted = !task.completed;

      // Optimistic update
      setTasks((prev) =>
        sortTasks(
          prev.map((t) =>
            t.id === taskId
              ? { ...t, completed: newCompleted, updated_at: new Date().toISOString() }
              : t
          )
        )
      );

      try {
        const { error: updateError } = await supabase
          .from('tasks')
          .update({
            completed: newCompleted,
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId);

        if (updateError) {
          throw updateError;
        }

        // Award XP for completing a task (Focus)
        if (newCompleted && user) {
          await incrementXP(user.id, 'focus', XP_REWARDS.TASK_COMPLETE);
        }
      } catch (err) {
        // Rollback optimistic update
        setTasks((prev) =>
          sortTasks(prev.map((t) => (t.id === taskId ? { ...t, completed: task.completed } : t)))
        );
        const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
        setError(errorMessage);
        logger.error('Error toggling task:', err);
      }
    },
    [tasks, sortTasks]
  );

  // Delete task with optimistic update
  const deleteTask = useCallback(
    async (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      // Optimistic update
      setTasks((prev) => prev.filter((t) => t.id !== taskId));

      try {
        const { error: deleteError } = await supabase.from('tasks').delete().eq('id', taskId);

        if (deleteError) {
          throw deleteError;
        }
      } catch (err) {
        // Rollback optimistic update
        setTasks((prev) => sortTasks([...prev, task]));
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete task';
        setError(errorMessage);
        logger.error('Error deleting task:', err);
      }
    },
    [tasks, sortTasks]
  );

  // Update task with optimistic update
  const updateTask = useCallback(
    async (taskId: string, updates: TaskUpdate): Promise<boolean> => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return false;

      // Optimistic update
      setTasks((prev) =>
        sortTasks(
          prev.map((t) =>
            t.id === taskId ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
          )
        )
      );

      try {
        const { error: updateError } = await supabase
          .from('tasks')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId);

        if (updateError) {
          throw updateError;
        }

        return true;
      } catch (err) {
        // Rollback optimistic update
        setTasks((prev) => sortTasks(prev.map((t) => (t.id === taskId ? task : t))));
        const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
        setError(errorMessage);
        logger.error('Error updating task:', err);
        return false;
      }
    },
    [tasks, sortTasks]
  );

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchTasks();
  }, [fetchTasks]);

  // Subscribe to real-time changes with targeted updates (no full refetch)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`tasks-${dateString}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          logger.log('Real-time update:', payload.eventType);

          // Targeted updates - no full refetch needed
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task;
            if (newTask.date === dateString) {
              setTasks((prev) => {
                // Avoid duplicates (from optimistic updates)
                if (prev.some((t) => t.id === newTask.id)) return prev;
                return sortTasks([...prev, newTask]);
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new as Task;
            if (updatedTask.date === dateString) {
              setTasks((prev) =>
                sortTasks(prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)))
              );
            } else {
              // Task moved to different date, remove from current view
              setTasks((prev) => prev.filter((t) => t.id !== updatedTask.id));
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setTasks((prev) => prev.filter((t) => t.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, dateString, sortTasks]);

  return {
    tasks,
    loading,
    error,
    addTask,
    toggleTask,
    deleteTask,
    updateTask,
    refetch: fetchTasks,
  };
}

export default useTasks;
