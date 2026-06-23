import { apiFetch } from './api';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
  return null;
}

export async function syncAuthTokenToCache(token: string | null) {
  if ('caches' in window) {
    try {
      const cache = await caches.open('auth');
      if (token) {
        await cache.put('token', new Response(token));
        console.log('JWT Token synchronized to service worker cache.');
      } else {
        await cache.delete('token');
        console.log('JWT Token cleared from service worker cache.');
      }
    } catch (error) {
      console.error('Failed to sync auth token to cache:', error);
    }
  }
}

export async function getPushSubscriptionState(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch (err) {
    console.error('Failed to get push subscription:', err);
    return null;
  }
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  console.log('[PushManager] subscribeToPush starting...');
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.error('[PushManager] Push or serviceWorker missing in window/navigator');
    throw new Error('Push notifications not supported on this browser');
  }

  console.log('[PushManager] Requesting permission...');
  const permission = await Notification.requestPermission();
  console.log('[PushManager] Permission status:', permission);
  if (permission !== 'granted') {
    throw new Error('Notification permission denied by user');
  }

  console.log('[PushManager] Waiting for service worker to be ready...');
  const reg = await navigator.serviceWorker.ready;
  console.log('[PushManager] Service worker ready. Scope:', reg.scope);

  console.log('[PushManager] Getting existing push subscription...');
  let sub = await reg.pushManager.getSubscription();
  if (sub) {
    console.log('[PushManager] Existing subscription found:', sub.endpoint);
    await syncSubscriptionWithBackend(sub);
    return sub;
  }

  console.log('[PushManager] Fetching VAPID public key...');
  const { publicKey } = await apiFetch('/push-subscriptions/vapid-public-key');
  console.log('[PushManager] VAPID public key fetched:', publicKey);
  if (!publicKey) {
    throw new Error('VAPID public key not found');
  }

  const convertedVapidKey = urlBase64ToUint8Array(publicKey);

  console.log('[PushManager] Subscribing to push service...');
  sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedVapidKey
  });
  console.log('[PushManager] Subscription successful:', sub.endpoint);

  console.log('[PushManager] Syncing subscription with backend...');
  await syncSubscriptionWithBackend(sub);
  console.log('[PushManager] Sync complete.');
  return sub;
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  
  if (sub) {
    try {
      await apiFetch('/push-subscriptions/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ endpoint: sub.endpoint })
      });
    } catch (e) {
      console.error('Failed to delete subscription on backend', e);
    }
    return await sub.unsubscribe();
  }
  
  return false;
}

async function syncSubscriptionWithBackend(sub: PushSubscription) {
  const rawSub = sub.toJSON();
  if (!rawSub.endpoint || !rawSub.keys?.p256dh || !rawSub.keys?.auth) {
    throw new Error('Invalid push subscription structure');
  }

  const userAgent = navigator.userAgent;
  let deviceName = 'Browser';
  if (/android/i.test(userAgent)) deviceName = 'Android Device';
  else if (/ipad|iphone|ipod/i.test(userAgent)) deviceName = 'iOS Device';
  else if (/macintosh/i.test(userAgent)) deviceName = 'Macintosh';
  else if (/windows/i.test(userAgent)) deviceName = 'Windows PC';
  else if (/linux/i.test(userAgent)) deviceName = 'Linux PC';

  await apiFetch('/push-subscriptions/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: rawSub.endpoint,
      keys: {
        p256dh: rawSub.keys.p256dh,
        auth: rawSub.keys.auth
      },
      deviceName
    })
  });
}

export async function initializePushNotifications() {
  if (typeof window === 'undefined') return;

  // 1. Register Service Worker first
  await registerServiceWorker();

  // 2. Check token. If no token is active, skip push subscription syncing
  const token = localStorage.getItem('token');
  if (!token) return;

  // 3. Cache the token for the service worker
  await syncAuthTokenToCache(token);

  // 4. Handle notification subscription permissions
  if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
    try {
      if (Notification.permission === 'granted') {
        // Silently ensure subscription is registered in backend
        try {
          await subscribeToPush();
          console.log('[PushManager] Automatically verified push subscription.');
        } catch (e) {
          console.error('[PushManager] Silent auto-subscribe failed:', e);
        }
      }
    } catch (err) {
      console.error('[PushManager] Push status check failed:', err);
    }
  }
}

