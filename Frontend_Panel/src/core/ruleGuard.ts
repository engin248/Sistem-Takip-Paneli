// src/core/ruleGuard.ts
// ============================================================
// KURAL GÜVENCE KATMANI — TOKEN HARCAMAZ, KOD ZORLAR
// ============================================================
// AI'ya söylemek değil — kod tarafında engel koy.
// AI çağrısından ÖNCE çalışır. İhlal varsa görev hiç başlamaz.
//
// Sorumluluk: agentWorker.ts → runAgentWorker() içinde
// AI prompt'una kural koymak KALDIRILDI — bu dosya yeterli.
// ============================================================

import path from 'path';
import { auditLog } from '@/core/localAudit';

// ── YASAKLI EYLEMLER — KatmAN BAZLI ──────────────────────────
const KATMAN_YASAKLARI: Record<string, {
  yasak_araclar: string[];
  yasak_kelimeler: string[];
  aciklama: string;
}> = {
  KOMUTA: {
    yasak_araclar   : ['dosyaYaz', 'dosyaOku'],
    yasak_kelimeler : ['kodu düzenle', 'dosyayı değiştir', 'veritabanına yaz'],
    aciklama: 'KOMUTA kod yazmaz, dosya düzenlemez (K-001)',
  },
  L2: {
    yasak_araclar   : ['dosyaYaz'],
    yasak_kelimeler : ['kodu değiştir', 'düzelttim', 'güncelledim'],
    aciklama: 'L2 denetçi kod değiştirmez (L2-003)',
  },
  L3: {
    yasak_araclar   : ['dosyaYaz'],
    yasak_kelimeler : [],
    aciklama: 'L3 hakem doğrudan icra yapmaz (L3-002)',
  },
};

// ── KORUNAN DOSYA YOLLARI ─────────────────────────────────────
const KORUNAN_DOSYALAR = [
  '.env.local', '.env', '.env.production',
  'supabase.ts', 'authService.ts', 'middleware.ts',
  'next.config', 'package.json', 'tsconfig.json',
];

// ── GUARD SONUCU ──────────────────────────────────────────────
export interface GuardSonuc {
  gecti    : boolean;
  kural_no : string;
  aciklama : string;
  eylem    : 'ENGELLE' | 'UYAR' | 'GECIR';
}

// ── GÖREV METNİ ÖN KONTROL ────────────────────────────────────
export function gorevOnKontrol(
  agent_id : string,
  katman   : string,
  gorev    : string,
): GuardSonuc {
  const lower = gorev.toLowerCase();

  // 1. Min uzunluk
  if (gorev.trim().length < 5) {
    return { gecti: false, kural_no: 'T-005', aciklama: 'Görev metni çok kısa — en az 5 karakter', eylem: 'ENGELLE' };
  }

  // 2. Katman yasak kelime
  const kYasak = KATMAN_YASAKLARI[katman];
  if (kYasak) {
    for (const kelime of kYasak.yasak_kelimeler) {
      if (lower.includes(kelime)) {
        auditLog(agent_id, 'RULE_GUARD_BLOCK', {
          kural_no: 'K-001/L2-003', katman, kelime, gorev: gorev.slice(0, 80),
        });
        return {
          gecti: false,
          kural_no: 'K-001',
          aciklama: `${kYasak.aciklama} — yasak ifade: "${kelime}"`,
          eylem: 'ENGELLE',
        };
      }
    }
  }

  // 3. Korunan dosya hedefi
  for (const koruma of KORUNAN_DOSYALAR) {
    if (lower.includes(koruma)) {
      auditLog(agent_id, 'RULE_GUARD_BLOCK', {
        kural_no: 'G-001', katman, dosya: koruma, gorev: gorev.slice(0, 80),
      });
      return {
        gecti: false,
        kural_no: 'G-001',
        aciklama: `Korunan dosya hedeflendi: ${koruma} — izin yok`,
        eylem: 'ENGELLE',
      };
    }
  }

  return { gecti: true, kural_no: '', aciklama: 'Ön kontrol geçildi', eylem: 'GECIR' };
}

