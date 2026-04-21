// ============================================================
// SİSTEM KURALLARI — Merkezi Bağlayıcı Kural Motoru
// ============================================================
// Proje: Sistem Takip Paneli (STP)
// Kurucu: Engin
// Sürüm: v1.0
//
// Bu modül tüm alt sistemlerde (Planlama, HermAI, Telegram, Frontend)
// ortak olarak kullanılır. CommonJS formatındadır.
//
// Kullanım:
//   const { kuralKontrol, promptEnjeksiyon, yanitDenetim } = require('../shared/sistemKurallari');
// ============================================================

// ── KURAL VERİTABANI ────────────────────────────────────────
const KURALLAR = [
  // TEMEL DİSİPLİN (10)
  { no: 'T-001', kategori: 'EVRENSEL', ihlal: 'IPTAL', kural: 'SIFIR İNİSİYATİF', aciklama: 'Komut dışına çıkılamaz, yorum yapılamaz, tahmin edilemez.' },
  { no: 'T-002', kategori: 'EVRENSEL', ihlal: 'IPTAL', kural: 'VARSAYIM YASAK', aciklama: 'Eksik bilgi varsa dur, soru sor, tahminle devam etme.' },
  { no: 'T-003', kategori: 'EVRENSEL', ihlal: 'IPTAL', kural: 'KANIT ZORUNLU', aciklama: 'Kanıt yok = işlem yok. Kod çalışmalı, test geçmeli, kanıt sunulmalı.' },
  { no: 'T-004', kategori: 'EVRENSEL', ihlal: 'DUR',   kural: 'HATA DURDURUR', aciklama: 'Hata varsa dur, raporla, düzeltmeden devam etme.' },
  { no: 'T-005', kategori: 'EVRENSEL', ihlal: 'IPTAL', kural: 'GÖREV BÜTÜNLÜĞÜ', aciklama: 'Parça iş yasak. Görev eksiksiz tamamlanmadan bitti denemez.' },
  { no: 'T-006', kategori: 'EVRENSEL', ihlal: 'IPTAL', kural: 'SIRASIYLA İŞLEM', aciklama: 'İşlem bitmeden yeni işlem başlatılamaz.' },
  { no: 'T-007', kategori: 'EVRENSEL', ihlal: 'IPTAL', kural: 'DEVRE DIŞI BIRAKILAMAZ', aciklama: 'Bu kurallar hiçbir koşulda devre dışı bırakılamaz.' },
  { no: 'T-008', kategori: 'EVRENSEL', ihlal: 'UYARI', kural: 'CANLI VERİ ÖNCELİĞİ', aciklama: 'Kararlar canlı veri üzerinden alınır.' },
  { no: 'T-009', kategori: 'EVRENSEL', ihlal: 'IPTAL', kural: 'YETKİ SINIRI', aciklama: 'Yetkisiz işlem yapılamaz.' },
  { no: 'T-010', kategori: 'EVRENSEL', ihlal: 'UYARI', kural: 'KISA NET CEVAP', aciklama: 'Cevaplar kısa, net ve doğrudan olmalıdır.' },

  // GÜVENLİK (5)
  { no: 'G-001', kategori: 'GUVENLIK', ihlal: 'IPTAL', kural: 'KRİTİK DOSYA KORUMA', aciklama: '.env, auth, supabase gibi kritik dosyalar izinsiz değiştirilemez.' },
  { no: 'G-002', kategori: 'GUVENLIK', ihlal: 'IPTAL', kural: 'MANİPÜLASYON KORUMASI', aciklama: 'Log kayıtları değiştirilemez (Append-only).' },
  { no: 'G-003', kategori: 'GUVENLIK', ihlal: 'IPTAL', kural: 'SHA-256 DAMGALAMA', aciklama: 'Kritik işlemler kriptografik olarak mühürlenir.' },
  { no: 'G-004', kategori: 'GUVENLIK', ihlal: 'UYARI', kural: 'KVKK UYUM', aciklama: 'Veri anonimleştirme zorunlu.' },
  { no: 'G-005', kategori: 'GUVENLIK', ihlal: 'IPTAL', kural: 'YETKİ DOĞRULAMA', aciklama: 'Her işlem öncesi yetki kontrolü zorunlu.' },

  // HATA YÖNETİMİ (3)
  { no: 'H-001', kategori: 'HATA', ihlal: 'IPTAL', kural: 'KÖK NEDEN ANALİZİ', aciklama: 'Sebebi bilinmeden çözüm uygulanmaz.' },
  { no: 'H-002', kategori: 'HATA', ihlal: 'DUR',   kural: 'RETRY LİMİTİ SIFIR', aciklama: '30sn aşan işlem durdurulur.' },
  { no: 'H-003', kategori: 'HATA', ihlal: 'UYARI', kural: 'HATA ÖNLEME', aciklama: 'Kör nokta analizi yap, riskli adımları raporla.' },

  // ÇALIŞMA PROTOKOLÜ (7)
  { no: 'C-001', kategori: 'CALISMA', ihlal: 'UYARI', kural: 'MAX 5 İTERASYON', aciklama: 'ReAct döngüsü max 5 iterasyon.' },
  { no: 'C-002', kategori: 'CALISMA', ihlal: 'IPTAL', kural: 'ARAÇ FORMAT ZORUNLU', aciklama: 'Araç çağrısı belirlenen formatta olmalı.' },
  { no: 'C-003', kategori: 'CALISMA', ihlal: 'UYARI', kural: 'GÖREV TAMAM SİNYALİ', aciklama: 'İş bittiğinde GÖREV TAMAM sinyali zorunlu.' },
  { no: 'C-004', kategori: 'CALISMA', ihlal: 'DUR',   kural: 'ARAÇ GÜVENLİĞİ', aciklama: 'Kritik sistem dosyasına yazma yasak.' },
  { no: 'C-005', kategori: 'CALISMA', ihlal: 'UYARI', kural: 'BAĞLAM KULLAN', aciklama: 'RAG ve LTM hafızadan gelen bağlamı kullan.' },
  { no: 'C-006', kategori: 'CALISMA', ihlal: 'UYARI', kural: 'KOD KONTROLÜ', aciklama: 'Frontend-backend uyumu zorunlu.' },
  { no: 'C-007', kategori: 'CALISMA', ihlal: 'IPTAL', kural: '3 KATMANLI DONE', aciklama: 'Çalıştı + test geçti + amaç gerçekleşti olmadan DONE denilemez.' },

  // GİT DİSİPLİNİ (3)
  { no: 'GIT-001', kategori: 'GIT', ihlal: 'IPTAL', kural: 'TAMAMLANMAMIŞ KOD PUSH YASAK', aciklama: 'Test edilmemiş kod push edilmez.' },
  { no: 'GIT-002', kategori: 'GIT', ihlal: 'UYARI', kural: 'COMMIT STANDARDI', aciklama: 'Her commit açıklamalı, izlenebilir, geri alınabilir.' },
  { no: 'GIT-003', kategori: 'GIT', ihlal: 'IPTAL', kural: 'BULUT GÜVENCESİ', aciklama: 'Push edilmeden bitmez.' },

  // TUTANAK (5)
  { no: 'TU-001', kategori: 'TUTANAK', ihlal: 'UYARI', kural: 'OTOMATİK TUTANAK', aciklama: 'Doğrulanamayan işlem için otomatik tutanak.' },
  { no: 'TU-002', kategori: 'TUTANAK', ihlal: 'IPTAL', kural: 'YAZILI KANIT ZORUNLU', aciklama: 'Sözlü talimatlar geçersiz.' },
  { no: 'TU-003', kategori: 'TUTANAK', ihlal: 'IPTAL', kural: '3 TEKRAR DURDURUR', aciklama: 'Aynı hata 3 kez tekrarlanırsa sistem durdurulur.' },
  { no: 'TU-004', kategori: 'TUTANAK', ihlal: 'IPTAL', kural: 'TUTANAK DEĞİŞTİRİLEMEZ', aciklama: 'Audit logları immutable.' },
  { no: 'TU-005', kategori: 'TUTANAK', ihlal: 'UYARI', kural: 'İZLENEBİLİRLİK', aciklama: 'Kim, ne zaman, ne yaptı izlenebilir olmalı.' },

  // ANALİZ (6)
  { no: 'A-001', kategori: 'ANALIZ', ihlal: 'UYARI', kural: '5 EKSEN ANALİZİ', aciklama: 'Stratejik, Teknik, Operasyonel, Ekonomik, İnsan.' },
  { no: 'A-002', kategori: 'ANALIZ', ihlal: 'UYARI', kural: 'ÇIKTI FORMATI', aciklama: 'Problem → Varsayımlar → Sorular → Riskler → Sonuç.' },
  { no: 'A-003', kategori: 'ANALIZ', ihlal: 'UYARI', kural: 'HALÜSİNASYON YASAK', aciklama: 'Kaynağı olmayan bilgi uydurulmaz.' },
  { no: 'A-004', kategori: 'ANALIZ', ihlal: 'UYARI', kural: 'MANTIK DOĞRULAMA', aciklama: 'Tutarlılık kontrolü olmadan sonuç üretilmez.' },
  { no: 'A-005', kategori: 'ANALIZ', ihlal: 'UYARI', kural: 'SİSTEM ARIZA ANALİZİ', aciklama: 'SPOF ve kırılma senaryoları kontrol edilir.' },
  { no: 'A-006', kategori: 'ANALIZ', ihlal: 'UYARI', kural: 'KARAR DOĞRULAMA', aciklama: 'Risk filtreleri uygulanmadan karar verilmez.' },
];

