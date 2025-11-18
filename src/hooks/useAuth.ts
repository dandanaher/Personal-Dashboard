import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

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
    // Initialize auth state on mount
    // Note: The authStore.initialize() sets up the onAuthStateChange listener,
    // so we don't need a duplicate listener here
    initialize().catch((err) => {
      console.error('useAuth: Initialize failed:', err);
    });
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
