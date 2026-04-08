// ============================================================
// STP SERVICE WORKER — PWA + Push Notification
// ============================================================
// Görevler:
// 1. Offline cache stratejisi (App Shell)
// 2. Push notification dinleme ve gösterme
// 3. Notification click → uygulama açma
// ============================================================

const CACHE_NAME = 'stp-cache-v1';
const OFFLINE_URL = '/';

// ── Önceden cache'lenecek dosyalar (App Shell) ───────────────
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// ── INSTALL: Ön cache yükleme ───────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Beklemeden aktif ol
  self.skipWaiting();
});

// ── ACTIVATE: Eski cache temizliği ──────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Tüm istemcileri hemen kontrol altına al
  self.clients.claim();
});

// ── FETCH: Network-first, cache fallback stratejisi ─────────
self.addEventListener('fetch', (event) => {
  // API çağrılarını cache'leme — her zaman network'e git
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase')) {
    return;
  }

  // Sadece GET isteklerini cache'le
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Başarılı yanıtı cache'e yaz
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network yoksa cache'den dön
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Navigation isteğiyse offline sayfasını göster
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
          return new Response('Çevrimdışı — Bağlantı bulunamadı', {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
      })
  );
});

// ── PUSH: Bildirim alma ─────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {
    title: 'STP-OPERASYON MERKEZİ',
    body: 'Yeni bir güncelleme var.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: 'stp-notification',
    data: { url: '/' },
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch {
    // JSON parse hatası — varsayılan payload kullan
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-192x192.png',
    tag: data.tag || 'stp-notification',
    vibrate: [100, 50, 100],
    data: data.data || { url: '/' },
    actions: [
      { action: 'open', title: 'Aç' },
      { action: 'dismiss', title: 'Kapat' },
    ],
    requireInteraction: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── NOTIFICATION CLICK: Bildirime tıklama ───────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Açık sekme varsa odaklan
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Yoksa yeni pencere aç
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ── NOTIFICATION CLOSE: Bildirim kapatma izleme ─────────────
self.addEventListener('notificationclose', (event) => {
  // Kapatma olayları gelecekte audit'e yazılabilir
  console.log('[SW] Bildirim kapatıldı:', event.notification.tag);
});
