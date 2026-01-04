import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, subDays, parseISO, differenceInDays, startOfDay } from 'date-fns';
import type { PostgrestError } from '@supabase/supabase-js';
import supabase from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { HabitLog } from '@/lib/types';

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  completedDays: number;
  totalDays: number;
}

interface UseHabitLogsReturn {
  logs: HabitLog[];
  stats: HabitStats;
  loading: boolean;
  error: string | null;
  toggleLog: (date: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

/**
 * Calculate habit stats from a list of logs
 */
export function calculateHabitStats(logs: HabitLog[]): HabitStats {
  if (logs.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      completionRate: 0,
      completedDays: 0,
      totalDays: 365,
    };
  }

  // Get completed dates as a Set for quick lookup
  const completedDates = new Set(logs.filter((log) => log.completed).map((log) => log.date));

  const completedDays = completedDates.size;
  const completionRate = Math.round((completedDays / 365) * 100);

  // Calculate current streak (consecutive days up to today or yesterday)
  let currentStreak = 0;
  const today = startOfDay(new Date());
  const todayStr = format(today, 'yyyy-MM-dd');
  const todayCompleted = completedDates.has(todayStr);

  // If today is completed, count from today backward
  // If today is NOT completed, count from yesterday backward (giving user until end of day)
  let checkDate = todayCompleted ? today : subDays(today, 1);

  while (completedDates.has(format(checkDate, 'yyyy-MM-dd'))) {
    currentStreak++;
    checkDate = subDays(checkDate, 1);
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 0;

  // Sort dates chronologically
  const sortedDates = Array.from(completedDates).sort();

  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prevDate = parseISO(sortedDates[i - 1]);
      const currDate = parseISO(sortedDates[i]);
      const diff = differenceInDays(currDate, prevDate);

      if (diff === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
  }

  return {
    currentStreak,
    longestStreak,
    completionRate,
    completedDays,
    totalDays: 365,
  };
}

export function useHabitLogs(habitId: string, initialLogs?: HabitLog[]): UseHabitLogsReturn {
  const [logs, setLogs] = useState<HabitLog[]>(initialLogs || []);
  const [loading, setLoading] = useState(!initialLogs);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuthStore();

  const fetchLogs = useCallback(async () => {
    if (!user || !habitId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const startDate = format(subDays(new Date(), 365), 'yyyy-MM-dd');

      const { data, error: fetchError } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('habit_id', habitId)
        .eq('user_id', user.id)
        .gte('date', startDate)
        .order('date', { ascending: false });

      if (fetchError) throw fetchError;
      const logsData = (data ?? []) as HabitLog[];
      setLogs(logsData);
    } catch (err) {
      console.error('Error fetching habit logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch habit logs');
    } finally {
      setLoading(false);
    }
  }, [user, habitId]);

  const toggleLog = useCallback(
    async (date: string): Promise<boolean> => {
      if (!user || !habitId) return false;

      const existingLog = logs.find((log) => log.date === date);

      if (existingLog) {
        // Optimistic delete
        setLogs((prev) => prev.filter((log) => log.id !== existingLog.id));

        try {
          const { error: deleteError } = await supabase
            .from('habit_logs')
            .delete()
            .eq('id', existingLog.id)
            .eq('user_id', user.id);

          if (deleteError) throw deleteError;
          return true;
        } catch (err) {
          console.error('Error deleting habit log:', err);
          // Rollback
          setLogs((prev) =>
            [...prev, existingLog].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )
          );
          setError(err instanceof Error ? err.message : 'Failed to delete log');
          return false;
        }
      } else {
        // Create new log
        const tempId = `temp-${Date.now()}`;
        const tempLog: HabitLog = {
          id: tempId,
          habit_id: habitId,
          user_id: user.id,
          date,
          completed: true,
          notes: null,
          created_at: new Date().toISOString(),
        };

        // Optimistic add
        setLogs((prev) =>
          [tempLog, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        );

        try {
          const insertResult = (await supabase
            .from('habit_logs')
            .insert({
              habit_id: habitId,
              user_id: user.id,
              date,
              completed: true,
            })
            .select()
            .single()) as { data: HabitLog | null; error: PostgrestError | null };
          const { data: insertedLog, error: insertError } = insertResult;

          if (insertError) throw insertError;
          const newLog = insertedLog as HabitLog;

          // Replace temp with real
          setLogs((prev) => prev.map((log) => (log.id === tempId ? newLog : log)));

          return true;
        } catch (err) {
          console.error('Error creating habit log:', err);
          // Rollback
          setLogs((prev) => prev.filter((log) => log.id !== tempId));
          setError(err instanceof Error ? err.message : 'Failed to create log');
          return false;
        }
      }
    },
    [user, habitId, logs]
  );

  // Calculate stats from logs
  const stats = useMemo(() => calculateHabitStats(logs), [logs]);

  // Initial fetch
  useEffect(() => {
    if (initialLogs) {
      setLogs(initialLogs);
      setLoading(false);
    } else {
      void fetchLogs();
    }
  }, [fetchLogs, initialLogs]);

  // Real-time subscription
  useEffect(() => {
    if (!user || !habitId) return;

    const channel = supabase
      .channel(`habit_logs-${habitId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'habit_logs',
          filter: `habit_id=eq.${habitId}`,
        },
        () => {
          void fetchLogs();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, habitId, fetchLogs]);

  return {
    logs,
    stats,
    loading,
    error,
    toggleLog,
    refetch: fetchLogs,
  };
}
