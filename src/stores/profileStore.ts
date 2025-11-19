import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

interface ProfileActions {
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (userId: string, updates: Partial<Profile>) => Promise<void>;
  clearProfile: () => void;
}

type ProfileStore = ProfileState & ProfileActions;

export const useProfileStore = create<ProfileStore>((set, get) => ({
  // State
  profile: null,
  loading: true, // Start true since profile hasn't been fetched yet
  error: null,

  // Actions
  fetchProfile: async (userId: string) => {
    if (!userId) {
      set({ profile: null, loading: false });
      return;
    }

    set({ loading: true, error: null });

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) {
        // Profile might not exist yet for older users
        if (fetchError.code === 'PGRST116') {
          // No rows returned - create a default profile
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              username: null,
            })
            .select()
            .single();

          if (insertError) {
            throw insertError;
          }

          set({ profile: newProfile, loading: false, error: null });
        } else {
          throw fetchError;
        }
      } else {
        set({ profile: data, loading: false, error: null });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch profile',
        loading: false,
      });
    }
  },

  updateProfile: async (userId: string, updates: Partial<Profile>) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;

      // Update local state immediately
      const currentProfile = get().profile;
      if (currentProfile) {
        set({
          profile: { ...currentProfile, ...updates },
        });
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      throw err;
    }
  },

  clearProfile: () => {
    set({ profile: null, loading: false, error: null });
  },
}));

export default useProfileStore;
