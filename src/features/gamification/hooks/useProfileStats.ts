import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Attribute, AttributeWithXP, AttributeId } from '@/lib/types';
import { getLevelFromXP, getProgressToNextLevel } from '../utils';

interface UseProfileStatsReturn {
  attributes: AttributeWithXP[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage user's profile stats (XP and levels)
 */
export function useProfileStats(): UseProfileStatsReturn {
  const [attributes, setAttributes] = useState<AttributeWithXP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const fetchStats = useCallback(async () => {
    if (!user) {
      setAttributes([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Fetch all attributes
      const { data: attributesData, error: attributesError } = await supabase
        .from('attributes')
        .select('*')
        .order('id');

      if (attributesError) throw attributesError;

      // Fetch user's XP for all attributes
      const { data: xpData, error: xpError } = await supabase
        .from('user_xp')
        .select('*')
        .eq('user_id', user.id);

      if (xpError) throw xpError;

      // Create a map of attribute_id to current_xp
      const xpMap = new Map<string, number>();
      xpData?.forEach((xp: { attribute_id: string; current_xp: number }) => {
        xpMap.set(xp.attribute_id, xp.current_xp);
      });

      // Combine attributes with XP data
      const combined: AttributeWithXP[] = ((attributesData as Attribute[]) || []).map((attr) => {
        const currentXP = xpMap.get(attr.id) || 0;
        return {
          ...attr,
          current_xp: currentXP,
          level: getLevelFromXP(currentXP),
          progress: getProgressToNextLevel(currentXP),
        };
      });

      setAttributes(combined);
    } catch (err) {
      console.error('Error fetching profile stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch profile stats');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  // Real-time subscription for XP updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user_xp-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_xp',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void fetchStats();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, fetchStats]);

  return {
    attributes,
    loading,
    error,
    refetch: fetchStats,
  };
}

/**
 * Increment XP for a specific attribute using the database RPC function
 */
export async function incrementXP(
  userId: string,
  attributeId: AttributeId,
  xpAmount: number
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('increment_xp', {
      target_user_id: userId,
      target_attribute_id: attributeId,
      xp_amount: xpAmount,
    });

    if (error) {
      console.error('Error incrementing XP:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error incrementing XP:', err);
    return false;
  }
}

export default useProfileStats;
