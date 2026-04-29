// ============================================================
// NOTIFICATION SERVICE — Gerçek Bildirim Yönetim Katmanı
// ============================================================
// KÖK NEDEN: 124 byte iskelet, @ts-nocheck, boş fonksiyonlar.
// Neden Çıkmış: Build hatası engellenmesi için stub yazılmış.
// Etki Alanı: NotificationBell, NavBar, tüm panel bileşenleri
// Çözüm: EventBus tabanlı bildirim sistemi + yerel depolama
// ============================================================

export interface Notification {
    id: string;
    tip: 'basari' | 'hata' | 'uyari' | 'bilgi';
    baslik: string;
    mesaj: string;
    zaman: string;
    okundu: boolean;
    kaynak?: string;
}

type NotificationHandler = (notification: Notification) => void;

// Bellek içi bildirim havuzu (max 100)
const MAX_BILDIRIM = 100;
let _bildirimler: Notification[] = [];
let _subscribers: NotificationHandler[] = [];

/**
 * publishNotification — Yeni bildirim yayınlar.
 * Tüm aboneler anında haberdar edilir.
 */
export function publishNotification(
    tip: Notification['tip'],
    baslik: string,
    mesaj: string,
    kaynak?: string
): Notification {
    const bildirim: Notification = {
        id: `NTF-${Date.now()}-${Math.floor(Math.random() * 999)}`,
        tip,
        baslik,
        mesaj,
        zaman: new Date().toISOString(),
        okundu: false,
        kaynak: kaynak || 'SISTEM',
    };

    // Havuza ekle (FIFO — eski olanlar düşer)
    _bildirimler.unshift(bildirim);
    if (_bildirimler.length > MAX_BILDIRIM) {
        _bildirimler = _bildirimler.slice(0, MAX_BILDIRIM);
    }

    // Abonelere bildir
    for (const handler of _subscribers) {
        try {
            handler(bildirim);
        } catch (e) {
            console.error('[NOTIFICATION SERVICE] Abone hatası:', e);
        }
    }

    return bildirim;
}

/**
 * subscribeNotifications — Bildirimlere abone ol.
 * Unsubscribe fonksiyonu döner.
 */
export function subscribeNotifications(handler: NotificationHandler): () => void {
    _subscribers.push(handler);
    return () => {
        _subscribers = _subscribers.filter(h => h !== handler);
    };
}

/**
 * getNotifications — Tüm bildirimleri getir.
 */
export function getNotifications(sadece_okunmamis = false): Notification[] {
    if (sadece_okunmamis) {
        return _bildirimler.filter(b => !b.okundu);
    }
    return [..._bildirimler];
}

/**
 * markAsRead — Bildirimi okundu olarak işaretle.
 */
export function markAsRead(id: string): void {
    const bildirim = _bildirimler.find(b => b.id === id);
    if (bildirim) bildirim.okundu = true;
}

/**
 * markAllAsRead — Tüm bildirimleri okundu yap.
 */
export function markAllAsRead(): void {
    _bildirimler.forEach(b => { b.okundu = true; });
}

/**
 * getOkunmamisSayisi — Okunmamış bildirim sayısı.
 */
export function getOkunmamisSayisi(): number {
    return _bildirimler.filter(b => !b.okundu).length;
}

/**
 * getNotificationService — Servis nesnesini döndürür.
 */
export const getNotificationService = () => ({
    publishNotification,
    subscribeNotifications,
    getNotifications,
    markAsRead,
    markAllAsRead,
    getOkunmamisSayisi,
});
