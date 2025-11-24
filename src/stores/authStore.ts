import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabaseAuth, supabase } from '@/lib/supabase';
import { useProfileStore } from '@/stores/profileStore';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      session: null,
      loading: true,
      error: null,
      initialized: false,

      // Actions
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (loading) => {
        console.log('Auth store: Setting loading =', loading);
        set({ loading });
      },
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      signIn: async (email: string, password: string) => {
        console.log('Auth store: signIn called');
        set({ loading: true, error: null });
        try {
          const { data, error } = await supabaseAuth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            throw error;
          }

          console.log('Auth store: signIn success');
          set({
            user: data.user,
            session: data.session,
            loading: false,
            error: null,
          });
        } catch (error) {
          const authError = error as AuthError;
          console.error('Auth store: signIn error:', authError.message);
          set({
            loading: false,
            error: authError.message || 'Failed to sign in',
          });
          throw error;
        }
      },

      signUp: async (email: string, password: string, username?: string) => {
        console.log('Auth store: signUp called');
        set({ loading: true, error: null });
        try {
          const { data, error } = await supabaseAuth.signUp({
            email,
            password,
          });

          if (error) {
            throw error;
          }

          // Create profile with username
          if (data.user) {
            const { error: profileError } = await supabase.from('profiles').insert({
              id: data.user.id,
              username: username || null,
            });

            if (profileError) {
              console.error('Auth store: profile creation error:', profileError.message);
              // Don't throw - user is created, profile can be added later
            } else {
              // Fetch profile into global store so it's immediately available
              await useProfileStore.getState().fetchProfile(data.user.id);
            }
          }

          console.log('Auth store: signUp success');
          set({
            user: data.user,
            session: data.session,
            loading: false,
            error: null,
          });
        } catch (error) {
          const authError = error as AuthError;
          console.error('Auth store: signUp error:', authError.message);
          set({
            loading: false,
            error: authError.message || 'Failed to sign up',
          });
          throw error;
        }
      },

      signOut: async () => {
        console.log('Auth store: signOut called');
        set({ loading: true, error: null });
        try {
          const { error } = await supabaseAuth.signOut();

          if (error) {
            throw error;
          }

          console.log('Auth store: signOut success');

          // Clear profile from global store
          useProfileStore.getState().clearProfile();

          set({
            user: null,
            session: null,
            loading: false,
            error: null,
          });
        } catch (error) {
          const authError = error as AuthError;
          console.error('Auth store: signOut error:', authError.message);
          set({
            loading: false,
            error: authError.message || 'Failed to sign out',
          });
          throw error;
        }
      },

      initialize: async () => {
        console.log('Auth store: Starting initialization');

        // Prevent multiple initializations
        if (get().initialized) {
          console.log('Auth store: Already initialized, skipping');
          return;
        }

        // Set up timeout fallback
        const timeoutId = setTimeout(() => {
          if (get().loading) {
            console.error('Auth store: Initialization timeout (5s) - forcing loading to false');
            set({
              loading: false,
              error: 'Authentication initialization timed out',
              initialized: true,
            });
          }
        }, 5000);

        try {
          console.log('Auth store: Calling getSession...');
          const {
            data: { session },
            error,
          } = await supabaseAuth.getSession();

          clearTimeout(timeoutId);

          if (error) {
            console.error('Auth store: getSession error:', error.message);
            throw error;
          }

          console.log('Auth store: Session retrieved, user =', session?.user?.email || 'none');

          set({
            user: session?.user ?? null,
            session,
            loading: false,
            error: null,
            initialized: true,
          });

          console.log('Auth store: Loading = false, initialization complete');

          // Set up auth state change listener
          console.log('Auth store: Setting up onAuthStateChange listener');
          supabaseAuth.onAuthStateChange((event, session) => {
            console.log('Auth store: onAuthStateChange event:', event);
            const currentState = get();
            if (currentState.session?.access_token !== session?.access_token) {
              console.log('Auth store: Session changed, updating state');
              set({
                user: session?.user ?? null,
                session,
              });
            }
          });
        } catch (error) {
          clearTimeout(timeoutId);
          const authError = error as AuthError;
          console.error('Auth store: Initialization failed:', authError.message);
          set({
            loading: false,
            error: authError.message || 'Failed to initialize auth',
            initialized: true,
          });
          console.log('Auth store: Loading = false (error path)');
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
      }),
    }
  )
);

export default useAuthStore;
