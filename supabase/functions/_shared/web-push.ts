/**
 * Web Push notification utilities for Supabase Edge Functions
 *
 * Uses the web-push library via esm.sh for Deno compatibility
 */

// Import web-push from esm.sh (Deno-compatible)
import webpush from 'https://esm.sh/web-push@3.6.7';

interface PushSubscriptionData {
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

// Get VAPID keys from environment
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@mydash.app';

// Configure web-push with VAPID keys
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

/**
 * Check if VAPID keys are configured
 */
export function isConfigured(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

/**
 * Send a push notification to a subscription
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: NotificationPayload
): Promise<{ success: boolean; error?: string; statusCode?: number }> {
  if (!isConfigured()) {
    return {
      success: false,
      error: 'VAPID keys not configured',
    };
  }

  try {
    // Convert our subscription format to web-push format
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key,
      },
    };

    // Send the notification
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload), {
      TTL: 86400, // 24 hours
    });

    return { success: true };
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };

    // Handle subscription expiry
    if (err.statusCode === 404 || err.statusCode === 410) {
      return {
        success: false,
        error: 'Subscription expired',
        statusCode: err.statusCode,
      };
    }

    console.error('Push notification error:', error);
    return {
      success: false,
      error: err.message || 'Unknown error',
      statusCode: err.statusCode,
    };
  }
}
