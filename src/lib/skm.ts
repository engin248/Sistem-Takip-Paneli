/**
 * SİSTEM KOMUTA MERKEZİ (SKM) — BACKEND KÜTÜPHANESİ
 * ═══════════════════════════════════════════════════
 * Tüm modüller bu kütüphaneyi kullanarak:
 * 1. Olay kaydeder (immutable)
 * 2. Çift kontrol başlatır
 * 3. Alarm gönderir
 * 
 * Tarih: 4 Nisan 2026
 */

import { supabase } from '@/lib/supabase';

// ─── TİP TANIMLARI ────────────────────────────────────────────
export interface SkmOlay {
    id: string;
    olay_tipi: string;
    olay_aciklama: string;
    modul: string;
    tablo_adi: string | null;
    kayit_id: string | null;
    kullanici_id: string | null;
    kullanici_adi: string;
    kullanici_rol: string | null;
    onceki_deger: Record<string, unknown> | null;
    yeni_deger: Record<string, unknown> | null;
    metadata: Record<string, unknown>;
    seviye: string;
    olusturulma: string;
}

export interface SkmAlarm {
    id: string;
    baslik: string;
    aciklama: string;
    seviye: string;
    modul: string;
    durum: string;
    kaynak_olay_id: string | null;
    kaynak_sistem: string | null;
    tekrar_sayisi: number;
    son_tekrar: string | null;
    cozen_adi: string | null;
    cozum_notu: string | null;
    cozum_zaman: string | null;
    olusturulma: string;
}

export interface SkmCiftKontrol {
    id: string;
    olay_id: string;
    yapan_sistem: string;
    yapan_sonuc: Record<string, unknown>;
    kontrol_sistem: string | null;
    kontrol_sonuc: Record<string, unknown> | null;
    kontrol_zaman: string | null;
    sonuc: string;
    uyusmazlik_notu: string | null;
    olusturulma: string;
}

interface BaseSonuc {
    basarili: boolean;
    hata?: string;
}

// ─── SEVİYELER ────────────────────────────────────────────────
export const SEVIYE = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARNING: 'WARNING',
    CRITICAL: 'CRITICAL',
    EMERGENCY: 'EMERGENCY',
} as const;

export const OLAY_TIPI = {
    INSERT: 'INSERT',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    LOGIN: 'LOGIN',
    KARAR: 'KARAR',
    HATA: 'HATA',
    ALARM: 'ALARM',
    KONTROL: 'KONTROL',
} as const;

export const CIFT_KONTROL_SONUC = {
    BEKLIYOR: 'BEKLIYOR',
    ONAY: 'ONAY',
    RED: 'RED',
    ZAMAN_ASIMI: 'ZAMAN_ASIMI',
} as const;

export const ALARM_DURUM = {
    ACIK: 'ACIK',
    GORULDU: 'GORULDU',
    MUDAHALE: 'MUDAHALE',
    COZULDU: 'COZULDU',
    KAPANDI: 'KAPANDI',
} as const;

// ─── 1. OLAY KAYDET (Immutable Event Store) ────────────────────
/**
 * Sisteme olay kaydeder. Kaydedilen olay silinemez, değiştirilemez.
 * Hash zinciri otomatik oluşturulur (trigger ile).
 * 
 * @param params - Olay parametreleri
 * @returns Başarı durumu ve oluşturulan olay
 */
interface OlayKaydetParams {
    olayTipi: string;
    aciklama: string;
    modul: string;
    tabloAdi?: string | null;
    kayitId?: string | null;
    kullaniciId?: string | null;
    kullaniciAdi: string;
    kullaniciRol?: string | null;
    oncekiDeger?: Record<string, unknown> | null;
    yeniDeger?: Record<string, unknown> | null;
    metadata?: Record<string, unknown>;
    seviye?: string;
}

export async function olayKaydet({
    olayTipi,
    aciklama,
    modul,
    tabloAdi = null,
    kayitId = null,
    kullaniciId = null,
    kullaniciAdi,
    kullaniciRol = null,
    oncekiDeger = null,
    yeniDeger = null,
    metadata = {},
    seviye = SEVIYE.INFO,
}: OlayKaydetParams): Promise<BaseSonuc & { olay?: SkmOlay }> {
    try {
        const { data, error } = await supabase
            .from('skm_olaylar')
            .insert({
                olay_tipi: olayTipi,
                olay_aciklama: aciklama,
                modul,
                tablo_adi: tabloAdi,
                kayit_id: kayitId,
                kullanici_id: kullaniciId,
                kullanici_adi: kullaniciAdi,
                kullanici_rol: kullaniciRol,
                onceki_deger: oncekiDeger,
                yeni_deger: yeniDeger,
                metadata: {
                    ...metadata,
                    zaman_damgasi: new Date().toISOString(),
                    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
                },
                seviye,
            })
            .select()
            .single();

        if (error) throw error;

        return { basarili: true, olay: data as SkmOlay };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[SKM] Olay kayıt hatası:', message);
        return { basarili: false, hata: message };
    }
}

