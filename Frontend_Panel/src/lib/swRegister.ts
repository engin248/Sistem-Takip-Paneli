// ============================================================
// SERVICE WORKER KAYIT MODÜLÜ
// ============================================================
// Uygulama yüklendiğinde Service Worker'ı kaydeder.
// Hata Kodu: ERR-Sistem Takip Paneli001-001 (SYSTEM_GENERAL — SW kayıt hatası)
// Doktrin: processError ile merkezi hata yönetimi
// ============================================================

import { ERR, processError } from '@/lib/errorCore';

/**
 * Service Worker'ı kaydet.
 * Yalnızca tarayıcıda ('serviceWorker' in navigator) çalışır.
 * @returns ServiceWorkerRegistration veya null
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW] Bu tarayıcı Service Worker desteklemiyor.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    // Güncelleme kontrolü
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            console.log('[SW] Yeni versiyon aktif — sayfa yenilenebilir.');
          }
        });
      }
    });

    console.log('[SW] Kayıt başarılı — scope:', registration.scope);
    return registration;
  } catch (error) {
    processError(ERR.SYSTEM_GENERAL, error, {
      kaynak: 'swRegister.ts',
      islem: 'REGISTER',
      detay: 'Service Worker kayıt hatası'
    });
    return null;
  }
}

/**
 * Mevcut Service Worker kaydını döndür.
 */
export async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;

  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}
