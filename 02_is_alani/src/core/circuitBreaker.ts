// src/core/circuitBreaker.ts
// ============================================================
// CIRCUIT BREAKER — OLLAMA HATA KORUMASI
// ============================================================
// Ollama 3 kez başarısız → devre açılır → OpenAI'ya düşer
// 30sn sonra yarı açık → test → başarılıysa kapanır
// Serverless uyumu: Durum Supabase'de persist edilir.
// ============================================================

import { supabase } from '@/lib/supabase';

type State = 'KAPALI' | 'ACIK' | 'YARI_ACIK';

interface CBDurum {
  state          : State;
  hata_sayisi    : number;
  son_hata       : number | null;  // timestamp
  toplam_trip    : number;
  toplam_basari  : number;
}

// ── YAPILANDIRMA ─────────────────────────────────────────────
const ESIK        = 3;           // Kaç hatada açılır
const BEKLEME_MS  = 30_000;      // Açık kalma süresi (ms)
const BASKI_LOG   = true;        // Console log
const CB_MODULE   = 'ollama_cb'; // DB kayıt adı

// ── GLOBAL DURUM (in-memory + DB persist) ────────────────────
let durum: CBDurum = {
  state        : 'KAPALI',
  hata_sayisi  : 0,
  son_hata     : null,
  toplam_trip  : 0,
  toplam_basari: 0,
};

let _loaded = false;

// DB'den durumu yükle (serverless cold start'ta bir kez çalışır)
async function loadFromDB(): Promise<void> {
  if (_loaded) return;
  try {
    const { data } = await supabase
      .from('circuit_breaker_state')
      .select('*')
      .eq('module', CB_MODULE)
      .maybeSingle();
    if (data?.state_json) {
      durum = { ...durum, ...(data.state_json as CBDurum) };
    }
  } catch { /* DB erişilemezse in-memory devam */ }
  _loaded = true;
}

// Durumu DB'ye kaydet (fire-and-forget)
function saveToDB(): void {
  supabase.from('circuit_breaker_state').upsert({
    module:     CB_MODULE,
    state_json: durum,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'module' }).then(() => {}, () => {});
}

function log(msg: string) {
  if (BASKI_LOG) console.log(`[CIRCUIT-BREAKER] ${new Date().toISOString()} ${msg}`);
}

// ── DURUM GETİR ──────────────────────────────────────────────
export function getCBDurum(): CBDurum & { sure_kaldi_ms: number } {
  const sureKaldi = durum.state === 'ACIK' && durum.son_hata
    ? Math.max(0, BEKLEME_MS - (Date.now() - durum.son_hata))
    : 0;
  return { ...durum, sure_kaldi_ms: sureKaldi };
}

// ── İZİN VER Mİ? ─────────────────────────────────────────────
export async function izinVarMi(): Promise<boolean> {
  await loadFromDB();
  if (durum.state === 'KAPALI') return true;

  if (durum.state === 'ACIK') {
    // Bekleme süresi bittiyse yarı açık
    if (durum.son_hata && Date.now() - durum.son_hata >= BEKLEME_MS) {
      durum.state = 'YARI_ACIK';
      log('YARI_ACIK — test isteğine izin verildi');
      saveToDB();
      return true;
    }
    return false;
  }

  // YARI_ACIK → test isteğine izin ver
  return true;
}

// ── BAŞARI KAYDET ─────────────────────────────────────────────
export function basariKaydet(): void {
  durum.toplam_basari++;
  if (durum.state === 'YARI_ACIK') {
    durum.state       = 'KAPALI';
    durum.hata_sayisi = 0;
    durum.son_hata    = null;
    log('KAPALI — devre onarıldı');
  }
  saveToDB();
}

// ── HATA KAYDET ──────────────────────────────────────────────
export function hataKaydet(): void {
  durum.hata_sayisi++;
  durum.son_hata = Date.now();

  if (durum.state === 'YARI_ACIK') {
    durum.state = 'ACIK';
    durum.toplam_trip++;
    log(`ACIK — yarı açıkta hata, tekrar açıldı`);
    saveToDB();
    return;
  }

  if (durum.hata_sayisi >= ESIK) {
    durum.state = 'ACIK';
    durum.toplam_trip++;
    log(`ACIK — ${ESIK} hatada devre açıldı (toplam trip: ${durum.toplam_trip})`);
  }
  saveToDB();
}

// ── SIFIRLA ──────────────────────────────────────────────────
export function sifirla(): void {
  durum.state       = 'KAPALI';
  durum.hata_sayisi = 0;
  durum.son_hata    = null;
  log('SIFIRLANDIII — manuel reset');
  saveToDB();
}

// ── SARICI FONKSİYON ─────────────────────────────────────────
export async function cbSarici<T>(
  fn          : () => Promise<T>,
  fallback   ?: () => Promise<T>,
): Promise<T> {
  if (!await izinVarMi()) {
    const d = getCBDurum();
    log(`ENGELLENDI — devre açık (${Math.round(d.sure_kaldi_ms/1000)}sn kaldı)`);
    if (fallback) {
      log('Fallback çalıştırılıyor...');
      return await fallback();
    }
    throw new Error(`Circuit breaker açık — ${Math.round(d.sure_kaldi_ms/1000)}sn bekle`);
  }

  try {
    const sonuc = await fn();
    basariKaydet();
    return sonuc;
  } catch (err) {
    hataKaydet();
    log(`Hata yakalandı: ${err instanceof Error ? err.message : String(err)}`);
    if (fallback) {
      log('Fallback çalıştırılıyor...');
      return await fallback();
    }
    throw err;
  }
}
