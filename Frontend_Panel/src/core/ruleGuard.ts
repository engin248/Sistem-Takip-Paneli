// ============================================================
// RULE GUARD — Gerçek Yanıt Denetim Sistemi
// HATA #2: Önceden her zaman { gecti: true } döndürüyordu.
// ============================================================

import { NEGATIF_KISIT, VARSAYIM_KELIMELERI } from './agentRules';

export interface DenetimSonucu {
  gecti: boolean;
  ihlaller: { kural: string; aciklama: string; seviye: 'IPTAL' | 'UYARI' }[];
  zaman: string;
}

/**
 * yanitKontrol — AI yanıtını 20 Faz Protokolüne göre denetler.
 * F-003: Negatif kısıt kelimeleri
 * D-001: Varsayım ifadeleri
 * F-011: Sıfır mediokrite
 * F-001: Boş/çok kısa yanıt (binary hedef kontrolü)
 */
export function yanitKontrol(yanit: string, katman?: string): DenetimSonucu {
  const ihlaller: DenetimSonucu['ihlaller'] = [];
  const lower = (yanit || '').toLowerCase();
  const ts = new Date().toISOString();

  // F-001: Boş veya çok kısa yanıt
  if (!yanit || yanit.trim().length < 20) {
    ihlaller.push({ kural: 'F-001', aciklama: 'Boş veya anlamsız yanıt — Binary hedef kontrolü başarısız (değer: 0)', seviye: 'IPTAL' });
    return { gecti: false, ihlaller, zaman: ts };
  }

  // D-001: Varsayım kelimeleri
  for (const kelime of VARSAYIM_KELIMELERI) {
    if (lower.includes(kelime)) {
      ihlaller.push({ kural: 'D-001', aciklama: `Varsayım ifadesi tespit edildi: "${kelime}"`, seviye: 'IPTAL' });
      break;
    }
  }

  // F-003: Negatif kısıt kelimeleri (Komutan tarafından reddedilen kavramlar)
  for (const kelime of NEGATIF_KISIT) {
    if (lower.includes(kelime)) {
      ihlaller.push({ kural: 'F-003', aciklama: `Reddedilen kavram: "${kelime}" — Zero Mediocrity ihlali`, seviye: 'IPTAL' });
      break;
    }
  }

  // F-011: Sıfır İdare Eder — bileşik ifadeler
  const f011Ifadeler = ['yeterli çözüm', 'yeterli bir', 'kabul edilebilir bir', 'makul bir çözüm', 'en iyi ihtimal'];
  for (const ifade of f011Ifadeler) {
    if (lower.includes(ifade)) {
      ihlaller.push({ kural: 'F-011', aciklama: `"Sıfır İdare Eder" ihlali: "${ifade}"`, seviye: 'IPTAL' });
      break;
    }
  }

  // Ş-003: Katman ihlalleri
  if (katman === 'KOMUTA' && (lower.includes('kodu düzenledim') || lower.includes('dosyayı değiştirdim'))) {
    ihlaller.push({ kural: 'Ş-003', aciklama: 'KOMUTA katmanı kod/dosya değiştiremez', seviye: 'IPTAL' });
  }

  const iptalVar = ihlaller.some(i => i.seviye === 'IPTAL');
  return { gecti: !iptalVar, ihlaller, zaman: ts };
}
