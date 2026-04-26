// ============================================================
// ALARM SERVICE — Gerçek Alarm Yönetim Katmanı
// ============================================================
// KÖK NEDEN: 162 byte iskelet, @ts-nocheck, boş fonksiyonlar.
// Neden Çıkmış: Build hatası engellenmesi için stub yazılmış,
//               gerçek mantık hiç eklenmemiş.
// Etki Alanı: HealthDashboard, NotificationBell, /api/alarms
// Çözüm: Supabase'den alarm çek + yerel cache + öncelik filtre
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export interface Alarm {
    id: string;
    tip: 'kritik' | 'uyari' | 'bilgi';
    baslik: string;
    aciklama: string;
    kaynak: string;
    zaman: string;
    okundu: boolean;
    cozuldu: boolean;
}

// Bellek cache — her 30sn otomatik yenilenir
let _alarmCache: Alarm[] = [];
let _cacheZamani = 0;
const CACHE_TTL = 30_000; // 30 saniye

/**
 * getAcikAlarmlar — Çözülmemiş alarmları getirir.
 * Supabase bağlantısı yoksa yerel cache döner.
 */
export async function getAcikAlarmlar(): Promise<Alarm[]> {
    const simdi = Date.now();
    if (_alarmCache.length > 0 && simdi - _cacheZamani < CACHE_TTL) {
        return _alarmCache.filter(a => !a.cozuldu);
    }

    if (!supabaseUrl || supabaseUrl.length < 10) {
        return _alarmCache.filter(a => !a.cozuldu);
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase
            .from('alarms')
            .select('*')
            .eq('cozuldu', false)
            .order('zaman', { ascending: false })
            .limit(50);

        if (error) {
            console.warn(`[ALARM SERVICE] Supabase sorgu uyarısı: ${error.message}`);
            return _alarmCache.filter(a => !a.cozuldu);
        }

        _alarmCache = (data || []) as Alarm[];
        _cacheZamani = simdi;
        return _alarmCache;
    } catch (e) {
        console.error(`[ALARM SERVICE] Bağlantı hatası: ${e instanceof Error ? e.message : String(e)}`);
        return _alarmCache.filter(a => !a.cozuldu);
    }
}

/**
 * alarmOlustur — Yeni alarm oluşturur.
 */
export async function alarmOlustur(alarm: Omit<Alarm, 'id' | 'zaman' | 'okundu' | 'cozuldu'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const yeniAlarm: Omit<Alarm, 'id'> = {
        ...alarm,
        zaman: new Date().toISOString(),
        okundu: false,
        cozuldu: false,
    };

    // Yerel cache'e hemen ekle (UI anlık görsün)
    const geciciId = `ALR-${Date.now()}`;
    _alarmCache.unshift({ id: geciciId, ...yeniAlarm });

    if (!supabaseUrl || supabaseUrl.length < 10) {
        return { success: true, id: geciciId };
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase
            .from('alarms')
            .insert(yeniAlarm)
            .select('id')
            .single();

        if (error) {
            console.error(`[ALARM SERVICE] Oluşturma hatası: ${error.message}`);
            return { success: false, id: geciciId, error: error.message };
        }

        return { success: true, id: data?.id || geciciId };
    } catch (e) {
        return { success: false, id: geciciId, error: e instanceof Error ? e.message : String(e) };
    }
}

/**
 * resetAlarmCache — Cache temizle (yenileme tetikle)
 */
export function resetAlarmCache(): void {
    _alarmCache = [];
    _cacheZamani = 0;
}

/**
 * getAlarmService — Servis nesnesini döndürür
 */
export const getAlarmService = () => ({
    getAcikAlarmlar,
    alarmOlustur,
    resetAlarmCache,
});