// ── ARAÇ ÇAĞRISI KONTROL ─────────────────────────────────────
export function aracKontrol(
  agent_id : string,
  katman   : string,
  arac     : string,
  params   : Record<string, unknown>,
): GuardSonuc {
  const kYasak = KATMAN_YASAKLARI[katman];

  // Katman yasak araç
  if (kYasak?.yasak_araclar.includes(arac)) {
    auditLog(agent_id, 'RULE_GUARD_BLOCK', {
      kural_no: 'K-001', katman, arac,
    });
    return {
      gecti: false,
      kural_no: 'T-009',
      aciklama: `${katman} katmanı "${arac}" aracını kullanamaz`,
      eylem: 'ENGELLE',
    };
  }

  // dosyaYaz → korunan dosya kontrolü
  if (arac === 'dosyaYaz') {
    const yol = String(params['yol'] ?? '');
    const dosyaAdi = path.basename(yol);
    for (const koruma of KORUNAN_DOSYALAR) {
      if (dosyaAdi.startsWith(koruma) || yol.includes(koruma)) {
        auditLog(agent_id, 'RULE_GUARD_BLOCK', {
          kural_no: 'G-001', katman, arac, yol, koruma,
        });
        return {
          gecti: false,
          kural_no: 'G-001',
          aciklama: `Korunan dosyaya yazma engellendi: ${dosyaAdi}`,
          eylem: 'ENGELLE',
        };
      }
    }
  }

  // dosyaOku → izin kontrolü (tüm katmanlar okuyabilir ama log)
  if (arac === 'dosyaOku') {
    const yol = String(params['yol'] ?? '');
    if (yol.includes('.env')) {
      auditLog(agent_id, 'RULE_GUARD_WARN', {
        kural_no: 'G-005', katman, arac, yol,
      });
      return {
        gecti: false,
        kural_no: 'G-005',
        aciklama: `.env dosyası okunamaz — gizli bilgi`,
        eylem: 'ENGELLE',
      };
    }
    // Normal dosya okuma — geç ama logla
    auditLog(agent_id, 'DOSYA_OKU', { yol });
  }

  return { gecti: true, kural_no: '', aciklama: 'Araç kontrolü geçildi', eylem: 'GECIR' };
}

// ── YANIT SONRASI KONTROL ────────────────────────────────────
export function yanitKontrol(
  agent_id : string,
  katman   : string,
  yanit    : string,
): GuardSonuc {
  const lower = yanit.toLowerCase();

  // Varsayım/tahmin tespiti (T-002)
  const varsayimlar = ['sanırım', 'belki', 'muhtemelen', 'galiba', 'herhalde', 'tahmin ediyorum'];
  const bulunan = varsayimlar.find(k => lower.includes(k));
  if (bulunan) {
    auditLog(agent_id, 'RULE_GUARD_VIOLATION', {
      kural_no: 'T-002', kelime: bulunan, katman,
    });
    return {
      gecti: false,
      kural_no: 'T-002',
      aciklama: `Varsayım ifadesi tespit edildi: "${bulunan}" — VARSAYIM YASAK`,
      eylem: 'ENGELLE',
    };
  }

  // Halüsinasyon (A-003)
  const halusin = ['emin değilim ama yine de', 'kaynağım yok ama'];
  if (halusin.some(k => lower.includes(k))) {
    auditLog(agent_id, 'RULE_GUARD_VIOLATION', { kural_no: 'A-003', katman });
    return {
      gecti: true,  // UYAR ama engelleme
      kural_no: 'A-003',
      aciklama: 'Halüsinasyon göstergesi — UYARI kaydedildi',
      eylem: 'UYAR',
    };
  }

  return { gecti: true, kural_no: '', aciklama: 'Yanıt kontrolü geçildi', eylem: 'GECIR' };
}