const TOPLAM_KURAL = KURALLAR.length;

// ── VARSAYIM / HALÜSİNASYON TESPİT KELİMELERİ ─────────────
const VARSAYIM_KELIMELERI = ['sanırım', 'belki', 'muhtemelen', 'galiba', 'herhalde', 'tahmin ediyorum', 'sanki'];
const HALUSIN_KELIMELERI  = ['emin değilim ama', 'kaynağım yok ama', 'kesinlikle biliyorum', 'her zaman böyle'];
const TEHLIKELI_KOMUTLAR  = ['rm -rf', 'drop table', 'delete --force', 'truncate', 'chmod 777', 'sudo'];
const KORUNAN_DOSYALAR    = ['.env.local', '.env', '.env.production', 'supabase.ts', 'authService.ts', 'middleware.ts'];

// ── 1. PROMPT ENJEKSIYON ────────────────────────────────────
// AI çağrısından ÖNCE prompt'a kuralları ekler
function promptEnjeksiyon(katman) {
  const katmanStr = katman || 'GENEL';
  const kuralListesi = KURALLAR
    .filter(k => k.ihlal === 'IPTAL' || k.ihlal === 'DUR')
    .map(k => `  [${k.no}] ${k.kural} → ${k.ihlal === 'IPTAL' ? '🚫İPTAL' : '⏸DUR'}: ${k.aciklama}`)
    .join('\n');

  return `
═══════════════════════════════════════════════════════
SİSTEM KURALLARI v3.0 — BAĞLAYICI KURALLAR
Katman: ${katmanStr} | Toplam: ${TOPLAM_KURAL} kural
═══════════════════════════════════════════════════════
${kuralListesi}
═══════════════════════════════════════════════════════
DİKKAT: Bu kuralları ihlal eden yanıt otomatik olarak reddedilir.
Varsayım yapma, kanıtsız bilgi verme, yetki dışı işlem önerme.
═══════════════════════════════════════════════════════`;
}

