// ============================================================
// KOMUT ZİNCİRİ SERVİSİ — TypeScript Köprüsü
// ============================================================
// JS modüllerini (GorevKabul + Dispatcher) TS/Next.js'e bağlar.
// Singleton pattern — tüm API route'lar aynı instance'ı kullanır.
// ============================================================

import path from 'path';

// JS modüllerini dinamik yükle (CommonJS)
function loadKomutZinciri() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require(path.join(process.cwd(), 'modules/komut_zinciri/komut_zinciri'));
  return new mod.KomutZinciri();
}

// Singleton
let _instance: ReturnType<typeof loadKomutZinciri> | null = null;

export function getKomutZinciri() {
  if (!_instance) {
    _instance = loadKomutZinciri();
  }
  return _instance;
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
 */
export function komutGonder(icerik: string, tip?: string, kaynak?: string): KomutSonuc {
  const zincir = getKomutZinciri();
  return zincir.komutGonder({ icerik, tip, kaynak });
}

/**
 * Yönetici onayı ver.
 */
export function onayVer(komut_id: string, onay: boolean, duzeltme?: string): OnaySonuc {
  const zincir = getKomutZinciri();
  return zincir.onayVer(komut_id, onay, duzeltme);
}

/**
 * Bekleyen komutları listele.
 */
export function bekleyenKomutlar() {
  const zincir = getKomutZinciri();
  return zincir.bekleyenler();
}

/**
 * Birleşik durum raporu.
 */
export function zincirDurumRaporu() {
  const zincir = getKomutZinciri();
  return zincir.durumRaporu();
}
