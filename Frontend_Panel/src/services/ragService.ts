// src/services/ragService.ts
// KONSOLIDE_ARSIV'deki 15 .md dosyasını kaynak olarak kullanır.

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
  // VERCEL ÜZERİNDE LOKAL C:\\ ERİŞİMİ YOK VE BUNDLE PATLATIYOR.
  return [];
}

// ── SORGU FONKSİYONU ─────────────────────────────────────────
export function ragSorgula(sorgu: string, maxSonuc = 3): RagYaniti {
  return { sorgu, sonuclar: [], toplamHit: 0, kaynaklar: [] };
}

// ── RAG + AI PROMPT OLUŞTURUCU ────────────────────────────────
export function ragContext(sorgu: string): string {
  return '';
}
