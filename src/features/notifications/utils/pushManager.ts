/**
 * Utilities for managing Web Push subscriptions
 */

// VAPID public key from environment variable
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

/**
 * Convert URL-safe base64 VAPID key to Uint8Array for subscription
 */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

/**
 * Check if push notifications are supported in this browser
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Check if VAPID key is configured
 */
export function isVapidConfigured(): boolean {
  return !!VAPID_PUBLIC_KEY && VAPID_PUBLIC_KEY.length > 0;
}

/**
 * Check if running as installed PWA on iOS
 */
export function isIOSPWA(): boolean {
  if (typeof window === 'undefined') return false;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone =
    'standalone' in window.navigator &&
    (window.navigator as unknown as { standalone: boolean }).standalone === true;

  return isIOS && isStandalone;
}

/**
 * Check if running on iOS (any mode)
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Get the current notification permission
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported in this browser');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Subscribe to push notifications
 * Returns the native PushSubscription object
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    throw new Error('Push notifications not supported');
  }

  if (!isVapidConfigured()) {
    throw new Error('VAPID key not configured. Set VITE_VAPID_PUBLIC_KEY in .env');
  }

  const registration = await navigator.serviceWorker.ready;

  // Check for existing subscription
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    // Create new subscription
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
    });
  }

  return subscription;
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return true;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    return await subscription.unsubscribe();
  }

  return true;
}

/**
 * Get current push subscription if any
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Extract subscription details for storage in database
 */
export function extractSubscriptionDetails(subscription: PushSubscription): {
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
} {
  const json = subscription.toJSON();
  const keys = json.keys || {};

  return {
    endpoint: json.endpoint || '',
    p256dh_key: keys.p256dh || '',
    auth_key: keys.auth || '',
  };
}

/**
 * Get a friendly device name based on user agent
 */
export function getDeviceName(): string {
  const ua = navigator.userAgent;

  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Linux/.test(ua)) return 'Linux';

  return 'Unknown Device';
}
