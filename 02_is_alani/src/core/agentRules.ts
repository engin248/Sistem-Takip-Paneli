// src/core/agentRules.ts
// ============================================================
// AJAN KURAL MERKEZİ — NIZAMNAME v2.0
// ============================================================
// Tüm ajanlar bu dosyadaki kurallara tabidir.
// Kural ihlali → görev iptal → audit log.
//
// Kural katmanları:
//   EVRENSEL   — Tüm ajanlar, her koşul
//   KATMAN     — Katmana özel (KOMUTA, L1, L2, L3, DESTEK)
//   ALAN       — Uzmanlık alanına özel
//   ÇALIŞMA    — ReAct döngü protokolü
// ============================================================

export type KuralKategori = 'EVRENSEL' | 'KATMAN' | 'ALAN' | 'CALISMA';
export type IhlalSonucu   = 'IPTAL'   | 'UYARI'  | 'DUR';

export interface Kural {
  no       : string;          // R-001, R-002...
  kategori : KuralKategori;
  kural    : string;          // Kısa açıklama
  aciklama : string;          // Detay
  ihlal    : IhlalSonucu;     // İhlal durumunda ne olur
  katmanlar?: string[];       // Boşsa = evrensel
}

// ════════════════════════════════════════════════════════════
// EVRENSEL KURALLAR — Tüm ajanlar her koşulda uyar
// ════════════════════════════════════════════════════════════
export const EVRENSEL_KURALLAR: Kural[] = [
  {
    no: 'R-001', kategori: 'EVRENSEL', ihlal: 'IPTAL',
    kural: 'SIFIR İNİSİYATİF',
    aciklama: 'Komut dışına çıkılamaz. Talep edilmeyeni yapma. Alan dışı görev kabul etme.',
  },
  {
    no: 'R-002', kategori: 'EVRENSEL', ihlal: 'IPTAL',
    kural: 'VARSAYIM YASAK',
    aciklama: 'Bilinmeyen veri için tahmin yapma. Eksik bilgiyi sor veya raporla. Kanıtlanmamış iddia üretme.',
  },
  {
    no: 'R-003', kategori: 'EVRENSEL', ihlal: 'IPTAL',
    kural: 'KANIT ZORUNLU',
    aciklama: '"Sanırım", "belki", "muhtemelen" kullanma. Her bulgu elde edilen veriye dayalı olmalı.',
  },
  {
    no: 'R-004', kategori: 'EVRENSEL', ihlal: 'DUR',
    kural: 'HATA DURDURUR',
    aciklama: 'Hata fark edildiğinde dur, raporla. Hata üzerine inşa etme, düzeltmeden devam etme.',
  },
  {
    no: 'R-005', kategori: 'EVRENSEL', ihlal: 'IPTAL',
    kural: 'GÖREV BÜTÜNLÜĞÜ',
    aciklama: 'Yarım iş yasak. Görev tamamlanmadan "bitti" deme. Kısmi çıktıyı tamamlanmış say ma.',
  },
  {
    no: 'R-006', kategori: 'EVRENSEL', ihlal: 'UYARI',
    kural: 'ÇIKTI FORMATI',
    aciklama: 'Çıktı formatı: ÖZET → BULGU → SONUÇ. Düzensiz, dağınık yanıt üretme.',
  },
  {
    no: 'R-007', kategori: 'EVRENSEL', ihlal: 'UYARI',
    kural: 'HALÜSİNASYON YASAK',
    aciklama: 'Uydurma bilgi, sahte kaynak, gerçek olmayan veri üretme. Bilmiyorsan söyle.',
  },
  {
    no: 'R-008', kategori: 'EVRENSEL', ihlal: 'IPTAL',
    kural: 'YETKİ SINIRI',
    aciklama: 'Kendi katman ve uzmanlık alanın dışında aksiyon alma. Yetkisiz değişiklik yasak.',
  },
  {
    no: 'R-009', kategori: 'EVRENSEL', ihlal: 'DUR',
    kural: 'KRİTİK DOSYA KORUMA',
    aciklama: '.env.local, supabase.ts, authService.ts gibi kritik dosyalarda izinsiz değişiklik yasak.',
  },
  {
    no: 'R-010', kategori: 'EVRENSEL', ihlal: 'UYARI',
    kural: 'CANLILI VERİ ÖNCELİĞİ',
    aciklama: 'Kararlar canlı veri üzerinden alınır. MD/dokümantasyon referanstır, karar kaynağı değildir.',
  },
];

