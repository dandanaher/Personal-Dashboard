import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, subDays, parseISO, differenceInDays, startOfDay } from 'date-fns';
import supabase from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { MoodLog } from '@/lib/types';
import { incrementXP } from '@/features/gamification/hooks/useProfileStats';
import { XP_REWARDS } from '@/features/gamification/utils';

export interface MoodStats {
  averageMood: number;
  positiveDays: number;
  currentStreak: number;
  longestStreak: number;
  totalLogs: number;
}

interface UseMoodLogsReturn {
  logs: MoodLog[];
  stats: MoodStats;
  loading: boolean;
  error: string | null;
  addMoodLog: (date: string, moodLevel: 1 | 2 | 3 | 4 | 5, note?: string) => Promise<boolean>;
  updateMoodLog: (id: string, moodLevel: 1 | 2 | 3 | 4 | 5, note?: string) => Promise<boolean>;
  deleteMoodLog: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

/**
 * Calculate mood stats from a list of logs
 */
export function calculateMoodStats(logs: MoodLog[]): MoodStats {
  if (logs.length === 0) {
    return {
      averageMood: 0,
      positiveDays: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalLogs: 0,
    };
  }

  // Calculate average mood
  const totalMood = logs.reduce((sum, log) => sum + log.mood_level, 0);
  const averageMood = Math.round((totalMood / logs.length) * 10) / 10;

  // Count positive days (mood >= 4)
  const positiveDays = logs.filter((log) => log.mood_level >= 4).length;

  // Get logged dates as a Set for quick lookup
  const loggedDates = new Set(logs.map((log) => log.date));

  // Calculate current streak (consecutive days of logging)
  let currentStreak = 0;
  const today = startOfDay(new Date());
  const todayStr = format(today, 'yyyy-MM-dd');
  const todayLogged = loggedDates.has(todayStr);

  // If today is logged, count from today backward
  // If today is NOT logged, count from yesterday backward
  let checkDate = todayLogged ? today : subDays(today, 1);

  while (true) {
    const dateStr = format(checkDate, 'yyyy-MM-dd');
    if (loggedDates.has(dateStr)) {
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
  const sortedDates = Array.from(loggedDates).sort();

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
    averageMood,
    positiveDays,
    currentStreak,
    longestStreak,
    totalLogs: logs.length,
  };
}

export function useMoodLogs(): UseMoodLogsReturn {
  const [logs, setLogs] = useState<MoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuthStore();

  const fetchLogs = useCallback(async () => {
    if (!user) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const startDate = format(subDays(new Date(), 365), 'yyyy-MM-dd');

      const { data, error: fetchError } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .order('date', { ascending: false });

      if (fetchError) throw fetchError;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching mood logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch mood logs');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addMoodLog = useCallback(
    async (date: string, moodLevel: 1 | 2 | 3 | 4 | 5, note?: string): Promise<boolean> => {
      if (!user) return false;

      // Check if a log already exists for this date
      const existingLog = logs.find((log) => log.date === date);
      if (existingLog) {
        // Update instead
        return updateMoodLog(existingLog.id, moodLevel, note);
      }

      const tempId = `temp-${Date.now()}`;
      const tempLog: MoodLog = {
        id: tempId,
        user_id: user.id,
        date,
        mood_level: moodLevel,
        note: note || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Optimistic add
      setLogs((prev) =>
        [tempLog, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );

      try {
        const { data, error: insertError } = await supabase
          .from('mood_logs')
          .insert({
            user_id: user.id,
            date,
            mood_level: moodLevel,
            note: note || null,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Replace temp with real
        setLogs((prev) => prev.map((log) => (log.id === tempId ? data : log)));

        // Award XP for logging mood (Consistency)
        await incrementXP(user.id, 'consistency', XP_REWARDS.HABIT_COMPLETE);

        return true;
      } catch (err) {
        console.error('Error creating mood log:', err);
        // Rollback
        setLogs((prev) => prev.filter((log) => log.id !== tempId));
        setError(err instanceof Error ? err.message : 'Failed to create log');
        return false;
      }
    },
    [user, logs]
  );

  const updateMoodLog = useCallback(
    async (id: string, moodLevel: 1 | 2 | 3 | 4 | 5, note?: string): Promise<boolean> => {
      if (!user) return false;

      const existingLog = logs.find((log) => log.id === id);
      if (!existingLog) return false;

      // Optimistic update
      setLogs((prev) =>
        prev.map((log) =>
          log.id === id
            ? { ...log, mood_level: moodLevel, note: note ?? log.note, updated_at: new Date().toISOString() }
            : log
        )
      );

      try {
        const { error: updateError } = await supabase
          .from('mood_logs')
          .update({
            mood_level: moodLevel,
            note: note ?? existingLog.note,
          })
          .eq('id', id)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        console.error('Error updating mood log:', err);
        // Rollback
        setLogs((prev) => prev.map((log) => (log.id === id ? existingLog : log)));
        setError(err instanceof Error ? err.message : 'Failed to update log');
        return false;
      }
    },
    [user, logs]
  );

  const deleteMoodLog = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) return false;

      const existingLog = logs.find((log) => log.id === id);
      if (!existingLog) return false;

      // Optimistic delete
      setLogs((prev) => prev.filter((log) => log.id !== id));

      try {
        const { error: deleteError } = await supabase
          .from('mood_logs')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;
        return true;
      } catch (err) {
        console.error('Error deleting mood log:', err);
        // Rollback
        setLogs((prev) =>
          [...prev, existingLog].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )
        );
        setError(err instanceof Error ? err.message : 'Failed to delete log');
        return false;
      }
    },
    [user, logs]
  );

  // Calculate stats from logs
  const stats = useMemo(() => calculateMoodStats(logs), [logs]);

  // Initial fetch
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`mood_logs-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mood_logs',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchLogs]);

  return {
    logs,
    stats,
    loading,
    error,
    addMoodLog,
    updateMoodLog,
    deleteMoodLog,
    refetch: fetchLogs,
  };
}
