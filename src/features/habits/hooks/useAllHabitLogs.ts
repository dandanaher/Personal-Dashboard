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
            const logs = (data ?? []) as HabitLog[];
            const grouped: Record<string, HabitLog[]> = {};
            logs.forEach((log) => {
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
        void fetchAllLogs();
    }, [fetchAllLogs]);

    const upsertLog = useCallback((log: HabitLog) => {
        setLogsByHabit((prev) => {
            const next = { ...prev };
            const list = next[log.habit_id] ? [...next[log.habit_id]] : [];
            const existingIndex = list.findIndex((item) => item.id === log.id);
            if (existingIndex === -1) {
                list.push(log);
            } else {
                list[existingIndex] = log;
            }
            list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            next[log.habit_id] = list;
            return next;
        });
    }, []);

    const removeLog = useCallback((logId: string, habitId?: string) => {
        setLogsByHabit((prev) => {
            const next = { ...prev };
            if (habitId && next[habitId]) {
                const filtered = next[habitId].filter((log) => log.id !== logId);
                if (filtered.length === 0) {
                    delete next[habitId];
                } else {
                    next[habitId] = filtered;
                }
                return next;
            }

            let changed = false;
            Object.keys(next).forEach((key) => {
                const filtered = next[key].filter((log) => log.id !== logId);
                if (filtered.length !== next[key].length) {
                    changed = true;
                    if (filtered.length === 0) {
                        delete next[key];
                    } else {
                        next[key] = filtered;
                    }
                }
            });

            return changed ? next : prev;
        });
    }, []);

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
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newLog = payload.new as HabitLog;
                        upsertLog(newLog);
                    } else if (payload.eventType === 'UPDATE') {
                        const updatedLog = payload.new as HabitLog;
                        const previousHabitId = (payload.old as { habit_id?: string })?.habit_id;
                        if (previousHabitId && previousHabitId !== updatedLog.habit_id) {
                            removeLog(updatedLog.id, previousHabitId);
                        }
                        upsertLog(updatedLog);
                    } else if (payload.eventType === 'DELETE') {
                        const deleted = payload.old as { id: string; habit_id?: string };
                        removeLog(deleted.id, deleted.habit_id);
                    }
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [user, upsertLog, removeLog]);

    return {
        logsByHabit,
        loading,
        error,
        refetch: fetchAllLogs,
    };
}
