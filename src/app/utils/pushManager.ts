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
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications not supported on this browser');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission denied by user');
  }

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (sub) {
    await syncSubscriptionWithBackend(sub);
    return sub;
  }

  const { publicKey } = await apiFetch('/push-subscriptions/vapid-public-key');
  if (!publicKey) {
    throw new Error('VAPID public key not found');
  }

  const convertedVapidKey = urlBase64ToUint8Array(publicKey);

  sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedVapidKey
  });

  await syncSubscriptionWithBackend(sub);
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
