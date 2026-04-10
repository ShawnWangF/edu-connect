// HKEIU EduConnect Service Worker
// 版本号：每次更新时修改此值以触发更新
const SW_VERSION = 'v1.0.0';
const CACHE_NAME = `hkeiu-cache-${SW_VERSION}`;

// 安装事件：预缓存关键资源
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker', SW_VERSION);
  self.skipWaiting();
});

// 激活事件：清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker', SW_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 推送通知事件：接收并显示通知
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = {
    title: 'HKEIU 通知',
    body: '您有新的消息',
    url: '/',
    timestamp: Date.now(),
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    console.error('[SW] Failed to parse push data:', e);
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: `hkeiu-${data.timestamp}`,
    data: { url: data.url },
    requireInteraction: false,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: '查看詳情' },
      { action: 'dismiss', title: '關閉' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 通知点击事件：点击通知后打开对应页面
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 如果已有打开的窗口，聚焦并导航
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(url);
          }
          return;
        }
      }
      // 否则打开新窗口
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// 后台同步（可选）
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
});
