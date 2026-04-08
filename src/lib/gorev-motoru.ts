/**
 * GÖREV MOTORU (Task Engine)
 * Kaynak: ARGE-Arastirma/05_proje_takip_paneli.md
 *
 * Pipeline: Task Engine → Agent → Worker → Validator → DB + Log → Telegram
 *
 * Bu dosya şu işlemleri yapar:
 * - Görev oluşturma (14 alan)
 * - Görev durumu güncelleme
 * - 3 katmanlı doğrulama
 * - Kanıt kaydetme (SHA256)
 * - Log kaydetme (append-only)
 */

import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

// ─── TİP TANIMLARI ────────────────────────────────────────────
export interface Gorev {
    id: string;
    gorev_kodu: string;
    oncelik: string;
    amac: string;
    neden: string;
    kapsam: Record<string, unknown>;
    girdi: Record<string, unknown>;
    islem_tipi: string;
    beklenen_cikti: Record<string, unknown>;
    kisitlar: Record<string, unknown>;
    test_kriterleri: string[];
    risk: string | null;
    onay_noktasi: string | null;
    yapan: string;
    kontrol_eden: string | null;
    onay_modu: string;
    durum: string;
    confidence: number | null;
    katman1_execution: boolean | null;
    katman2_teknik: boolean | null;
    katman3_misyon: boolean | null;
    olusturulma: string;
    baslama: string | null;
    bitirme: string | null;
    guncelleme: string | null;
}

export interface GorevLog {
    id: string;
    gorev_id: string;
    adim: number;
    islem: string;
    sonuc: string | null;
    basarili: boolean;
    hata_mesaji: string | null;
    yapan: string;
    sure_ms: number | null;
    olusturulma: string;
}

export interface GorevKanit {
    id: string;
    gorev_id: string;
    tip: string;
    baslik: string;
    icerik: string | null;
    hash_degeri: string | null;
    dosya_yolu: string | null;
    metadata: Record<string, unknown>;
    olusturulma: string;
}

interface BaseSonuc {
    basarili: boolean;
    hata?: string;
}

// ─── GÖREV DURUMLARI ────────────────────────────────────────────
export const DURUM = {
    PENDING: 'pending',
    RUNNING: 'running',
    VALIDATION: 'validation',
    DONE: 'done',
    REJECTED: 'rejected',
} as const;

export const ONCELIK = {
    P0: 'P0', // Acil
    P1: 'P1', // Normal
    P2: 'P2', // Düşük
} as const;

export const ISLEM_TIPI = {
    CODE: 'code',
    EXEC: 'exec',
    ANALYSIS: 'analysis',
    MONITOR: 'monitor',
} as const;

// ─── 1. GÖREV OLUŞTUR ──────────────────────────────────────────
/**
 * 14 alan görev yapısı ile yeni görev oluşturur.
 * Kaynak: ARGE dosya 05, madde 5
 */
interface GorevOlusturParams {
    gorevKodu: string;
    oncelik?: string;
    amac: string;
    neden: string;
    kapsam?: Record<string, unknown>;
    girdi?: Record<string, unknown>;
    islemTipi?: string;
    beklenenCikti?: Record<string, unknown>;
    kisitlar?: Record<string, unknown>;
    testKriterleri?: string[];
    risk?: string | null;
    onayNoktasi?: string | null;
    yapan: string;
    kontrolEden?: string | null;
    onayModu?: string;
}

export async function gorevOlustur({
    gorevKodu,
    oncelik = 'P1',
    amac,
    neden,
    kapsam = {},
    girdi = {},
    islemTipi = 'code',
    beklenenCikti = {},
    kisitlar = {},
    testKriterleri = [],
    risk = null,
    onayNoktasi = null,
    yapan,
    kontrolEden = null,
    onayModu = 'hybrid',
}: GorevOlusturParams): Promise<BaseSonuc & { gorev?: Gorev }> {
    try {
        const { data, error } = await supabase
            .from('gorevler')
            .insert({
                gorev_kodu: gorevKodu,
                oncelik,
                amac,
                neden,
                kapsam,
                girdi,
                islem_tipi: islemTipi,
                beklenen_cikti: beklenenCikti,
                kisitlar,
                test_kriterleri: testKriterleri,
                risk,
                onay_noktasi: onayNoktasi,
                yapan,
                kontrol_eden: kontrolEden,
                onay_modu: onayModu,
            })
            .select()
            .single();

        if (error) throw error;

        // İlk log kaydı
        await logKaydet({
            gorevId: data.id,
            adim: 1,
            islem: 'Görev oluşturuldu',
            sonuc: `${gorevKodu} — ${amac}`,
            yapan: 'sistem',
        });

        return { basarili: true, gorev: data as Gorev };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[GÖREV MOTORU] Görev oluşturma hatası:', message);
        return { basarili: false, hata: message };
    }
}

