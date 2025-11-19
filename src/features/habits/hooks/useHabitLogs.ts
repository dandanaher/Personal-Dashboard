import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, subDays, parseISO, differenceInDays, startOfDay } from 'date-fns';
import supabase from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { HabitLog } from '@/lib/types';
import { incrementXP } from '@/features/gamification/hooks/useProfileStats';
import { XP_REWARDS } from '@/features/gamification/utils';

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

export function useHabitLogs(habitId: string): UseHabitLogsReturn {
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
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
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching habit logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch habit logs');
    } finally {
      setLoading(false);
    }
  }, [user, habitId]);

  const toggleLog = useCallback(async (date: string): Promise<boolean> => {
    if (!user || !habitId) return false;

    const existingLog = logs.find(log => log.date === date);

    if (existingLog) {
      // Optimistic delete
      setLogs(prev => prev.filter(log => log.id !== existingLog.id));

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
        setLogs(prev => [...prev, existingLog].sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ));
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
      setLogs(prev => [tempLog, ...prev].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));

      try {
        const { data, error: insertError } = await supabase
          .from('habit_logs')
          .insert({
            habit_id: habitId,
            user_id: user.id,
            date,
            completed: true,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Replace temp with real
        setLogs(prev => prev.map(log => log.id === tempId ? data : log));

        // Award XP for completing a habit (Consistency)
        await incrementXP(user.id, 'consistency', XP_REWARDS.HABIT_COMPLETE);

        return true;
      } catch (err) {
        console.error('Error creating habit log:', err);
        // Rollback
        setLogs(prev => prev.filter(log => log.id !== tempId));
        setError(err instanceof Error ? err.message : 'Failed to create log');
        return false;
      }
    }
  }, [user, habitId, logs]);

  // Calculate stats from logs
  const stats = useMemo((): HabitStats => {
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
    const completedDates = new Set(
      logs.filter(log => log.completed).map(log => log.date)
    );

    const completedDays = completedDates.size;
    const completionRate = Math.round((completedDays / 365) * 100);

    // Calculate current streak (consecutive days up to today)
    let currentStreak = 0;
    const today = startOfDay(new Date());
    let checkDate = today;

    while (true) {
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      if (completedDates.has(dateStr)) {
        currentStreak++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
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
  }, [logs]);

  // Initial fetch
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
