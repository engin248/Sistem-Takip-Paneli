// ============================================================
// BRIDGE SERVICE — DIŞ SİSTEM KÖPRÜSÜ (MİZANET)
// ============================================================
// STP'nin dış hedef sistemleri (cauptlsn... vb) izlemesi ve 
// durumunu takip etmesi için köprü servisi.
//
// Dış Sistem DB Tablo Yapısı:
//   b0_* — Sistem katmanı (loglar, güvenlik, telegram)
//   b1_* — İş katmanı (ARGE, ajanlar, mesajlar, uyarılar)
//   b2_* — İşlem katmanı (siparisler, stok, müşteriler)
//
// BECERİLER:
//   1. pingExternalDB     — Dış DB'ye bağlanabiliyor mu?
//   2. getSistemLoglari    — Son sistem logları
//   3. getSistemUyarilari  — Aktif uyarılar
//   4. getAjanGorevleri    — Ajan görev durumları
//   5. getUretimDurumu     — Üretim siparişleri
//   6. getStokDurumu       — Stok alarmları
//   7. getSystemSummary    — Tüm veriler tek çağrıda
//
// KISITLAMALAR:
//   - SADECE READ (SELECT) — dış DB'ye yazma YASAK
//   - env değişkenleri yoksa servis devre dışı kalır
//
// Hata Kodu: ERR-STP001-030, ERR-STP001-031
// ============================================================

import { getExternalSupabase, isExternalConfigured, getExternalConnectionInfo } from '@/lib/supabaseExternal';
import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from './auditService';

// ─── TİP TANIMLARI ──────────────────────────────────────────

export interface ExternalSystemLog {
  id: string;
  islem: string;
  detay: string | null;
  modul: string | null;
  seviye: string | null;
  created_at: string;
}

export interface ExternalAlert {
  id: string;
  baslik: string;
  icerik: string | null;
  seviye: string;
  kaynak: string | null;
  durum: string;
  created_at: string;
}

export interface ExternalAgentTask {
  id: string;
  ajan_adi: string;
  gorev_tipi: string | null;
  durum: string;
  sonuc: string | null;
  created_at: string;
}

export interface ExternalArgeTrend {
  id: string;
  urun_adi: string | null;
  kategori: string | null;
  talep_skoru: number | null;
  durum: string | null;
  created_at: string;
}

export interface BridgeStatus {
  configured: boolean;
  connected: boolean;
  projectId: string;
  latencyMs: number;
  error?: string;
}

export interface ExternalSystemSummary {
  bridge: BridgeStatus;
  sistemLoglari: ExternalSystemLog[];
  uyarilar: ExternalAlert[];
  ajanGorevleri: ExternalAgentTask[];
  argeTrendler: ExternalArgeTrend[];
  istatistikler: {
    logSayisi: number;
    acikUyari: number;
    aktifAjan: number;
    trendSayisi: number;
  };
}

// ─── YARDIMCI ───────────────────────────────────────────────

interface BaseSonuc {
  basarili: boolean;
  hata?: string;
}

// ============================================================
// 1. PING — Dış DB'ye bağlanabiliyor mu?
// ============================================================