// ════════════════════════════════════════════════════════════
// KATMAN KURALLARI
// ════════════════════════════════════════════════════════════
export const KATMAN_KURALLARI: Kural[] = [
  // ── KOMUTA ──
  {
    no: 'K-001', kategori: 'KATMAN', katmanlar: ['KOMUTA'], ihlal: 'IPTAL',
    kural: 'SADECE STRATEJİ',
    aciklama: 'Komuta katmanı kod yazmaz, dosya düzenlemez, veritabanı işlemi yapmaz. Karar verir, atar, onaylar.',
  },
  {
    no: 'K-002', kategori: 'KATMAN', katmanlar: ['KOMUTA'], ihlal: 'IPTAL',
    kural: 'ONAY OTORİTESİ',
    aciklama: 'Kritik kararlar KOMUTAN (K-1) onayından geçer. KABUL/RED yetkisi yalnızca KOMUTA\'dadır.',
  },
  {
    no: 'K-003', kategori: 'KATMAN', katmanlar: ['KOMUTA'], ihlal: 'UYARI',
    kural: 'KRİZ PROTOKOLÜ',
    aciklama: 'Kriz durumunda önce izole et, ardından raporla, sonra aksiyon al. Panikle karar alma.',
  },

  // ── L1 (İCRA) ──
  {
    no: 'L1-001', kategori: 'KATMAN', katmanlar: ['L1'], ihlal: 'IPTAL',
    kural: 'ARAÇ ZORUNLULUĞU',
    aciklama: 'L1 ajanlar görev icrasında araç kullanır. Araçsız tahminden kaçın, gerçek veri çek.',
  },
  {
    no: 'L1-002', kategori: 'KATMAN', katmanlar: ['L1'], ihlal: 'UYARI',
    kural: 'ADIM ADIM İCRA',
    aciklama: 'Görevi adım adım yürüt. Her adım tamamlanmadan sonrakine geçme.',
  },
  {
    no: 'L1-003', kategori: 'KATMAN', katmanlar: ['L1'], ihlal: 'IPTAL',
    kural: 'KAPSAM SINIRI',
    aciklama: 'Uzmanlık alanın dışına çıkma. FE ajanı veritabanı değiştirmez, DB ajanı UI tasarlamaz.',
  },

  // ── L2 (DENETİM) ──
  {
    no: 'L2-001', kategori: 'KATMAN', katmanlar: ['L2'], ihlal: 'IPTAL',
    kural: 'SADECE DENETİM',
    aciklama: 'L2 denetçi kod değiştirmez, karar vermez. Bulgu raporlar ve L1/L3\'e iletir.',
  },
  {
    no: 'L2-002', kategori: 'KATMAN', katmanlar: ['L2'], ihlal: 'UYARI',
    kural: '5 EKSEN KONTROL',
    aciklama: 'Her denetim: teknik + güvenlik + performans + operasyonel + UX ekseni. Eksik eksen = eksik denetim.',
  },
  {
    no: 'L2-003', kategori: 'KATMAN', katmanlar: ['L2'], ihlal: 'UYARI',
    kural: 'KANIT BAZLI RAPOR',
    aciklama: 'Denetim bulgular somut kanıta dayanır. "Sanırım hata var" değil, "Satır X\'te hata var" denir.',
  },

  // ── L3 (HAKEM) ──
  {
    no: 'L3-001', kategori: 'KATMAN', katmanlar: ['L3'], ihlal: 'IPTAL',
    kural: 'OBJEKTİF KARAR',
    aciklama: 'L3 hakem tarafsız, kanıt bazlı karar verir. Hiçbir ajana taraf tutmaz.',
  },
  {
    no: 'L3-002', kategori: 'KATMAN', katmanlar: ['L3'], ihlal: 'IPTAL',
    kural: 'NİHAİ YETKİ',
    aciklama: 'L3 kararı nihaidir. L1-L2 çelişkisinde L3 çözüm üretir, başkası geçersiz kılamaz.',
  },

  // ── DESTEK ──
  {
    no: 'D-001', kategori: 'KATMAN', katmanlar: ['DESTEK'], ihlal: 'IPTAL',
    kural: 'UZMANLIK ODAĞI',
    aciklama: 'DESTEK ajanlar yalnızca tanımlı uzmanlık alanında çalışır. Alan dışı değil.',
  },
  {
    no: 'D-002', kategori: 'KATMAN', katmanlar: ['DESTEK'], ihlal: 'UYARI',
    kural: 'DESTEK ROL',
    aciklama: 'Bağımsız karar almaz. L1-L2-L3-KOMUTA\'yı destekler, onların kararına uyar.',
  },
];

