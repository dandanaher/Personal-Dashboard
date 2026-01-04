import { useState, useEffect } from 'react';
import { Bell, BellOff, Clock, AlertCircle, Check } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import { usePushSubscription } from '../hooks/usePushSubscription';
import { useNotificationPreferences } from '../hooks/useNotificationPreferences';
import { isPushSupported, isIOS, isVapidConfigured } from '../utils/pushManager';

interface NotificationSettingsProps {
  compact?: boolean;
}

export function NotificationSettings({ compact = false }: NotificationSettingsProps) {
  const accentColor = useThemeStore((state) => state.accentColor);
  const { permission, isSubscribed, subscribe, unsubscribe } = usePushSubscription();
  const { preferences, updatePreferences } = useNotificationPreferences();

  const [localTime, setLocalTime] = useState(preferences?.reminderTime || '20:00');
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Sync local time with preferences
  useEffect(() => {
    if (preferences?.reminderTime) {
      setLocalTime(preferences.reminderTime);
    }
  }, [preferences?.reminderTime]);

  // Handle toggle notifications
  const handleToggle = async () => {
    if (toggling) return;

    setToggling(true);
    try {
      if (isSubscribed) {
        // Unsubscribe
        const success = await unsubscribe();
        if (success) {
          await updatePreferences({ habitRemindersEnabled: false });
        }
      } else {
        // Subscribe
        const success = await subscribe();
        if (success) {
          await updatePreferences({ habitRemindersEnabled: true });
        }
      }
    } finally {
      setToggling(false);
    }
  };

  // Handle time change
  const handleTimeChange = async (newTime: string) => {
    setLocalTime(newTime);
    setSaving(true);
    await updatePreferences({ reminderTime: newTime });
    setSaving(false);
  };

  // Check platform support
  if (!isPushSupported() || !isVapidConfigured()) {
    // Show message for iOS users
    if (isIOS()) {
      return (
        <div className="p-3 bg-yellow-50/50 dark:bg-yellow-900/20 rounded-xl">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                iOS Notifications
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">
                Add MyDash to your Home Screen and update to iOS 16.4+ to enable notifications.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Not configured or not supported
    if (!isVapidConfigured()) {
      return null; // Silently hide if not configured
    }

    return null; // Not supported on this platform
  }

  return (
    <div className="space-y-3">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {isSubscribed ? (
            <Bell className="h-4 w-4 text-secondary-600 dark:text-secondary-400" />
          ) : (
            <BellOff className="h-4 w-4 text-secondary-400 dark:text-secondary-500" />
          )}
          <div>
            <p className="text-xs font-medium text-secondary-900 dark:text-white">
              Habit Reminders
            </p>
            {!compact && (
              <p className="text-[10px] text-secondary-500 dark:text-secondary-400">
                Remind me about habits with active streaks
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => void handleToggle()}
          disabled={toggling}
          className="relative w-10 h-6 rounded-full transition-colors duration-200 disabled:opacity-50"
          style={{ backgroundColor: isSubscribed ? accentColor : '#d1d5db' }}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 flex items-center justify-center ${
              isSubscribed ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          >
            {isSubscribed && <Check className="w-3 h-3 text-secondary-600" />}
          </div>
        </button>
      </div>

      {/* Reminder Time (only show when enabled) */}
      {isSubscribed && preferences && (
        <div className="flex items-center justify-between pl-6">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-secondary-400" />
            <span className="text-xs text-secondary-600 dark:text-secondary-400">
              Reminder Time
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="time"
              value={localTime}
              onChange={(e) => void handleTimeChange(e.target.value)}
              className="px-2 py-1 text-xs rounded-lg bg-white/50 dark:bg-white/10 border border-white/40 dark:border-white/20 text-secondary-900 dark:text-white focus:outline-none focus:ring-1"
              style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
            />
            {saving && <span className="text-[10px] text-secondary-400">Saving...</span>}
          </div>
        </div>
      )}

      {/* Permission denied message */}
      {permission === 'denied' && (
        <div className="p-2.5 bg-red-50/50 dark:bg-red-900/20 rounded-lg">
          <p className="text-xs text-red-700 dark:text-red-300">
            Notifications blocked. Enable in browser settings.
          </p>
        </div>
      )}
    </div>
  );
}

export default NotificationSettings;
