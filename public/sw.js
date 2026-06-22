self.addEventListener('push', function (event) {
  console.log('[Service Worker] Push Received.');
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Trineo Stream Alert',
        body: event.data.text()
      };
    }
  }

  const title = data.title || 'Trineo Stream Alert';
  const options = {
    body: data.body || 'You have a new notification.',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: {
      url: data.url || '/student',
      notificationId: data.notificationId
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(async () => {
      if (data.notificationId) {
        try {
          const cache = await caches.open('auth');
          const tokenRes = await cache.match('token');
          const token = tokenRes ? await tokenRes.text() : null;

          const headers = { 'Content-Type': 'application/json' };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          await fetch('/api/push-subscriptions/track-delivery', {
            method: 'POST',
            headers,
            body: JSON.stringify({ notificationId: data.notificationId })
          });
        } catch (err) {
          console.error('[Service Worker] Failed to track delivery', err);
        }
      }
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  console.log('[Service Worker] Notification click Received.');
  const notification = event.notification;
  notification.close();

  const urlToOpen = notification.data?.url || '/student';
  const notificationId = notification.data?.notificationId;

  event.waitUntil(
    (async () => {
      if (notificationId) {
        try {
          const cache = await caches.open('auth');
          const tokenRes = await cache.match('token');
          const token = tokenRes ? await tokenRes.text() : null;

          const headers = { 'Content-Type': 'application/json' };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          await fetch('/api/push-subscriptions/track-click', {
            method: 'POST',
            headers,
            body: JSON.stringify({ notificationId })
          });
        } catch (err) {
          console.error('[Service Worker] Failed to track click', err);
        }
      }

      const clientsList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientsList) {
        if (client.url.includes(location.origin) && 'focus' in client) {
          if (client.navigate) {
            try {
              await client.navigate(urlToOpen);
            } catch (e) {
              console.error('[Service Worker] Failed to navigate client', e);
            }
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })()
  );
});
