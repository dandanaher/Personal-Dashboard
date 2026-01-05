import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, startOfDay } from 'date-fns';
import type { PostgrestError } from '@supabase/supabase-js';
import supabase from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/lib/logger';
import type { Task, TaskUpdate } from '@/lib/types';

interface UseAllTasksReturn {
  /** All tasks for the user */
  allTasks: Task[];
  /** Upcoming tasks sorted chronologically (uncompleted, future or today) */
  upcomingTasks: Task[];
  /** Dateless/general tasks */
  datelessTasks: Task[];
  /** Overdue tasks (uncompleted from past dates) */
  overdueTasks: Task[];
  /** Whether previous days have uncompleted tasks */
  hasPreviousUncompleted: boolean;
  loading: boolean;
  error: string | null;
  addTask: (title: string, description?: string, date?: string | null, taskType?: string | null, priority?: 1 | 2 | 3 | null) => Promise<boolean>;
  toggleTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  updateTask: (taskId: string, updates: TaskUpdate) => Promise<boolean>;
  /** Delete a tag by clearing task_type for all tasks that use it */
  deleteTag: (tag: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

type SupabaseResult<T> = { data: T | null; error: PostgrestError | null };

export function useAllTasks(): UseAllTasksReturn {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const today = format(startOfDay(new Date()), 'yyyy-MM-dd');

  // Sort tasks: by date (nulls last), then by priority, then by order_index, then by created_at
  const sortTasks = useCallback((tasksToSort: Task[]): Task[] => {
    return [...tasksToSort].sort((a, b) => {
      // Completed tasks go to bottom
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      // Null dates (dateless tasks) go after dated tasks
      if (a.date === null && b.date !== null) return 1;
      if (a.date !== null && b.date === null) return -1;
      // Sort by date
      if (a.date && b.date && a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      // Then by priority (1 = high first, null = no priority last)
      const aPriority = a.priority ?? 4; // Treat null as lowest priority (4)
      const bPriority = b.priority ?? 4;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      // Then by order_index
      if (a.order_index !== b.order_index) {
        return a.order_index - b.order_index;
      }
      // Then by created_at
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, []);

  // Fetch all tasks
  const fetchTasks = useCallback(async () => {
    if (!user) {
      setAllTasks([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: fetchError } = (await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true, nullsFirst: false })
        .order('order_index', { ascending: true })) as SupabaseResult<Task[]>;

      if (fetchError) {
        throw fetchError;
      }

      setAllTasks(sortTasks(data || []));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tasks';
      setError(errorMessage);
      logger.error('Error fetching all tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [user, sortTasks]);

  // Calculate derived task lists
  const { upcomingTasks, datelessTasks, overdueTasks } = useMemo(() => {
    const upcoming: Task[] = [];
    const dateless: Task[] = [];
    const overdue: Task[] = [];

    allTasks.forEach((task) => {
      if (task.completed) return;
      if (!task.date) {
        dateless.push(task);
        return;
      }
      if (task.date >= today) {
        upcoming.push(task);
      } else {
        overdue.push(task);
      }
    });

    return { upcomingTasks: upcoming, datelessTasks: dateless, overdueTasks: overdue };
  }, [allTasks, today]);

  // Check if there are uncompleted tasks from previous days
  const hasPreviousUncompleted = overdueTasks.length > 0;

  // Add a new task with optimistic update
  const addTask = useCallback(
    async (title: string, description?: string, date?: string | null, taskType?: string | null, priority?: 1 | 2 | 3 | null): Promise<boolean> => {
      if (!user) return false;

      // Calculate new order_index
      const targetDate = date ?? null;
      const maxOrderIndex = allTasks.reduce((max, task) => {
        if (task.date === targetDate) {
          return Math.max(max, task.order_index);
        }
        return max;
      }, 0);

      // Create temporary task for optimistic update
      const tempId = `temp-${Date.now()}`;
      const tempTask: Task = {
        id: tempId,
        user_id: user.id,
        title,
        description: description || null,
        completed: false,
        date: targetDate,
        order_index: maxOrderIndex + 1,
        task_type: taskType || null,
        priority: priority ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Optimistic update
      setAllTasks((prev) => sortTasks([...prev, tempTask]));

      try {
        const { data, error: insertError } = (await supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            title,
            description: description || null,
            completed: false,
            date: targetDate,
            order_index: maxOrderIndex + 1,
            task_type: taskType || null,
            priority: priority ?? null,
          })
          .select()
          .single()) as SupabaseResult<Task>;

        if (insertError) {
          throw insertError;
        }

        // Replace temp task with real task
        if (!data) {
          throw new Error('Failed to add task');
        }

        setAllTasks((prev) => sortTasks(prev.map((task) => (task.id === tempId ? data : task))));

        return true;
      } catch (err) {
        // Rollback optimistic update
        setAllTasks((prev) => prev.filter((task) => task.id !== tempId));
        const errorMessage = err instanceof Error ? err.message : 'Failed to add task';
        setError(errorMessage);
        logger.error('Error adding task:', err);
        return false;
      }
    },
    [user, allTasks, sortTasks]
  );

  // Toggle task completion with optimistic update
  const toggleTask = useCallback(
    async (taskId: string) => {
      const task = allTasks.find((t) => t.id === taskId);
      if (!task) return;

      const newCompleted = !task.completed;

      // Optimistic update
      setAllTasks((prev) =>
        sortTasks(
          prev.map((t) =>
            t.id === taskId
              ? { ...t, completed: newCompleted, updated_at: new Date().toISOString() }
              : t
          )
        )
      );

      try {
        const { error: updateError } = (await supabase
          .from('tasks')
          .update({
            completed: newCompleted,
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId)) as SupabaseResult<Task[]>;

        if (updateError) {
          throw updateError;
        }

      } catch (err) {
        // Rollback optimistic update
        setAllTasks((prev) =>
          sortTasks(prev.map((t) => (t.id === taskId ? { ...t, completed: task.completed } : t)))
        );
        const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
        setError(errorMessage);
        logger.error('Error toggling task:', err);
      }
    },
    [allTasks, sortTasks]
  );

  // Delete task with optimistic update
  const deleteTask = useCallback(
    async (taskId: string) => {
      const task = allTasks.find((t) => t.id === taskId);
      if (!task) return;

      // Optimistic update
      setAllTasks((prev) => prev.filter((t) => t.id !== taskId));

      try {
        const { error: deleteError } = (await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId)) as SupabaseResult<Task[]>;

        if (deleteError) {
          throw deleteError;
        }
      } catch (err) {
        // Rollback optimistic update
        setAllTasks((prev) => sortTasks([...prev, task]));
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete task';
        setError(errorMessage);
        logger.error('Error deleting task:', err);
      }
    },
    [allTasks, sortTasks]
  );

  // Update task with optimistic update
  const updateTask = useCallback(
    async (taskId: string, updates: TaskUpdate): Promise<boolean> => {
      const task = allTasks.find((t) => t.id === taskId);
      if (!task) return false;

      // Optimistic update
      setAllTasks((prev) =>
        sortTasks(
          prev.map((t) =>
            t.id === taskId ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
          )
        )
      );

      try {
        const { error: updateError } = (await supabase
          .from('tasks')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', taskId)) as SupabaseResult<Task[]>;

        if (updateError) {
          throw updateError;
        }

        return true;
      } catch (err) {
        // Rollback optimistic update
        setAllTasks((prev) => sortTasks(prev.map((t) => (t.id === taskId ? task : t))));
        const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
        setError(errorMessage);
        logger.error('Error updating task:', err);
        return false;
      }
    },
    [allTasks, sortTasks]
  );

  /** Delete a tag by clearing task_type for all tasks that use it */
  const deleteTag = useCallback(
    async (tag: string): Promise<boolean> => {
      if (!user) return false;

      // Optimistic update: clear task_type for all tasks locally
      setAllTasks((prev) =>
        prev.map((t) => (t.task_type === tag ? { ...t, task_type: null } : t))
      );

      try {
        const { error: updateError } = (await supabase
          .from('tasks')
          .update({ task_type: null })
          .eq('user_id', user.id)
          .eq('task_type', tag)) as SupabaseResult<Task[]>;

        if (updateError) {
          throw updateError;
        }

        return true;
      } catch (err) {
        logger.error('Error deleting tag:', err);
        // Rollback by refetching
        await fetchTasks();
        return false;
      }
    },
    [user, fetchTasks]
  );

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    void fetchTasks();
  }, [fetchTasks]);

  // Subscribe to real-time changes with targeted updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`all-tasks-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task;
            setAllTasks((prev) => {
              if (prev.some((task) => task.id === newTask.id)) return prev;
              const tempIndex = prev.findIndex(
                (task) =>
                  task.id.startsWith('temp-') &&
                  task.title === newTask.title &&
                  task.date === newTask.date &&
                  task.order_index === newTask.order_index
              );
              if (tempIndex !== -1) {
                const next = [...prev];
                next[tempIndex] = newTask;
                return sortTasks(next);
              }
              return sortTasks([...prev, newTask]);
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new as Task;
            setAllTasks((prev) => {
              if (!prev.some((task) => task.id === updatedTask.id)) {
                return sortTasks([...prev, updatedTask]);
              }
              return sortTasks(
                prev.map((task) => (task.id === updatedTask.id ? updatedTask : task))
              );
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setAllTasks((prev) => prev.filter((task) => task.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, sortTasks]);

  return {
    allTasks,
    upcomingTasks,
    datelessTasks,
    overdueTasks,
    hasPreviousUncompleted,
    loading,
    error,
    addTask,
    toggleTask,
    deleteTask,
    updateTask,
    deleteTag,
    refetch: fetchTasks,
  };
}

export default useAllTasks;