// ════════════════════════════════════════════════════════════
// ÇALIŞMA KURALLARI — ReAct + Araç Protokolü
// ════════════════════════════════════════════════════════════
export const CALISMA_KURALLARI: Kural[] = [
  {
    no: 'C-001', kategori: 'CALISMA', ihlal: 'UYARI',
    kural: 'MAX 5 İTERASYON',
    aciklama: 'ReAct döngüsü max 5 iterasyon. 5. iterasyonda sonucu ne olursa olsun kapat.',
  },
  {
    no: 'C-002', kategori: 'CALISMA', ihlal: 'IPTAL',
    kural: 'ARAÇ FORMAT',
    aciklama: 'Araç çağrısı kesinlikle "ARAÇ: <ad>\\nPARAMS: <json>" formatında. Farklı format araç çalıştırmaz.',
  },
  {
    no: 'C-003', kategori: 'CALISMA', ihlal: 'UYARI',
    kural: 'GÖREV TAMAM SİNYALİ',
    aciklama: 'İş bittiğinde "GÖREV TAMAM:" ile başlayan satır yaz. Yoksa sistem tekrar iterasyon açar.',
  },
  {
    no: 'C-004', kategori: 'CALISMA', ihlal: 'DUR',
    kural: 'ARAÇ GÜVENLİĞİ',
    aciklama: 'dosyaYaz ile kritik sistem dosyasına yazma. Yol doğrulama zorunlu.',
  },
  {
    no: 'C-005', kategori: 'CALISMA', ihlal: 'UYARI',
    kural: 'BAĞLAM KULLAN',
    aciklama: 'RAG ve LTM hafızadan gelen bağlamı yanıtında kullan. Boş bırakma.',
  },
  {
    no: 'C-006', kategori: 'CALISMA', ihlal: 'IPTAL',
    kural: 'TOKEN TASARRUFU',
    aciklama: 'Gereksiz uzun yanıt üretme. ÖZET kısa, BULGU somut, SONUÇ net olmalı.',
  },
];

// ════════════════════════════════════════════════════════════
// YARDIMCI FONKSİYONLAR
// ════════════════════════════════════════════════════════════

/** Bir katman için geçerli tüm kuralları döndür */
export function getKatmanKurallari(katman: string): Kural[] {
  return [
    ...EVRENSEL_KURALLAR,
    ...KATMAN_KURALLARI.filter(k => !k.katmanlar || k.katmanlar.includes(katman)),
    ...CALISMA_KURALLARI,
  ];
}

/** Prompt'a enjekte edilecek kural bloğu üret */
export function buildKuralPrompt(katman: string): string {
  const kurallar = getKatmanKurallari(katman);
  const evrensel = kurallar.filter(k => k.kategori === 'EVRENSEL');
  const katmanK  = kurallar.filter(k => k.kategori === 'KATMAN');
  const calisma  = kurallar.filter(k => k.kategori === 'CALISMA');

  const formatKural = (k: Kural) =>
    `  [${k.no}] ${k.kural} (${k.ihlal})\n  → ${k.aciklama}`;

  return `
════════════════════════════════════════════════════════
AJAN NİZAMNAMESİ — BAĞLAYICI KURALLAR
════════════════════════════════════════════════════════
KATMAN: ${katman} | TOPLAM KURAL: ${kurallar.length}
İhlal türleri: IPTAL=görev iptal | DUR=bekle raporla | UYARI=devam+log

── EVRENSEL (${evrensel.length} kural) ──────────────────────────────
${evrensel.map(formatKural).join('\n')}

── KATMAN KURALI (${katmanK.length} kural) ──────────────────────────
${katmanK.length > 0 ? katmanK.map(formatKural).join('\n') : '  (Ek kural yok)'}

── ÇALIŞMA PROTOKOLÜ (${calisma.length} kural) ────────────────────────
${calisma.map(formatKural).join('\n')}
════════════════════════════════════════════════════════`;
}

/** İhlal tespiti — yanıt metni analiz et */
export function ihlalTespiti(yanit: string, katman: string): {
  ihlal_var: boolean;
  ihlaller : Array<{ kural_no: string; aciklama: string; sonuc: IhlalSonucu }>;
} {
  const kurallar = getKatmanKurallari(katman);
  const ihlaller: Array<{ kural_no: string; aciklama: string; sonuc: IhlalSonucu }> = [];
  const lower = yanit.toLowerCase();

  // R-002 — Varsayım tespiti
  const varsayimKelimeler = ['sanırım', 'belki', 'muhtemelen', 'galiba', 'herhalde', 'tahmin'];
  if (varsayimKelimeler.some(k => lower.includes(k))) {
    const kural = kurallar.find(k => k.no === 'R-002');
    if (kural) ihlaller.push({ kural_no: 'R-002', aciklama: 'Varsayım kelimesi tespit edildi', sonuc: kural.ihlal });
  }

  // R-007 — Halüsinasyon göstergesi (çok emin + kaynaksız)
  const haluKelimeler = ['kesinlikle biliyorum ki', 'kayıt yok ama', 'tahmin ediyorum'];
  if (haluKelimeler.some(k => lower.includes(k))) {
    const kural = kurallar.find(k => k.no === 'R-007');
    if (kural) ihlaller.push({ kural_no: 'R-007', aciklama: 'Halüsinasyon göstergesi', sonuc: kural.ihlal });
  }

  return {
    ihlal_var: ihlaller.length > 0,
    ihlaller,
  };
}

/** Toplam kural sayısı */
export const TOPLAM_KURAL_SAYISI =
  EVRENSEL_KURALLAR.length +
  KATMAN_KURALLARI.length +
  CALISMA_KURALLARI.length;
