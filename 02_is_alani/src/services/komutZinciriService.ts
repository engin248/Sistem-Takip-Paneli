// ============================================================
// KOMUT ZİNCİRİ SERVİSİ — TypeScript Köprüsü
// ============================================================
// JS modüllerini (GorevKabul + Dispatcher) TS/Next.js'e bağlar.
// Singleton pattern — tüm API route'lar aynı instance'ı kullanır.
//
// K-1 DÜZELTME (2026-04-19):
//   Turbopack, statik require(path.join(...)) ifadesini build
//   zamanında çözümlemeye çalışıyor ve başarısız oluyor.
//   Çözüm: createRequire (node:module) ile güvenli modül yükleme +
//   null safety ile graceful degradation.
// ============================================================

import path from 'path';
import { createRequire } from 'node:module';

// ── CommonJS modül yükleyici ────────────────────────────────
// createRequire (node:module) — Node.js resmi API'si.
// ESM/Turbopack bağlamında güvenli CommonJS require oluşturur.
// eval('require') güvenlik riski taşıdığı için kaldırıldı.
// ─────────────────────────────────────────────────────────────
function loadKomutZinciri(): unknown | null {
  try {
    const modulePath = [process.cwd(), 'modules', 'komut_zinciri', 'komut_zinciri'].join('/');
    const safeRequire = createRequire(import.meta.url);
    const mod = safeRequire(/*webpackIgnore: true*/ /*turbopackIgnore: true*/ modulePath);
    return new mod.KomutZinciri();
  } catch (err) {
    console.warn(
      '[KomutZinciri] Modül yüklenemedi — graceful degradation aktif:',
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

// Singleton — null olabilir (modül yüklenemezse)
let _instance: ReturnType<typeof loadKomutZinciri> = null;
let _loadAttempted = false;

// ── Dahili KomutZinciri arayüzü (JS modülü ile eşleşir) ───
interface IKomutZinciri {
  komutGonder(komut: { icerik: string; tip?: string; kaynak?: string }): KomutSonuc;
  onayVer(komut_id: string, onay: boolean, duzeltme?: string): OnaySonuc;
  bekleyenler(): unknown[];
  durumRaporu(): Record<string, unknown>;
}

function getKomutZinciri(): IKomutZinciri | null {
  if (!_loadAttempted) {
    _loadAttempted = true;
    _instance = loadKomutZinciri();
  }
  return _instance as IKomutZinciri | null;
}

// ── Tip tanımları (TS güvenliği için) ────────────────────

export interface KomutSonuc {
  basarili: boolean;
  komut_id?: string;
  anlasilan?: string;
  ham_komut?: string;
  niyet?: string;
  alan?: string;
  durum?: string;
  onay_gerekli?: boolean;
  guven?: {
    skor: number;
    otomatik_onay: boolean;
    onay_sayisi: number;
    red_sayisi: number;
    aciklama: string;
  };
  hata?: string;
}

export interface OnaySonuc {
  basarili: boolean;
  durum?: string;
  komut_id?: string;
  hata?: string;
  gorev_id?: string;
  icra_ajan?: string;
}

/**
 * Panel'den komut gönder → GorevKabul → algıla + sentezle.
 * Modül yüklenemezse hata döner, API route'u kırmaz.
 */
export function komutGonder(icerik: string, tip?: string, kaynak?: string): KomutSonuc {
  const zincir = getKomutZinciri();
  if (!zincir) {
    return { basarili: false, hata: 'KomutZinciri modülü yüklenemedi (graceful degradation)' };
  }
  return zincir.komutGonder({ icerik, tip, kaynak });
}

/**
 * Yönetici onayı ver.
 */
export function onayVer(komut_id: string, onay: boolean, duzeltme?: string): OnaySonuc {
  const zincir = getKomutZinciri();
  if (!zincir) {
    return { basarili: false, hata: 'KomutZinciri modülü yüklenemedi' };
  }
  return zincir.onayVer(komut_id, onay, duzeltme);
}

/**
 * Bekleyen komutları listele.
 */
export function bekleyenKomutlar(): unknown[] {
  const zincir = getKomutZinciri();
  if (!zincir) return [];
  return zincir.bekleyenler();
}

/**
 * Birleşik durum raporu.
 */
export function zincirDurumRaporu(): Record<string, unknown> {
  const zincir = getKomutZinciri();
  if (!zincir) {
    return {
      kabul: null,
      dispatcher: null,
      zincir_durumu: 'MODUL_YUKLENEMEDI',
      hata: 'KomutZinciri modülü yüklenemedi — modules/ dizini kontrol edin',
    };
  }
  return zincir.durumRaporu();
}