export async function pingExternalDB(): Promise<BridgeStatus> {
  const info = getExternalConnectionInfo();
  const startTime = Date.now();

  if (!info.configured) {
    return {
      configured: false,
      connected: false,
      projectId: '',
      latencyMs: 0,
      error: 'Dış Supabase env değişkenleri tanımlı değil',
    };
  }

  const client = getExternalSupabase();
  if (!client) {
    return {
      configured: true,
      connected: false,
      projectId: info.projectId,
      latencyMs: 0,
      error: 'Dış Supabase client oluşturulamadı',
    };
  }

  try {
    // b0_sistem_loglari tablosu ile bağlantı testi
    const { error } = await client
      .from('b0_sistem_loglari')
      .select('id', { count: 'exact', head: true });

    const latencyMs = Date.now() - startTime;

    if (error) {
      // Tablo yoksa farklı tabloyu dene
      const { error: error2 } = await client
        .from('b1_arge_trendler')
        .select('id', { count: 'exact', head: true });

      const latencyMs2 = Date.now() - startTime;

      if (error2) {
        return {
          configured: true,
          connected: false,
          projectId: info.projectId,
          latencyMs: latencyMs2,
          error: `${error.message} / ${error2.message}`,
        };
      }

      return {
        configured: true,
        connected: true,
        projectId: info.projectId,
        latencyMs: latencyMs2,
      };
    }

    return {
      configured: true,
      connected: true,
      projectId: info.projectId,
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    processError(ERR.BRIDGE_CONNECTION, err, {
      kaynak: 'bridgeService.ts',
      islem: 'PING_EXTERNAL',
    });
    return {
      configured: true,
      connected: false,
      projectId: info.projectId,
      latencyMs,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ============================================================
// 2. SİSTEM LOGLARINI GETİR (b0_sistem_loglari)
// ============================================================

export async function getSistemLoglari(limit: number = 20): Promise<BaseSonuc & { loglar?: ExternalSystemLog[] }> {
  const client = getExternalSupabase();
  if (!client) return { basarili: false, hata: 'Dış bağlantı yapılandırılmamış' };

  try {
    const { data, error } = await client
      .from('b0_sistem_loglari')
      .select('id, islem, detay, modul, seviye, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      processError(ERR.BRIDGE_QUERY, error, {
        kaynak: 'bridgeService.ts', islem: 'GET_SISTEM_LOGLARI',
      });
      return { basarili: false, hata: error.message };
    }

    return { basarili: true, loglar: (data || []) as ExternalSystemLog[] };
  } catch (err) {
    processError(ERR.BRIDGE_QUERY, err, {
      kaynak: 'bridgeService.ts', islem: 'GET_SISTEM_LOGLARI',
    });
    return { basarili: false, hata: String(err) };
  }
}

// ============================================================
// 3. SİSTEM UYARILARINI GETİR (b1_sistem_uyarilari)
// ============================================================

export async function getSistemUyarilari(): Promise<BaseSonuc & { uyarilar?: ExternalAlert[] }> {
  const client = getExternalSupabase();
  if (!client) return { basarili: false, hata: 'Dış bağlantı yapılandırılmamış' };

  try {
    const { data, error } = await client
      .from('b1_sistem_uyarilari')
      .select('id, baslik, icerik, seviye, kaynak, durum, created_at')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      processError(ERR.BRIDGE_QUERY, error, {
        kaynak: 'bridgeService.ts', islem: 'GET_SISTEM_UYARILARI',
      });
      return { basarili: false, hata: error.message };
    }

    return { basarili: true, uyarilar: (data || []) as ExternalAlert[] };
  } catch (err) {
    processError(ERR.BRIDGE_QUERY, err, {
      kaynak: 'bridgeService.ts', islem: 'GET_SISTEM_UYARILARI',
    });
    return { basarili: false, hata: String(err) };
  }
}

// ============================================================
// 4. AJAN GÖREVLERİNİ GETİR (b1_ajan_gorevler)
// ============================================================

export async function getAjanGorevleri(limit: number = 20): Promise<BaseSonuc & { gorevler?: ExternalAgentTask[] }> {
  const client = getExternalSupabase();
  if (!client) return { basarili: false, hata: 'Dış bağlantı yapılandırılmamış' };

  try {
    const { data, error } = await client
      .from('b1_ajan_gorevler')
      .select('id, ajan_adi, gorev_tipi, durum, sonuc, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      processError(ERR.BRIDGE_QUERY, error, {
        kaynak: 'bridgeService.ts', islem: 'GET_AJAN_GOREVLERI',
      });
      return { basarili: false, hata: error.message };
    }

    return { basarili: true, gorevler: (data || []) as ExternalAgentTask[] };
  } catch (err) {
    processError(ERR.BRIDGE_QUERY, err, {
      kaynak: 'bridgeService.ts', islem: 'GET_AJAN_GOREVLERI',
    });
    return { basarili: false, hata: String(err) };
  }
}

