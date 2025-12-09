import { useState, useEffect, useCallback } from 'react';
import { format, startOfDay } from 'date-fns';
import supabase from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Task, TaskUpdate } from '@/lib/types';
import { incrementXP } from '@/features/gamification/hooks/useProfileStats';
import { XP_REWARDS } from '@/features/gamification/utils';

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
  addTask: (title: string, description?: string, date?: string | null, taskType?: string | null) => Promise<boolean>;
  toggleTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  updateTask: (taskId: string, updates: TaskUpdate) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useAllTasks(): UseAllTasksReturn {
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const today = format(startOfDay(new Date()), 'yyyy-MM-dd');

  // Sort tasks: by date (nulls last), then by order_index, then by created_at
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
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true, nullsFirst: false })
        .order('order_index', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setAllTasks(sortTasks(data || []));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tasks';
      setError(errorMessage);
      console.error('Error fetching all tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [user, sortTasks]);

  // Calculate derived task lists
  const upcomingTasks = allTasks.filter((task) => {
    if (task.completed) return false;
    if (!task.date) return false;
    return task.date >= today;
  });

  const datelessTasks = allTasks.filter((task) => !task.date && !task.completed);

  const overdueTasks = allTasks.filter((task) => {
    if (task.completed) return false;
    if (!task.date) return false;
    return task.date < today;
  });

  // Check if there are uncompleted tasks from previous days
  const hasPreviousUncompleted = overdueTasks.length > 0;

  // Add a new task with optimistic update
  const addTask = useCallback(
    async (title: string, description?: string, date?: string | null, taskType?: string | null): Promise<boolean> => {
      if (!user) return false;

      // Calculate new order_index
      const tasksForDate = allTasks.filter((t) => t.date === date);
      const maxOrderIndex = tasksForDate.reduce((max, task) => Math.max(max, task.order_index), 0);

      // Create temporary task for optimistic update
      const tempId = `temp-${Date.now()}`;
      const tempTask: Task = {
        id: tempId,
        user_id: user.id,
        title,
        description: description || null,
        completed: false,
        date: date ?? null,
        order_index: maxOrderIndex + 1,
        task_type: taskType || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Optimistic update
      setAllTasks((prev) => sortTasks([...prev, tempTask]));

      try {
        const { data, error: insertError } = await supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            title,
            description: description || null,
            completed: false,
            date: date ?? null,
            order_index: maxOrderIndex + 1,
            task_type: taskType || null,
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        // Replace temp task with real task
        setAllTasks((prev) => sortTasks(prev.map((task) => (task.id === tempId ? data : task))));

        return true;
      } catch (err) {
        // Rollback optimistic update
        setAllTasks((prev) => prev.filter((task) => task.id !== tempId));
        const errorMessage = err instanceof Error ? err.message : 'Failed to add task';
        setError(errorMessage);
        console.error('Error adding task:', err);
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
        setAllTasks((prev) =>
          sortTasks(prev.map((t) => (t.id === taskId ? { ...t, completed: task.completed } : t)))
        );
        const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
        setError(errorMessage);
        console.error('Error toggling task:', err);
      }
    },
    [allTasks, sortTasks, user]
  );

  // Delete task with optimistic update
  const deleteTask = useCallback(
    async (taskId: string) => {
      const task = allTasks.find((t) => t.id === taskId);
      if (!task) return;

      // Optimistic update
      setAllTasks((prev) => prev.filter((t) => t.id !== taskId));

      try {
        const { error: deleteError } = await supabase.from('tasks').delete().eq('id', taskId);

        if (deleteError) {
          throw deleteError;
        }
      } catch (err) {
        // Rollback optimistic update
        setAllTasks((prev) => sortTasks([...prev, task]));
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete task';
        setError(errorMessage);
        console.error('Error deleting task:', err);
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
        setAllTasks((prev) => sortTasks(prev.map((t) => (t.id === taskId ? task : t))));
        const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
        setError(errorMessage);
        console.error('Error updating task:', err);
        return false;
      }
    },
    [allTasks, sortTasks]
  );

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchTasks();
  }, [fetchTasks]);

  // Subscribe to real-time changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('all-tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchTasks]);

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
    refetch: fetchTasks,
  };
}

export default useAllTasks;