// ─── 2. ÇİFT KONTROL BAŞLAT ────────────────────────────────────
/**
 * Bir işlem için çift kontrol kaydı oluşturur.
 * Yapan tarafın sonucu kaydedilir, kontrol eden taraf sonra dolduracak.
 */
interface CiftKontrolBaslatParams {
    olayId: string;
    yapanSistem: string;
    yapanSonuc: Record<string, unknown>;
}

export async function ciftKontrolBaslat({ olayId, yapanSistem, yapanSonuc }: CiftKontrolBaslatParams): Promise<BaseSonuc & { kontrol?: SkmCiftKontrol }> {
    try {
        const { data, error } = await supabase
            .from('skm_cift_kontrol')
            .insert({
                olay_id: olayId,
                yapan_sistem: yapanSistem,
                yapan_sonuc: yapanSonuc,
                sonuc: CIFT_KONTROL_SONUC.BEKLIYOR,
            })
            .select()
            .single();

        if (error) throw error;

        return { basarili: true, kontrol: data as SkmCiftKontrol };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[SKM] Çift kontrol başlatma hatası:', message);
        return { basarili: false, hata: message };
    }
}

/**
 * Çift kontrolü tamamlar — kontrol eden tarafın sonucunu kaydeder.
 * Yapan ile kontrol eden sonuçları karşılaştırılır.
 */
interface CiftKontrolTamamlaParams {
    kontrolId: string;
    kontrolSistem: string;
    kontrolSonuc: Record<string, unknown>;
}

export async function ciftKontrolTamamla({ kontrolId, kontrolSistem, kontrolSonuc }: CiftKontrolTamamlaParams): Promise<BaseSonuc & { sonuc?: string }> {
    try {
        // Mevcut kaydı oku
        const { data: mevcut, error: okuHata } = await supabase
            .from('skm_cift_kontrol')
            .select('*')
            .eq('id', kontrolId)
            .single();

        if (okuHata) throw okuHata;

        // Yapan ve kontrol eden sonuçlarını karşılaştır
        const eslesme = JSON.stringify(mevcut.yapan_sonuc) === JSON.stringify(kontrolSonuc);
        const karar = eslesme ? CIFT_KONTROL_SONUC.ONAY : CIFT_KONTROL_SONUC.RED;

        // Güncelle
        const { error: guncelleHata } = await supabase
            .from('skm_cift_kontrol')
            .update({
                kontrol_sistem: kontrolSistem,
                kontrol_sonuc: kontrolSonuc,
                kontrol_zaman: new Date().toISOString(),
                sonuc: karar,
                uyusmazlik_notu: eslesme ? null : 'Yapan ve kontrol eden sonuçları uyuşmuyor',
            })
            .eq('id', kontrolId);

        if (guncelleHata) throw guncelleHata;

        // RED durumunda alarm oluştur
        if (karar === CIFT_KONTROL_SONUC.RED) {
            await alarmOlustur({
                baslik: 'ÇİFT KONTROL UYUŞMAZLIĞI',
                aciklama: `Yapan: ${mevcut.yapan_sistem} / Kontrol: ${kontrolSistem} — sonuçlar uyuşmadı`,
                seviye: SEVIYE.CRITICAL,
                modul: 'skm',
                kaynakOlayId: mevcut.olay_id,
                kaynakSistem: 'cift_kontrol_motoru',
            });
        }

        return { basarili: true, sonuc: karar };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[SKM] Çift kontrol tamamlama hatası:', message);
        return { basarili: false, hata: message };
    }
}

// ─── 3. ALARM OLUŞTUR ────────────────────────────────────────────
/**
 * Alarm oluşturur. Tekrar eden alarmlar sayacı artırır.
 * 3 tekrar → seviye EMERGENCY'ye yükselir (Kural #49).
 */
interface AlarmOlusturParams {
    baslik: string;
    aciklama: string;
    seviye?: string;
    modul: string;
    kaynakOlayId?: string | null;
    kaynakSistem?: string | null;
}

