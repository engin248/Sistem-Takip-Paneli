// ============================================================
// NOTIFICATION SERVICE — Push Bildirim Yönetimi
// ============================================================
// Görevler:
// 1. Push bildirim izni isteme
// 2. Abonelik oluşturma / iptal etme
// 3. Yerel bildirim gönderme (test + gerçek)
// 4. Audit log entegrasyonu
// Hata Kodları: ERR-STP001-001 (genel), ERR-STP001-006 (audit)
// ============================================================

import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from '@/services/auditService';
import { getRegistration } from '@/lib/swRegister';

// ── BİLDİRİM İZİN DURUMLARI ──────────────────────────────────
export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

/**
 * Mevcut bildirim izin durumunu al.
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission as NotificationPermissionState;
}

/**
 * Bildirim izni iste.
 * @returns İzin durumu
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';

  try {
    const permission = await Notification.requestPermission();

    // Audit log — izin sonucunu kaydet
    logAudit({
      operation_type: 'SYSTEM',
      action_description: `Push bildirim izni: ${permission.toUpperCase()}`,
      metadata: {
        action_code: 'NOTIFICATION_PERMISSION',
        permission_result: permission,
        user_agent: navigator.userAgent,
      },
    }).catch(() => {
      // Audit yazma hatası — sessizce devam et
    });

    return permission as NotificationPermissionState;
  } catch (error) {
    processError(ERR.SYSTEM_GENERAL, error, {
      kaynak: 'notificationService.ts',
      islem: 'REQUEST_PERMISSION',
    });
    return 'denied';
  }
}

/**
 * Push aboneliği oluştur.
 * VAPID public key yoksa abonelik oluşturulamaz — local notification'a düşer.
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  try {
    const registration = await getRegistration();
    if (!registration) {
      console.warn('[NOTIFICATION] Service Worker kaydı bulunamadı.');
      return null;
    }

    // Mevcut aboneliği kontrol et
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      console.log('[NOTIFICATION] Mevcut push aboneliği aktif.');
      return existing;
    }

    // VAPID public key — sunucu tarafı yoksa local bildirim kullan
    // Gelecekte .env.local'e NEXT_PUBLIC_VAPID_PUBLIC_KEY eklenecek
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.warn('[NOTIFICATION] VAPID key bulunamadı — local bildirim modu aktif.');
      return null;
    }

    const keyArray = urlBase64ToUint8Array(vapidKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyArray.buffer as ArrayBuffer,
    });

    // Audit log — abonelik kaydı
    logAudit({
      operation_type: 'CREATE',
      action_description: 'Push notification aboneliği oluşturuldu',
      metadata: {
        action_code: 'PUSH_SUBSCRIBED',
        endpoint: subscription.endpoint,
      },
    }).catch(() => {});

    return subscription;
  } catch (error) {
    processError(ERR.SYSTEM_GENERAL, error, {
      kaynak: 'notificationService.ts',
      islem: 'SUBSCRIBE_PUSH',
    });
    return null;
  }
}

/**
 * Push aboneliğini iptal et.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await getRegistration();
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;

    const result = await subscription.unsubscribe();

    // Audit log — abonelik iptali
    logAudit({
      operation_type: 'DELETE',
      action_description: 'Push notification aboneliği iptal edildi',
      metadata: { action_code: 'PUSH_UNSUBSCRIBED' },
    }).catch(() => {});

    return result;
  } catch (error) {
    processError(ERR.SYSTEM_GENERAL, error, {
      kaynak: 'notificationService.ts',
      islem: 'UNSUBSCRIBE_PUSH',
    });
    return false;
  }
}

/**
 * Yerel bildirim gönder (Service Worker üzerinden).
 * Push sunucusu olmadan doğrudan cihazda gösterim.
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  options?: {
    tag?: string;
    icon?: string;
    url?: string;
  }
): Promise<boolean> {
  try {
    if (getNotificationPermission() !== 'granted') {
      console.warn('[NOTIFICATION] Bildirim izni verilmemiş.');
      return false;
    }

    const registration = await getRegistration();
    if (!registration) {
      // SW yoksa doğrudan Notification API kullan
      new Notification(title, {
        body,
        icon: options?.icon || '/icons/icon-192x192.png',
        tag: options?.tag || 'stp-local',
      });
      return true;
    }

    await registration.showNotification(title, {
      body,
      icon: options?.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: options?.tag || 'stp-local',
      data: { url: options?.url || '/' },
      requireInteraction: false,
    } as NotificationOptions);

    return true;
  } catch (error) {
    processError(ERR.SYSTEM_GENERAL, error, {
      kaynak: 'notificationService.ts',
      islem: 'SEND_LOCAL_NOTIFICATION',
    });
    return false;
  }
}

/**
 * Görev değişikliğinde bildirim gönder.
 */
export async function notifyTaskChange(
  taskTitle: string,
  action: 'created' | 'updated' | 'completed' | 'deleted'
): Promise<void> {
  const messages: Record<string, { title: string; body: string }> = {
    created:   { title: '📋 Yeni Görev', body: `"${taskTitle}" oluşturuldu.` },
    updated:   { title: '🔄 Görev Güncellendi', body: `"${taskTitle}" güncellendi.` },
    completed: { title: '✅ Görev Tamamlandı', body: `"${taskTitle}" başarıyla tamamlandı.` },
    deleted:   { title: '🗑️ Görev Silindi', body: `"${taskTitle}" silindi.` },
  };

  const msg = messages[action];
  if (msg) {
    await sendLocalNotification(msg.title, msg.body, {
      tag: `task-${action}-${Date.now()}`,
    });
  }
}

// ── YARDIMCI: VAPID key dönüştürücü ─────────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
