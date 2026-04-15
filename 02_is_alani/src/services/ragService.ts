// src/services/ragService.ts
// ============================================================
// RAG SERVİSİ — KONSOLIDE_ARSIV Bilgi Tabanı
// ============================================================
// KONSOLIDE_ARSIV'deki 15 .md dosyasını kaynak olarak kullanır.
// Keyword + skor tabanlı arama — AI olmadan çalışır.
// ============================================================

import fs   from 'fs';
import path from 'path';

// ── YAPILANDIRMA ─────────────────────────────────────────────
const ARSIV_DIR = process.env.RAG_ARSIV_DIR ||
  'C:\\Users\\Esisya\\Desktop\\KONSOLIDE_ARSIV';

export interface RagDocument {
  kategori  : string;
  dosyaAdi  : string;
  boyutKB   : number;
  mevcutMu  : boolean;
}

export interface RagSonuc {
  kategori  : string;
  skor      : number;
  excerpt   : string;
  dosyaAdi  : string;
}

export interface RagYaniti {
  sorgu     : string;
  sonuclar  : RagSonuc[];
  toplamHit : number;
  kaynaklar : string[];
}

// ── ARŞİV DURUMU ─────────────────────────────────────────────
export function getArsivDurumu(): RagDocument[] {
  try {
    if (!fs.existsSync(ARSIV_DIR)) return [];
    return fs.readdirSync(ARSIV_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => {
        const fp   = path.join(ARSIV_DIR, f);
        const stat = fs.statSync(fp);
        return {
          kategori : f.replace('.md', '').replace(/^\d+_/, '').replace(/_/g, ' '),
          dosyaAdi : f,
          boyutKB  : Math.round(stat.size / 1024),
          mevcutMu : true,
        };
      });
  } catch { return []; }
}

// ── SORGU FONKSİYONU ─────────────────────────────────────────
export function ragSorgula(sorgu: string, maxSonuc = 3): RagYaniti {
  const keywords = sorgu.toLowerCase()
    .split(/\s+/)
    .filter(k => k.length > 2);

  if (keywords.length === 0 || !fs.existsSync(ARSIV_DIR)) {
    return { sorgu, sonuclar: [], toplamHit: 0, kaynaklar: [] };
  }

  const sonuclar: RagSonuc[] = [];

  const dosyalar = fs.readdirSync(ARSIV_DIR).filter(f => f.endsWith('.md'));

  for (const dosya of dosyalar) {
    const fp = path.join(ARSIV_DIR, dosya);
    let icerik = '';

    try {
      const stat = fs.statSync(fp);
      if (stat.size > 5 * 1024 * 1024) continue; // 5MB üzeri atla
      icerik = fs.readFileSync(fp, 'utf-8');
    } catch { continue; }

    const icerikLower = icerik.toLowerCase();
    let skor = 0;
    const hitler: string[] = [];

    for (const kw of keywords) {
      const count = (icerikLower.match(new RegExp(kw, 'g')) || []).length;
      skor += count;
      if (count > 0) hitler.push(kw);
    }

    if (skor === 0) continue;

    // En alakalı excerpt'i bul
    let excerpt = '';
    for (const kw of hitler.slice(0, 2)) {
      const idx = icerikLower.indexOf(kw);
      if (idx >= 0) {
        const baslangic = Math.max(0, idx - 100);
        const bitis     = Math.min(icerik.length, idx + 300);
        excerpt = icerik.slice(baslangic, bitis).replace(/#+\s*/g, '').trim();
        break;
      }
    }
    if (!excerpt) excerpt = icerik.slice(0, 300).trim();

    const kategori = dosya.replace('.md', '').replace(/^\d+_/, '').replace(/_/g, ' ');
    sonuclar.push({ kategori, skor, excerpt, dosyaAdi: dosya });
  }

  sonuclar.sort((a, b) => b.skor - a.skor);
  const enIyi = sonuclar.slice(0, maxSonuc);

  return {
    sorgu,
    sonuclar  : enIyi,
    toplamHit : sonuclar.length,
    kaynaklar : enIyi.map(s => s.kategori),
  };
}

// ── RAG + AI PROMPT OLUŞTURUCU ────────────────────────────────
export function ragContext(sorgu: string): string {
  const yanit = ragSorgula(sorgu, 3);
  if (yanit.sonuclar.length === 0) return '';

  const parcalar = yanit.sonuclar.map(s =>
    `[KAYNAK: ${s.kategori}]\n${s.excerpt}`
  ).join('\n\n---\n\n');

  return `\n\nBİLGİ TABANI BAĞLAMI (KONSOLIDE_ARSIV'den):\n${parcalar}\n\nYukarıdaki bilgileri kullanarak yanıt ver. Bilgi tabanı dışına çıkma.`;
}
