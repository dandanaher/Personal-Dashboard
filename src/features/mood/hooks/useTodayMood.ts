import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import supabase from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { MoodLog } from '@/lib/types';
import { incrementXP } from '@/features/gamification/hooks/useProfileStats';
import { XP_REWARDS } from '@/features/gamification/utils';

interface UseTodayMoodReturn {
  todayMood: MoodLog | null;
  loading: boolean;
  error: string | null;
  setMood: (moodLevel: 1 | 2 | 3 | 4 | 5, note?: string) => Promise<boolean>;
  updateNote: (note: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useTodayMood(): UseTodayMoodReturn {
  const [todayMood, setTodayMood] = useState<MoodLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuthStore();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const fetchTodayMood = useCallback(async () => {
    if (!user) {
      setTodayMood(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setTodayMood(data);
    } catch (err) {
      console.error('Error fetching today mood:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch mood');
    } finally {
      setLoading(false);
    }
  }, [user, todayStr]);

  const setMood = useCallback(
    async (moodLevel: 1 | 2 | 3 | 4 | 5, note?: string): Promise<boolean> => {
      if (!user) return false;

      // If mood already exists, update it
      if (todayMood) {
        const previousMood = todayMood;

        // Optimistic update
        setTodayMood({
          ...todayMood,
          mood_level: moodLevel,
          note: note ?? todayMood.note,
          updated_at: new Date().toISOString(),
        });

        try {
          const { error: updateError } = await supabase
            .from('mood_logs')
            .update({
              mood_level: moodLevel,
              note: note ?? todayMood.note,
            })
            .eq('id', todayMood.id)
            .eq('user_id', user.id);

          if (updateError) throw updateError;
          return true;
        } catch (err) {
          console.error('Error updating mood:', err);
          // Rollback
          setTodayMood(previousMood);
          setError(err instanceof Error ? err.message : 'Failed to update mood');
          return false;
        }
      }

      // Create new mood log
      const tempLog: MoodLog = {
        id: `temp-${Date.now()}`,
        user_id: user.id,
        date: todayStr,
        mood_level: moodLevel,
        note: note || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Optimistic add
      setTodayMood(tempLog);

      try {
        const { data, error: insertError } = await supabase
          .from('mood_logs')
          .insert({
            user_id: user.id,
            date: todayStr,
            mood_level: moodLevel,
            note: note || null,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Replace temp with real
        setTodayMood(data);

        // Award XP for logging mood (Consistency)
        await incrementXP(user.id, 'consistency', XP_REWARDS.HABIT_COMPLETE);

        return true;
      } catch (err) {
        console.error('Error creating mood:', err);
        // Rollback
        setTodayMood(null);
        setError(err instanceof Error ? err.message : 'Failed to save mood');
        return false;
      }
    },
    [user, todayMood, todayStr]
  );

  const updateNote = useCallback(
    async (note: string): Promise<boolean> => {
      if (!user || !todayMood) return false;

      const previousMood = todayMood;

      // Optimistic update
      setTodayMood({
        ...todayMood,
        note,
        updated_at: new Date().toISOString(),
      });

      try {
        const { error: updateError } = await supabase
          .from('mood_logs')
          .update({ note })
          .eq('id', todayMood.id)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        console.error('Error updating note:', err);
        // Rollback
        setTodayMood(previousMood);
        setError(err instanceof Error ? err.message : 'Failed to update note');
        return false;
      }
    },
    [user, todayMood]
  );

  // Initial fetch
  useEffect(() => {
    fetchTodayMood();
  }, [fetchTodayMood]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`mood_logs_today-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mood_logs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Only refetch if the change is for today's date
          const newRecord = payload.new as MoodLog | undefined;
          const oldRecord = payload.old as MoodLog | undefined;
          if (newRecord?.date === todayStr || oldRecord?.date === todayStr) {
            fetchTodayMood();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, todayStr, fetchTodayMood]);

  return {
    todayMood,
    loading,
    error,
    setMood,
    updateNote,
    refetch: fetchTodayMood,
  };
}
