import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { supabase } from '@/lib/supabase';

/**
 * Get the user's timezone using the Intl API
 */
function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

export function useNotificationPreferences() {
  const { user } = useAuthStore();
  const { preferences, setPreferences } = useNotificationStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch preferences on mount and when user changes
  useEffect(() => {
    async function fetchPreferences() {
      if (!user) {
        setPreferences(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          // PGRST116 = no rows returned (not an error for us)
          throw fetchError;
        }

        if (data) {
          setPreferences({
            habitRemindersEnabled: data.habit_reminders_enabled,
            reminderTime: data.reminder_time.substring(0, 5), // HH:MM from HH:MM:SS
            timezone: data.timezone,
          });
        } else {
          // Set defaults for new users
          setPreferences({
            habitRemindersEnabled: false,
            reminderTime: '20:00',
            timezone: getUserTimezone(),
          });
        }
      } catch (err) {
        console.error('Error fetching notification preferences:', err);
        setError(err instanceof Error ? err.message : 'Failed to load preferences');
      } finally {
        setLoading(false);
      }
    }

    void fetchPreferences();
  }, [user, setPreferences]);

  /**
   * Update notification preferences
   */
  const updatePreferences = useCallback(
    async (
      updates: Partial<{
        habitRemindersEnabled: boolean;
        reminderTime: string;
        timezone: string;
      }>
    ): Promise<boolean> => {
      if (!user) return false;

      try {
        setError(null);

        // Convert to database format
        const dbUpdates: Record<string, unknown> = {};
        if (updates.habitRemindersEnabled !== undefined) {
          dbUpdates.habit_reminders_enabled = updates.habitRemindersEnabled;
        }
        if (updates.reminderTime !== undefined) {
          dbUpdates.reminder_time = updates.reminderTime + ':00'; // Add seconds
        }
        if (updates.timezone !== undefined) {
          dbUpdates.timezone = updates.timezone;
        }

        const { error: upsertError } = await supabase.from('notification_preferences').upsert(
          {
            user_id: user.id,
            ...dbUpdates,
          },
          {
            onConflict: 'user_id',
          }
        );

        if (upsertError) throw upsertError;

        // Update local state
        if (preferences) {
          setPreferences({
            ...preferences,
            ...updates,
          });
        }

        return true;
      } catch (err) {
        console.error('Error updating notification preferences:', err);
        setError(err instanceof Error ? err.message : 'Failed to update preferences');
        return false;
      }
    },
    [user, preferences, setPreferences]
  );

  return {
    preferences,
    loading,
    error,
    updatePreferences,
  };
}

export default useNotificationPreferences;