export async function alarmOlustur({
    baslik,
    aciklama,
    seviye = SEVIYE.WARNING,
    modul,
    kaynakOlayId = null,
    kaynakSistem = null,
}: AlarmOlusturParams): Promise<BaseSonuc & { alarm?: Partial<SkmAlarm> & { tekrar?: number } }> {
    try {
        // Aynı modül + başlıkta açık alarm var mı kontrol et (tekrar tespiti)
        const { data: mevcutAlarm } = await supabase
            .from('skm_alarmlar')
            .select('id, tekrar_sayisi')
            .eq('modul', modul)
            .eq('baslik', baslik)
            .in('durum', ['ACIK', 'GORULDU', 'MUDAHALE'])
            .order('olusturulma', { ascending: false })
            .limit(1)
            .single();

        if (mevcutAlarm) {
            // Tekrar — sayacı artır
            const yeniTekrar = (mevcutAlarm.tekrar_sayisi || 1) + 1;
            const yeniSeviye = yeniTekrar >= 3 ? SEVIYE.EMERGENCY : seviye;

            await supabase
                .from('skm_alarmlar')
                .update({
                    tekrar_sayisi: yeniTekrar,
                    son_tekrar: new Date().toISOString(),
                    seviye: yeniSeviye,
                    aciklama: yeniTekrar >= 3
                        ? `⛔ 3+ TEKRAR — SİSTEM DURDURULMALI | ${aciklama}`
                        : aciklama,
                })
                .eq('id', mevcutAlarm.id);

            return { basarili: true, alarm: { id: mevcutAlarm.id, tekrar: yeniTekrar } };
        }

        // Yeni alarm oluştur
        const { data, error } = await supabase
            .from('skm_alarmlar')
            .insert({
                baslik,
                aciklama,
                seviye,
                modul,
                kaynak_olay_id: kaynakOlayId,
                kaynak_sistem: kaynakSistem,
            })
            .select()
            .single();

        if (error) throw error;

        return { basarili: true, alarm: data as SkmAlarm };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[SKM] Alarm oluşturma hatası:', message);
        return { basarili: false, hata: message };
    }
}

// ─── 4. ALARM GÜNCELLE ────────────────────────────────────────────
/**
 * Alarm durumunu günceller.
 */
interface AlarmGuncelleParams {
    alarmId: string;
    durum: string;
    cozenAdi?: string | null;
    cozumNotu?: string | null;
}

export async function alarmGuncelle({ alarmId, durum, cozenAdi = null, cozumNotu = null }: AlarmGuncelleParams): Promise<BaseSonuc> {
    try {
        const guncelleme: Record<string, unknown> = { durum };
        if (cozenAdi) {
            guncelleme.cozen_adi = cozenAdi;
            guncelleme.cozum_notu = cozumNotu;
            guncelleme.cozum_zaman = new Date().toISOString();
        }

        const { error } = await supabase
            .from('skm_alarmlar')
            .update(guncelleme)
            .eq('id', alarmId);

        if (error) throw error;
        return { basarili: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { basarili: false, hata: message };
    }
}

// ─── 5. SKM DURUM SORGULAMA ──────────────────────────────────────
/**
 * SKM dashboard için anlık durum verisi döndürür.
 */
interface KontrolSayilari {
    toplam: number;
    onay: number;
    red: number;
    bekliyor: number;
}

interface SkmDurum {
    bugunOlaylar: number;
    acikAlarmlar: SkmAlarm[];
    kontrolSayilari: KontrolSayilari;
    sonOlaylar: SkmOlay[];
    sistemSagligi: 'SAGLIKLI' | 'KRITIK';
}

export async function skmDurumGetir(): Promise<BaseSonuc & { durum?: SkmDurum }> {
    try {
        const simdi = new Date();
        const bugünBaslangic = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate()).toISOString();

        // Bugünkü olaylar
        const { count: bugunOlaylar } = await supabase
            .from('skm_olaylar')
            .select('*', { count: 'exact', head: true })
            .gte('olusturulma', bugünBaslangic);

        // Açık alarmlar
        const { data: acikAlarmlar } = await supabase
            .from('skm_alarmlar')
            .select('*')
            .in('durum', ['ACIK', 'GORULDU', 'MUDAHALE'])
            .order('seviye', { ascending: false })
            .order('olusturulma', { ascending: false });

        // Bugünkü çift kontroller
        const { data: bugunKontroller } = await supabase
            .from('skm_cift_kontrol')
            .select('sonuc')
            .gte('olusturulma', bugünBaslangic);

        const kontrolSayilari: KontrolSayilari = {
            toplam: bugunKontroller?.length || 0,
            onay: bugunKontroller?.filter((k: { sonuc: string }) => k.sonuc === 'ONAY').length || 0,
            red: bugunKontroller?.filter((k: { sonuc: string }) => k.sonuc === 'RED').length || 0,
            bekliyor: bugunKontroller?.filter((k: { sonuc: string }) => k.sonuc === 'BEKLIYOR').length || 0,
        };

        // Son 20 olay
        const { data: sonOlaylar } = await supabase
            .from('skm_olaylar')
            .select('*')
            .order('olusturulma', { ascending: false })
            .limit(20);

        return {
            basarili: true,
            durum: {
                bugunOlaylar: bugunOlaylar || 0,
                acikAlarmlar: (acikAlarmlar || []) as SkmAlarm[],
                kontrolSayilari,
                sonOlaylar: (sonOlaylar || []) as SkmOlay[],
                sistemSagligi: (acikAlarmlar?.filter((a: { seviye: string }) => a.seviye === 'EMERGENCY').length || 0) === 0
                    ? 'SAGLIKLI' : 'KRITIK',
            },
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { basarili: false, hata: message };
    }
}
