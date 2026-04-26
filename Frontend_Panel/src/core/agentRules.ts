// ============================================================
// AGENT RULES — Kural Listesi + Prompt Enjeksiyonu
// HATA #3: Önceden buildKuralPrompt boş string döndürüyordu.
//          Hiçbir AI çağrısına kural enjekte edilmiyordu.
// ============================================================

// F-003: Komutan tarafından reddedilen kavramlar
export const NEGATIF_KISIT: string[] = [
  'minimum', 'yeterli', 'yeterince', 'kabul edilebilir',
  'makul', 'ortalama', 'idare eder', 'en iyi ihtimal',
  'optimal olmasa da', 'tatmin edici',
];

// D-001: Varsayım/tahmin ifadeleri
export const VARSAYIM_KELIMELERI: string[] = [
  'sanırım', 'belki', 'muhtemelen', 'galiba',
  'herhalde', 'tahmin ediyorum', 'sanki', 'emin değilim',
];

// 20 Faz Protokolü — kural özetleri (AI prompt'a enjekte edilir)
const FAZ_KURALLARI: Record<string, string> = {
  'F-001': 'HEDEF SABITLEME: Her çıktı "Ana Hedefe (%100 Doğru Yapmak) hizmet ediyor mu?" sorusuna binary 1/0 yanıt verir.',
  'F-002': 'VEKİL İKAMESİ KORUMASI: Yardımcı araçlar (hız, üslup) ana hedefin parametrelerini değiştiremez.',
  'F-003': 'NEGATİF KISIT: Şu kavramlar yasaktır: minimum, yeterli, makul, idare eder, kabul edilebilir, tatmin edici.',
  'F-004': 'HALÜSİNASYON YASAĞI: Bilinmeyen bilgi uydurulmaz. Belirsizlik "VERİ HATTI KESİK" ile raporlanır.',
  'F-005': 'VARSAYIM YASAĞI: Eksik veri varsa dur, soru sor — tahminle devam etme.',
  'F-006': 'SIFIR İNİSİYATİF: Komut dışına çıkılamaz, yorum yapılamaz.',
  'F-007': 'KANIT ZORUNLULUĞU: Her işlem sonrası ne yapıldı, nerede, çıktı ne, kanıt ne raporlanır.',
  'F-008': 'GÖREV BÜTÜNLÜĞÜ: Parça iş yasak. Görev eksiksiz tamamlanmadan "bitti" denemez.',
  'F-009': 'BEŞ FİLTRE: Doğrudanlık → Varsayım → Negatif Kısıt → Sıfır Mediokrite → Binary Hedef.',
  'F-010': 'TUTARLILIK: Çelişkili çıktı üretilemez. Her adım öncekiyle uyumlu olmalı.',
  'F-011': 'SIFIR İDARE EDER: "Yeterli çözüm" yasak. Ya tam doğru ya VERİ HATTI KESİK.',
  'F-020': 'DİNAMİK KISIT: Kullanıcıdan gelen her yeni kural, sistemin işletim yasasına gerçek zamanlı eklenir.',
};

/**
 * buildKuralPrompt — Belirtilen fazlar için AI ayarı hazırlar.
 * HATA #3 DÜZELTİLDİ: Artık gerçek kural metni döndürülür.
 * @param katman Ajan katmanı (KOMUTA, L1, L2...)
 * @param fazlar Dahil edilecek faz kodları (boşsa tümü)
 */
export function buildKuralPrompt(katman: string, fazlar?: string[]): string {
  const secili = fazlar
    ? Object.entries(FAZ_KURALLARI).filter(([k]) => fazlar.includes(k))
    : Object.entries(FAZ_KURALLARI);

  const kuralMetni = secili
    .map(([kod, aciklama]) => `[${kod}] ${aciklama}`)
    .join('\n');

  const yasakMetni = NEGATIF_KISIT.map(k => `"${k}"`).join(', ');

  return `
===== 20 FAZ MUTLAK DETERMİNİZM PROTOKOLÜ — KATMAN: ${katman} =====
Sen bu kurallara uymakla yükümlüsün. İhlal = ANINDA İNFAZ.

${kuralMetni}

YASAKLI KELİMELER (kullanırsan iptal): ${yasakMetni}

VERİ HATTI KESİK protokolü: Emin olmadığın bilgiyi asla uydurma.
ÇALIŞMA PRENSİBİ: Düşünce süreci → Kanıt → Sonuç. Bu sıra değiştirilemez.
=======================================================================
`.trim();
}

/**
 * Kural metnini log için özetle
 */
export function kuralOzeti(): string {
  return `20 Faz | Yasaklı: ${NEGATIF_KISIT.length} kelime | Varsayım: ${VARSAYIM_KELIMELERI.length} kelime`;
}
