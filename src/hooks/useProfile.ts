import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import type { Profile } from '@/lib/types';

interface UseProfileReturn {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch user's profile (username, avatar)
 * Uses global profile store so all components share the same state
 */
export function useProfile(): UseProfileReturn {
  const { user } = useAuthStore();
  const { profile, loading, error, fetchProfile } = useProfileStore();

  const refetch = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  // Initial fetch when user changes
  useEffect(() => {
    if (user) {
      void fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  return {
    profile,
    loading,
    error,
    refetch,
  };
}

export default useProfile;