// ============================================================
// 5. ARGE TRENDLERİ GETİR (b1_arge_trendler)
// ============================================================

export async function getArgeTrendler(limit: number = 15): Promise<BaseSonuc & { trendler?: ExternalArgeTrend[] }> {
  const client = getExternalSupabase();
  if (!client) return { basarili: false, hata: 'Dış bağlantı yapılandırılmamış' };

  try {
    const { data, error } = await client
      .from('b1_arge_trendler')
      .select('id, urun_adi, kategori, talep_skoru, durum, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      processError(ERR.BRIDGE_QUERY, error, {
        kaynak: 'bridgeService.ts', islem: 'GET_ARGE_TRENDLER',
      });
      return { basarili: false, hata: error.message };
    }

    return { basarili: true, trendler: (data || []) as ExternalArgeTrend[] };
  } catch (err) {
    processError(ERR.BRIDGE_QUERY, err, {
      kaynak: 'bridgeService.ts', islem: 'GET_ARGE_TRENDLER',
    });
    return { basarili: false, hata: String(err) };
  }
}

// ============================================================
// 6. GENEL DURUM ÖZETİ — TEK ÇAĞRI
// ============================================================

export async function getSystemSummary(): Promise<ExternalSystemSummary> {
  const bridge = await pingExternalDB();

  if (!bridge.connected) {
    return {
      bridge,
      sistemLoglari: [],
      uyarilar: [],
      ajanGorevleri: [],
      argeTrendler: [],
      istatistikler: { logSayisi: 0, acikUyari: 0, aktifAjan: 0, trendSayisi: 0 },
    };
  }

  // Paralel sorgular — hız için
  const [logRes, uyariRes, ajanRes, trendRes] = await Promise.all([
    getSistemLoglari(15),
    getSistemUyarilari(),
    getAjanGorevleri(15),
    getArgeTrendler(10),
  ]);

  const uyarilar = uyariRes.uyarilar || [];
  const ajanlar = ajanRes.gorevler || [];

  const summary: ExternalSystemSummary = {
    bridge,
    sistemLoglari: logRes.loglar || [],
    uyarilar,
    ajanGorevleri: ajanlar,
    argeTrendler: trendRes.trendler || [],
    istatistikler: {
      logSayisi: (logRes.loglar || []).length,
      acikUyari: uyarilar.filter(u => u.durum !== 'cozuldu').length,
      aktifAjan: ajanlar.filter(a => a.durum === 'calisıyor' || a.durum === 'bekliyor').length,
      trendSayisi: (trendRes.trendler || []).length,
    },
  };

  // Audit log — köprü sorgusu kaydı
  await logAudit({
    operation_type: 'READ',
    action_description: `Bridge Dış Sistem özet: ${summary.istatistikler.logSayisi} log, ${summary.istatistikler.acikUyari} uyarı, ${bridge.latencyMs}ms`,
    metadata: {
      action_code: 'BRIDGE_MIZANET_SUMMARY',
      latency_ms: bridge.latencyMs,
      log_count: summary.istatistikler.logSayisi,
      uyari_count: summary.istatistikler.acikUyari,
      ajan_count: summary.istatistikler.aktifAjan,
      trend_count: summary.istatistikler.trendSayisi,
    },
  }).catch(() => {});

  return summary;
}

// ============================================================
// 7. DIŞ WEB SİSTEMİ SAĞLIK KONTROLÜ (HTTP)
// ============================================================

export async function httpHealthCheck(url: string, timeoutMs: number = 10000): Promise<{
  reachable: boolean;
  statusCode: number;
  latencyMs: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'STP-Bridge/1.0' },
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    return {
      reachable: response.ok,
      statusCode: response.status,
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    return {
      reachable: false,
      statusCode: 0,
      latencyMs,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
