import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabaseAuth } from '@/lib/supabase';

export function useAuth() {
  const {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    initialize,
    clearError,
  } = useAuthStore();

  useEffect(() => {
    console.log('useAuth: Hook mounted');

    // Initialize auth state on mount
    console.log('useAuth: Calling initialize()');
    initialize().catch((err) => {
      console.error('useAuth: Initialize failed:', err);
    });

    // Listen for auth state changes
    let subscription: { unsubscribe: () => void } | null = null;

    try {
      console.log('useAuth: Setting up auth state listener');
      const { data } = supabaseAuth.onAuthStateChange((event, session) => {
        console.log('useAuth: Auth state changed, event =', event);
        console.log('useAuth: New session user =', session?.user?.email || 'none');

        useAuthStore.setState({
          user: session?.user ?? null,
          session,
          loading: false,
        });
      });
      subscription = data.subscription;
    } catch (err) {
      console.error('useAuth: Failed to set up auth listener:', err);
    }

    return () => {
      console.log('useAuth: Hook unmounting, cleaning up');
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [initialize]);

  return {
    user,
    session,
    loading,
    error,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    clearError,
  };
}

export default useAuth;
