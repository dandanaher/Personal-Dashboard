import { useState, useEffect, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import supabase from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { HabitLog } from '@/lib/types';
import { logger } from '@/lib/logger';

interface UseAllHabitLogsReturn {
    logsByHabit: Record<string, HabitLog[]>;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useAllHabitLogs(): UseAllHabitLogsReturn {
    const [logsByHabit, setLogsByHabit] = useState<Record<string, HabitLog[]>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { user } = useAuthStore();

    const fetchAllLogs = useCallback(async () => {
        if (!user) {
            setLogsByHabit({});
            setLoading(false);
            return;
        }

        try {
            setError(null);
            const startDate = format(subDays(new Date(), 365), 'yyyy-MM-dd');

            const { data, error: fetchError } = await supabase
                .from('habit_logs')
                .select('*')
                .eq('user_id', user.id)
                .gte('date', startDate)
                .order('date', { ascending: false });

            if (fetchError) throw fetchError;

            // Group logs by habit_id
            const grouped: Record<string, HabitLog[]> = {};
            data?.forEach((log) => {
                if (!grouped[log.habit_id]) {
                    grouped[log.habit_id] = [];
                }
                grouped[log.habit_id].push(log);
            });

            setLogsByHabit(grouped);
        } catch (err) {
            logger.error('Error fetching all habit logs:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch habit logs');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchAllLogs();
    }, [fetchAllLogs]);

    // Subscribe to changes to ANY habit log for this user
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel(`all_habit_logs-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'habit_logs',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    fetchAllLogs();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchAllLogs]);

    return {
        logsByHabit,
        loading,
        error,
        refetch: fetchAllLogs,
    };
}
