import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

const firebaseConfig = {
  apiKey: self.__FIREBASE_CONFIG?.apiKey || '',
  authDomain: self.__FIREBASE_CONFIG?.authDomain || '',
  projectId: self.__FIREBASE_CONFIG?.projectId || '',
  storageBucket: self.__FIREBASE_CONFIG?.storageBucket || '',
  messagingSenderId: self.__FIREBASE_CONFIG?.messagingSenderId || '',
  appId: self.__FIREBASE_CONFIG?.appId || '',
};

let messaging = null;
try {
  const app = initializeApp(firebaseConfig);
  messaging = getMessaging(app);
} catch (e) {
  // Firebase messaging not available
}

if (messaging) {
  onBackgroundMessage(messaging, (payload) => {
    const notification = payload.notification || {};
    const data = payload.data || {};
    self.registration.showNotification(notification.title || 'Foundators', {
      body: notification.body || '',
      icon: notification.icon || '/icon-192.png',
      badge: '/icon-192.png',
      data,
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const data = event.notification.data || {};
  let url = '/';
  if (data.type === 'message') url = `/messages/${data.chatId || ''}`;
  else if (data.type === 'post') url = `/post/${data.postId || ''}`;
  else if (data.type === 'profile') url = `/profile/${data.userId || ''}`;
  else if (data.type === 'follow') url = `/profile/${data.userId || ''}`;
  else if (data.type === 'like') url = `/post/${data.postId || ''}`;
  else if (data.type === 'comment') url = `/post/${data.postId || ''}`;
  else url = '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