// ─── 2. GÖREV DURUMU GÜNCELLE ───────────────────────────────────
/**
 * Görev durumunu günceller.
 * pending → running → validation → done / rejected
 */
interface DurumGuncelleParams {
    gorevId: string;
    durum: string;
    confidence?: number | null;
}

export async function gorevDurumGuncelle({ gorevId, durum, confidence = null }: DurumGuncelleParams): Promise<BaseSonuc> {
    try {
        const guncelleme: Record<string, unknown> = {
            durum,
            guncelleme: new Date().toISOString(),
        };

        if (durum === DURUM.RUNNING) {
            guncelleme.baslama = new Date().toISOString();
        }
        if (durum === DURUM.DONE || durum === DURUM.REJECTED) {
            guncelleme.bitirme = new Date().toISOString();
        }
        if (confidence !== null) {
            guncelleme.confidence = confidence;
        }

        const { error } = await supabase
            .from('gorevler')
            .update(guncelleme)
            .eq('id', gorevId);

        if (error) throw error;
        return { basarili: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { basarili: false, hata: message };
    }
}

// ─── 3. 3 KATMANLI DOĞRULAMA ───────────────────────────────────
/**
 * ARGE dosya 05, madde 6:
 * Katman 1: EXECUTION  → Kod çalıştı mı? Dosya üretildi mi?
 * Katman 2: TEKNİK     → Test geçti mi? Hata var mı?
 * Katman 3: MİSYON     → Hedef karşılandı mı? Amaç gerçekleşti mi?
 *
 * Hepsi EVET → DONE
 * 1 tanesi HAYIR → REJECTED
 */
interface DogrulamaParams {
    gorevId: string;
    katman1: boolean;
    katman2: boolean;
    katman3: boolean;
}

export async function ucKatmanDogrula({ gorevId, katman1, katman2, katman3 }: DogrulamaParams): Promise<BaseSonuc & { sonuc?: string; gectiMi?: boolean }> {
    try {
        const tumGecti = katman1 === true && katman2 === true && katman3 === true;
        const yeniDurum = tumGecti ? DURUM.DONE : DURUM.REJECTED;

        const { error } = await supabase
            .from('gorevler')
            .update({
                katman1_execution: katman1,
                katman2_teknik: katman2,
                katman3_misyon: katman3,
                durum: yeniDurum,
                bitirme: new Date().toISOString(),
                guncelleme: new Date().toISOString(),
            })
            .eq('id', gorevId);

        if (error) throw error;

        // Doğrulama log'u
        await logKaydet({
            gorevId,
            adim: 999,
            islem: '3 Katmanlı Doğrulama',
            sonuc: `K1:${katman1 ? 'GEÇTİ' : 'KALTI'} | K2:${katman2 ? 'GEÇTİ' : 'KALTI'} | K3:${katman3 ? 'GEÇTİ' : 'KALTI'} → ${yeniDurum.toUpperCase()}`,
            basarili: tumGecti,
            yapan: 'validator',
        });

        return { basarili: true, sonuc: yeniDurum, gectiMi: tumGecti };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { basarili: false, hata: message };
    }
}

// ─── 4. KANIT KAYDET ────────────────────────────────────────────
/**
 * ARGE dosya 05, madde 9:
 * - Oluşturulan dosyalar
 * - Dosya hash'leri (SHA256)
 * - İşlem logu
 * - Çalıştırılan komut çıktısı
 * - Mission doğrulama sonucu
 */
interface KanitParams {
    gorevId: string;
    tip: string;
    baslik: string;
    icerik?: string | null;
    dosyaYolu?: string | null;
    metadata?: Record<string, unknown>;
}

export async function kanitKaydet({ gorevId, tip, baslik, icerik = null, dosyaYolu = null, metadata = {} }: KanitParams): Promise<BaseSonuc & { kanit?: GorevKanit }> {
    try {
        // SHA256 hash oluştur
        let hashDegeri: string | null = null;
        if (icerik) {
            hashDegeri = crypto.createHash('sha256').update(icerik).digest('hex');
        }

        const { data, error } = await supabase
            .from('gorev_kanitlar')
            .insert({
                gorev_id: gorevId,
                tip,
                baslik,
                icerik,
                hash_degeri: hashDegeri,
                dosya_yolu: dosyaYolu,
                metadata,
            })
            .select()
            .single();

        if (error) throw error;
        return { basarili: true, kanit: data as GorevKanit };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { basarili: false, hata: message };
    }
}

// ─── 5. LOG KAYDET (Append-Only) ────────────────────────────────
/**
 * ARGE dosya 05, madde 4: "Kanıt yoksa tamamlanmadı sayılır"
 * Log silinemez, değiştirilemez — veritabanı kuralları ile korunur.
 */
interface LogParams {
    gorevId: string;
    adim: number;
    islem: string;
    sonuc?: string | null;
    basarili?: boolean;
    hataMesaji?: string | null;
    yapan: string;
    sureMs?: number | null;
}

export async function logKaydet({ gorevId, adim, islem, sonuc = null, basarili = true, hataMesaji = null, yapan, sureMs = null }: LogParams): Promise<BaseSonuc & { log?: GorevLog }> {
    try {
        const { data, error } = await supabase
            .from('gorev_loglar')
            .insert({
                gorev_id: gorevId,
                adim,
                islem,
                sonuc,
                basarili,
                hata_mesaji: hataMesaji,
                yapan,
                sure_ms: sureMs,
            })
            .select()
            .single();

        if (error) throw error;
        return { basarili: true, log: data as GorevLog };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { basarili: false, hata: message };
    }
}

// ─── 6. GÖREV SORGULAMA ─────────────────────────────────────────

interface GorevSorguParams {
    durum?: string | null;
    oncelik?: string | null;
    limit?: number;
}

export async function gorevleriGetir({ durum = null, oncelik = null, limit = 50 }: GorevSorguParams = {}): Promise<BaseSonuc & { gorevler?: Gorev[] }> {
    try {
        let sorgu = supabase
            .from('gorevler')
            .select('*')
            .order('olusturulma', { ascending: false })
            .limit(limit);

        if (durum) sorgu = sorgu.eq('durum', durum);
        if (oncelik) sorgu = sorgu.eq('oncelik', oncelik);

        const { data, error } = await sorgu;
        if (error) throw error;
        return { basarili: true, gorevler: (data || []) as Gorev[] };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { basarili: false, hata: message };
    }
}

export async function gorevDetayGetir(gorevId: string): Promise<BaseSonuc & { gorev?: Gorev; kanitlar?: GorevKanit[]; loglar?: GorevLog[] }> {
    try {
        const [gorevRes, kanitRes, logRes] = await Promise.all([
            supabase.from('gorevler').select('*').eq('id', gorevId).single(),
            supabase.from('gorev_kanitlar').select('*').eq('gorev_id', gorevId).order('olusturulma'),
            supabase.from('gorev_loglar').select('*').eq('gorev_id', gorevId).order('adim'),
        ]);

        if (gorevRes.error) throw gorevRes.error;

        return {
            basarili: true,
            gorev: gorevRes.data as Gorev,
            kanitlar: (kanitRes.data || []) as GorevKanit[],
            loglar: (logRes.data || []) as GorevLog[],
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { basarili: false, hata: message };
    }
}

// ─── 7. DASHBOARD DURUM ─────────────────────────────────────────

interface DashboardDurum {
    bekleyen: number;
    calisan: number;
    dogrulama: number;
    tamamlanan: number;
    reddedilen: number;
    toplam: number;
    sonLoglar: GorevLog[];
}

export async function dashboardDurumGetir(): Promise<BaseSonuc & { durum?: DashboardDurum }> {
    try {
        const [pendingRes, runningRes, validationRes, doneRes, rejectedRes] = await Promise.all([
            supabase.from('gorevler').select('*', { count: 'exact', head: true }).eq('durum', 'pending'),
            supabase.from('gorevler').select('*', { count: 'exact', head: true }).eq('durum', 'running'),
            supabase.from('gorevler').select('*', { count: 'exact', head: true }).eq('durum', 'validation'),
            supabase.from('gorevler').select('*', { count: 'exact', head: true }).eq('durum', 'done'),
            supabase.from('gorevler').select('*', { count: 'exact', head: true }).eq('durum', 'rejected'),
        ]);

        const sonLoglar = await supabase
            .from('gorev_loglar')
            .select('*')
            .order('olusturulma', { ascending: false })
            .limit(30);

        return {
            basarili: true,
            durum: {
                bekleyen: pendingRes.count || 0,
                calisan: runningRes.count || 0,
                dogrulama: validationRes.count || 0,
                tamamlanan: doneRes.count || 0,
                reddedilen: rejectedRes.count || 0,
                toplam: (pendingRes.count || 0) + (runningRes.count || 0) + (validationRes.count || 0) + (doneRes.count || 0) + (rejectedRes.count || 0),
                sonLoglar: (sonLoglar.data || []) as GorevLog[],
            },
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { basarili: false, hata: message };
    }
}
