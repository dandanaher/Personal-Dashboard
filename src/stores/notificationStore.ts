import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface NotificationPreferencesState {
  habitRemindersEnabled: boolean;
  /** Time in HH:MM format */
  reminderTime: string;
  /** IANA timezone */
  timezone: string;
}

interface NotificationState {
  // Permission state
  permission: NotificationPermission;
  isSubscribed: boolean;

  // User preferences (synced from DB)
  preferences: NotificationPreferencesState | null;

  // UI state
  showPermissionBanner: boolean;
  loading: boolean;
  error: string | null;
}

interface NotificationActions {
  setPermission: (permission: NotificationPermission) => void;
  setSubscribed: (isSubscribed: boolean) => void;
  setPreferences: (prefs: NotificationPreferencesState | null) => void;
  dismissBanner: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

type NotificationStore = NotificationState & NotificationActions;

const initialState: NotificationState = {
  permission: 'default',
  isSubscribed: false,
  preferences: null,
  showPermissionBanner: true,
  loading: false,
  error: null,
};

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      ...initialState,

      setPermission: (permission) => set({ permission }),
      setSubscribed: (isSubscribed) => set({ isSubscribed }),
      setPreferences: (preferences) => set({ preferences }),
      dismissBanner: () => set({ showPermissionBanner: false }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      reset: () => set(initialState),
    }),
    {
      name: 'mydash-notifications',
      partialize: (state) => ({
        // Only persist UI preferences, not dynamic state
        showPermissionBanner: state.showPermissionBanner,
      }),
    }
  )
);

export default useNotificationStore;
