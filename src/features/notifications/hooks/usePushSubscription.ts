import { useCallback, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { supabase } from '@/lib/supabase';
import {
  isPushSupported,
  isVapidConfigured,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  extractSubscriptionDetails,
  getCurrentSubscription,
  getDeviceName,
} from '../utils/pushManager';

export function usePushSubscription() {
  const { user } = useAuthStore();
  const { permission, isSubscribed, setPermission, setSubscribed, setLoading, setError } =
    useNotificationStore();

  // Check subscription status on mount and when user changes
  useEffect(() => {
    async function checkStatus() {
      if (!user || !isPushSupported()) return;

      // Update permission state
      setPermission(getNotificationPermission());

      // Check if we have an active subscription
      const subscription = await getCurrentSubscription();
      setSubscribed(!!subscription);
    }

    void checkStatus();
  }, [user, setPermission, setSubscribed]);

  /**
   * Request permission and subscribe to push notifications
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setError('Must be logged in to enable notifications');
      return false;
    }

    if (!isPushSupported()) {
      setError('Push notifications not supported in this browser');
      return false;
    }

    if (!isVapidConfigured()) {
      setError('Push notifications not configured');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Request permission
      const newPermission = await requestNotificationPermission();
      setPermission(newPermission);

      if (newPermission !== 'granted') {
        setError('Notification permission denied');
        return false;
      }

      // Subscribe to push
      const subscription = await subscribeToPush();
      if (!subscription) {
        throw new Error('Failed to create push subscription');
      }

      // Extract and save to database
      const details = extractSubscriptionDetails(subscription);

      const { error: dbError } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: details.endpoint,
          p256dh_key: details.p256dh_key,
          auth_key: details.auth_key,
          device_name: getDeviceName(),
          user_agent: navigator.userAgent,
        },
        {
          onConflict: 'user_id,endpoint',
        }
      );

      if (dbError) throw dbError;

      setSubscribed(true);
      return true;
    } catch (err) {
      console.error('Push subscription error:', err);
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, setPermission, setSubscribed, setLoading, setError]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setLoading(true);
    setError(null);

    try {
      const subscription = await getCurrentSubscription();

      if (subscription) {
        // Remove from database
        const details = extractSubscriptionDetails(subscription);
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', details.endpoint);

        // Unsubscribe locally
        await unsubscribeFromPush();
      }

      setSubscribed(false);
      return true;
    } catch (err) {
      console.error('Push unsubscribe error:', err);
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, setSubscribed, setLoading, setError]);

  return {
    isPushSupported: isPushSupported() && isVapidConfigured(),
    permission,
    isSubscribed,
    subscribe,
    unsubscribe,
  };
}

export default usePushSubscription;