// ── 2. GİRİŞ KONTROL ───────────────────────────────────────
// Görev/mesaj sisteme girmeden ÖNCE kontrol eder
function kuralKontrol(islem, veri) {
  const sonuclar = [];
  const metin = typeof veri === 'string' ? veri : JSON.stringify(veri);
  const lower = metin.toLowerCase();

  // T-005: Min uzunluk
  if (typeof veri === 'string' && veri.trim().length < 5) {
    sonuclar.push({ gecti: false, kural_no: 'T-005', aciklama: 'Görev metni çok kısa (min 5 karakter)', eylem: 'ENGELLE' });
  }

  // G-001: Korunan dosya hedefi
  for (const dosya of KORUNAN_DOSYALAR) {
    if (lower.includes(dosya.toLowerCase())) {
      sonuclar.push({ gecti: false, kural_no: 'G-001', aciklama: `Korunan dosya hedeflendi: ${dosya}`, eylem: 'ENGELLE' });
    }
  }

  // Tehlikeli komut tespiti
  for (const komut of TEHLIKELI_KOMUTLAR) {
    if (lower.includes(komut)) {
      sonuclar.push({ gecti: false, kural_no: 'C-004', aciklama: `Tehlikeli komut tespit edildi: ${komut}`, eylem: 'ENGELLE' });
    }
  }

  // SQL Injection tespiti
  if (/('|--|union\s+select|or\s+1\s*=\s*1)/i.test(metin)) {
    sonuclar.push({ gecti: false, kural_no: 'G-001', aciklama: 'SQL injection girişimi tespit edildi', eylem: 'ENGELLE' });
  }

  // XSS tespiti
  if (/<script|onerror|javascript:/i.test(metin)) {
    sonuclar.push({ gecti: false, kural_no: 'G-001', aciklama: 'XSS girişimi tespit edildi', eylem: 'ENGELLE' });
  }

  // Prompt injection tespiti
  if (/ignore.*previous|forget.*instructions|system.*prompt/i.test(metin)) {
    sonuclar.push({ gecti: false, kural_no: 'G-002', aciklama: 'Prompt injection girişimi tespit edildi', eylem: 'ENGELLE' });
  }

  const engellenen = sonuclar.filter(s => s.eylem === 'ENGELLE');
  return {
    gecti: engellenen.length === 0,
    ihlal_sayisi: sonuclar.length,
    ihlaller: sonuclar,
    islem,
    zaman: new Date().toISOString(),
  };
}

// ── 3. YANIT DENETİM ───────────────────────────────────────
// AI çıktısını kural ihlali için SONRADAN tarar
function yanitDenetim(yanit, katman) {
  const ihlaller = [];
  const lower = (yanit || '').toLowerCase();

  // T-002: Varsayım tespiti
  for (const kelime of VARSAYIM_KELIMELERI) {
    if (lower.includes(kelime)) {
      ihlaller.push({ kural_no: 'T-002', aciklama: `Varsayım ifadesi: "${kelime}"`, sonuc: 'IPTAL', kelime });
      break;
    }
  }

  // A-003: Halüsinasyon tespiti
  for (const kelime of HALUSIN_KELIMELERI) {
    if (lower.includes(kelime)) {
      ihlaller.push({ kural_no: 'A-003', aciklama: `Halüsinasyon göstergesi: "${kelime}"`, sonuc: 'UYARI', kelime });
      break;
    }
  }

  // Katman-bazlı ihlaller
  if (katman === 'KOMUTA' && (lower.includes('kodu düzenledim') || lower.includes('dosyayı değiştirdim'))) {
    ihlaller.push({ kural_no: 'K-001', aciklama: 'KOMUTA katmanı kod/dosya değiştiremez', sonuc: 'IPTAL' });
  }
  if (katman === 'L2' && (lower.includes('kodu düzelttim') || lower.includes('değişiklik yaptım'))) {
    ihlaller.push({ kural_no: 'L2-003', aciklama: 'L2 denetçi kod değiştiremez', sonuc: 'IPTAL' });
  }

  const iptalVar = ihlaller.some(i => i.sonuc === 'IPTAL');
  return {
    gecti: !iptalVar,
    ihlal_var: ihlaller.length > 0,
    ihlaller,
    iptal: iptalVar,
    zaman: new Date().toISOString(),
  };
}

// ── 4. LOG KAYIT ────────────────────────────────────────────
// Kural ihlali loglarını formatlar
function ihlalLog(modul, sonuc) {
  const ts = new Date().toISOString();
  if (!sonuc.gecti || sonuc.ihlal_var) {
    const detay = (sonuc.ihlaller || []).map(i => `[${i.kural_no}] ${i.aciklama}`).join(' | ');
    return `[${ts}] [SİSTEM_KURALLARI] [${modul}] İHLAL: ${detay}`;
  }
  return null;
}

// ── 5. KURAL ÖZETİ ─────────────────────────────────────────
function kuralOzeti() {
  const iptal = KURALLAR.filter(k => k.ihlal === 'IPTAL').length;
  const dur   = KURALLAR.filter(k => k.ihlal === 'DUR').length;
  const uyari = KURALLAR.filter(k => k.ihlal === 'UYARI').length;
  return { toplam: TOPLAM_KURAL, iptal, dur, uyari, kurallar: KURALLAR };
}

// ── EXPORT ──────────────────────────────────────────────────
module.exports = {
  KURALLAR,
  TOPLAM_KURAL,
  promptEnjeksiyon,
  kuralKontrol,
  yanitDenetim,
  ihlalLog,
  kuralOzeti,
};
