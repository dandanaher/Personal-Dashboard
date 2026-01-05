/**
 * Service Worker Push Event Handler
 * This file is imported by the Workbox-generated service worker
 */

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);

  // Default notification data
  let data = {
    title: "Log today's habits",
    body: "Don't forget to log your habits!",
    icon: '/MyDash/pwa-192x192.png',
    badge: '/MyDash/pwa-192x192.png',
    tag: 'habit-reminder',
    data: {
      url: '/MyDash/habits',
    },
  };

  // Parse push data if available
  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        ...data,
        ...payload,
      };
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
      // Try as text
      try {
        data.body = event.data.text();
      } catch (e2) {
        console.error('[SW] Error parsing push data as text:', e2);
      }
    }
  }

  // Show notification
  const promiseChain = self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    requireInteraction: false,
    vibrate: [100, 50, 100],
    actions: [
      {
        action: 'open',
        title: 'Log Habits',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  });

  event.waitUntil(promiseChain);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Get the URL to open
  const urlToOpen = event.notification.data?.url || '/MyDash/habits';

  // Focus existing window or open new one
  const promiseChain = self.clients
    .matchAll({
      type: 'window',
      includeUncontrolled: true,
    })
    .then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes('/MyDash') && 'focus' in client) {
          client.focus();
          // Navigate to the habits page
          if ('navigate' in client) {
            client.navigate(urlToOpen);
          }
          return;
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    });

  event.waitUntil(promiseChain);
});

// Handle push subscription change (browser refreshed keys)
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed');

  // The subscription has changed, we need to re-subscribe
  // This is handled by the app when it loads, so we just log it
  console.log('[SW] Subscription change detected - app will re-subscribe on next load');
});

console.log('[SW] Push handler loaded');
