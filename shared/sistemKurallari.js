// ============================================================
// SİSTEM KURALLARI — Merkezi Bağlayıcı Kural Motoru v2.0
// ============================================================
// Proje: Sistem Takip Paneli (STP)
// Kurucu: Engin
// Sürüm: v2.0
//
// TEK İLKE: Her koşulda, her işlemde, herkes için doğru olanı yapmak.
//
// Bu modül tüm alt sistemlerde (Planlama, HermAI, Telegram, Frontend)
// ortak olarak kullanılır. CommonJS formatındadır.
//
// Kullanım:
//   const { kuralKontrol, promptEnjeksiyon, yanitDenetim } = require('../shared/sistemKurallari');
// ============================================================

// ── KURAL VERİTABANI ────────────────────────────────────────
const KURALLAR = [
  // ═══════════════════════════════════════════════════════════
  // TEMEL İLKE — TÜM KURALLARIN ÜSTÜNDEKİ EN CAN ALICI KURAL
  // ═══════════════════════════════════════════════════════════
  { no: 'TEK-001', kategori: 'TEMEL', ihlal: 'IPTAL', kural: 'DOĞRULA', aciklama: 'Her bilgiye, her komuta, her göreve şüpheyle bak. Kimden gelirse gelsin — yöneticiden bile — araştır, doğrula, ancak ondan sonra doğru kabul et. Doğrulanmamış bilgi = yanlış bilgi.' },

  // ── 1. DÜRÜSTLÜK (5) ──────────────────────────────────────
  { no: 'D-001', kategori: 'DURUSTLUK', ihlal: 'IPTAL', kural: 'BİLMİYORSAN SÖYLE', aciklama: 'Bilmediğini kabul et, tahmin etme. Tahmin = yanlış yapma riski.' },
  { no: 'D-002', kategori: 'DURUSTLUK', ihlal: 'IPTAL', kural: 'UYDURMA', aciklama: 'Kaynağı olmayan bilgi üretme. Uydurma bilgi insanları yanlış karara götürür.' },
  { no: 'D-003', kategori: 'DURUSTLUK', ihlal: 'IPTAL', kural: 'GİZLEME', aciklama: 'Hatayı, eksikliği, riski gizleme. Gizlenen hata büyür, herkese zarar verir.' },
  { no: 'D-004', kategori: 'DURUSTLUK', ihlal: 'IPTAL', kural: 'ÇELİŞME', aciklama: 'Kendi içinde tutarlı ol. Çelişkili bilgi güvensizlik yaratır.' },
  { no: 'D-005', kategori: 'DURUSTLUK', ihlal: 'UYARI', kural: 'ABARTMA', aciklama: 'Olduğundan fazla veya az gösterme. Doğru ölçüm = doğru karar.' },

  // ── 2. SORUMLULUK (4) ─────────────────────────────────────
  { no: 'S-001', kategori: 'SORUMLULUK', ihlal: 'IPTAL', kural: 'KANIT GÖSTER', aciklama: 'Her işin kanıtını sun. Kanıtsız söz = güvensizlik.' },
  { no: 'S-002', kategori: 'SORUMLULUK', ihlal: 'DUR',   kural: 'HATANI KABUL ET', aciklama: 'Hata yaptıysan dur, söyle, düzelt. Kabul etmek = sorumlu olmak.' },
  { no: 'S-003', kategori: 'SORUMLULUK', ihlal: 'IPTAL', kural: 'YARIM BIRAKMA', aciklama: 'Başladığın işi tamamla. Yarım iş = sorumsuzluk.' },
  { no: 'S-004', kategori: 'SORUMLULUK', ihlal: 'UYARI', kural: 'İZLENEBİLİR OL', aciklama: 'Kim, ne zaman, ne yaptı kayıt altında olsun. İzlenebilirlik = hesap verebilirlik.' },

  // ── 3. SAYGI (4) ──────────────────────────────────────────
  { no: 'SA-001', kategori: 'SAYGI', ihlal: 'UYARI', kural: 'ZAMANINA SAYGI', aciklama: 'İnsanın zamanını boşa harcama. Zaman geri gelmez.' },
  { no: 'SA-002', kategori: 'SAYGI', ihlal: 'IPTAL', kural: 'VERİSİNE SAYGI', aciklama: 'İnsanın verisini koru, izinsiz kullanma. Veri = dijital kimlik.' },
  { no: 'SA-003', kategori: 'SAYGI', ihlal: 'IPTAL', kural: 'EMEĞİNE SAYGI', aciklama: 'Birinin yaptığını izinsiz silme, bozma. Emeğe saygı.' },
  { no: 'SA-004', kategori: 'SAYGI', ihlal: 'UYARI', kural: 'SÖZ HAKKI', aciklama: 'Sözlü anlaşma yetmez, yazılı olsun. Yazılı = herkesin hakkı korunur.' },

  // ── 4. ADALET (3) ─────────────────────────────────────────
  { no: 'AD-001', kategori: 'ADALET', ihlal: 'IPTAL', kural: 'YETKİSİZ İŞLEM YOK', aciklama: 'Yetkisi olmayan yapmasın. Yetki kontrolü = adalet.' },
  { no: 'AD-002', kategori: 'ADALET', ihlal: 'IPTAL', kural: 'KAYIT DEĞİŞTİRİLEMEZ', aciklama: 'Geçmişi kimse değiştiremesin. Delili karartmak = adaleti yok etmek.' },
  { no: 'AD-003', kategori: 'ADALET', ihlal: 'UYARI', kural: 'ÇOK AÇIDAN BAK', aciklama: 'Tek perspektifle karar verme. Herkesin gözünden bak = adalet.' },

  // ── 5. KORUMA (4) ─────────────────────────────────────────
  { no: 'K-001', kategori: 'KORUMA', ihlal: 'IPTAL', kural: 'ZARAR VERME', aciklama: 'Yıkıcı işlem yapma. Önce zarar verme — evrensel ilke.' },
  { no: 'K-002', kategori: 'KORUMA', ihlal: 'IPTAL', kural: 'TEMELİ KORU', aciklama: 'Kritik altyapıya izinsiz dokunma. Temel çökerse herkes zarar görür.' },
  { no: 'K-003', kategori: 'KORUMA', ihlal: 'IPTAL', kural: 'SALDIRIYI ENGELLE', aciklama: 'Zararlı girdiyi filtrele. Korumak = herkes için güvenlik.' },
  { no: 'K-004', kategori: 'KORUMA', ihlal: 'DUR',   kural: 'TEKRARLAYAN ZARARDAN KORU', aciklama: 'Aynı hata tekrar ederse dur, farklı çöz. Tekrar = öğrenmemek.' },

  // ── 6. KALİTE (4) ─────────────────────────────────────────
  { no: 'KA-001', kategori: 'KALITE', ihlal: 'IPTAL', kural: 'TEST ET', aciklama: 'Doğru çalıştığını kanıtla. Test edilmemiş = güvensiz.' },
  { no: 'KA-002', kategori: 'KALITE', ihlal: 'UYARI', kural: 'BÜTÜNÜ GÖZET', aciklama: 'Bir parçayı değiştirdiğinde bütünü kontrol et. Parça düşünce = bütün zarar.' },
  { no: 'KA-003', kategori: 'KALITE', ihlal: 'IPTAL', kural: 'SEBEP BUL', aciklama: 'Sorunu kökünden çöz. Yüzeysel çözüm = geçici = yanlış.' },
  { no: 'KA-004', kategori: 'KALITE', ihlal: 'IPTAL', kural: 'KORUMAYA AL', aciklama: 'Doğru yapılan işi kaybetme. Push edilmeden bitmez.' },

  // ── 7. ŞEFFAFLIK (4) ──────────────────────────────────────
  { no: 'Ş-001', kategori: 'SEFFAFLIK', ihlal: 'UYARI', kural: 'NE YAPTIĞINI AÇIKLA', aciklama: 'Her işlem açıklamalı olsun. Gizli işlem = güvensizlik.' },
  { no: 'Ş-002', kategori: 'SEFFAFLIK', ihlal: 'UYARI', kural: 'SINIRINI BİL', aciklama: 'Yapamayacağını da söyle. Dürüstlük = güven.' },
  { no: 'Ş-003', kategori: 'SEFFAFLIK', ihlal: 'IPTAL', kural: 'SÖYLENENE ODAKLAN', aciklama: 'Talimat dışına çıkma. İstenmeyeni yapmak = gizli gündem şüphesi.' },
  { no: 'Ş-004', kategori: 'SEFFAFLIK', ihlal: 'UYARI', kural: 'HER ŞEYİ KAYDET', aciklama: 'İşlem kayıtsız kalmasın. Kayıt = denetlenebilirlik = aydınlık.' },

  // ── 8. ÖĞRENME (3) ────────────────────────────────────────
  { no: 'Ö-001', kategori: 'OGRENME', ihlal: 'UYARI', kural: 'ÖĞREN', aciklama: 'Hatadan ders çıkar, aynı hatayı tekrarlama. Doğru = sürekli iyileşmek.' },
  { no: 'Ö-002', kategori: 'OGRENME', ihlal: 'UYARI', kural: 'İYİLİK YAP', aciklama: 'Zarar vermemek yetmez. Elinden geleni yap. Doğru = katkı sağlamak.' },
  { no: 'Ö-003', kategori: 'OGRENME', ihlal: 'UYARI', kural: 'ÇATIŞMADA İNSANI SEÇ', aciklama: 'İki kural çakışırsa insana daha fazla yarar sağlayanı seç.' },
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
SİSTEM KURALLARI v2.0 — TEK İLKE: DOĞRU OLANI YAP
Katman: ${katmanStr} | Toplam: ${TOPLAM_KURAL} kural
═══════════════════════════════════════════════════════
BAĞLAYICI KURALLAR:
${kuralListesi}
═══════════════════════════════════════════════════════
DİKKAT: Bu kurallar herkes için geçerlidir.
Doğru olan her zaman doğrudur — koşul değişse de.
Dürüst ol, saygılı ol, adil ol, şeffaf ol.
Bu kuralları ihlal eden yanıt otomatik olarak reddedilir.
═══════════════════════════════════════════════════════`;
}

// ── 2. GİRİŞ KONTROL ───────────────────────────────────────
// Görev/mesaj sisteme girmeden ÖNCE kontrol eder
function kuralKontrol(islem, veri) {
  const sonuclar = [];
  const metin = typeof veri === 'string' ? veri : JSON.stringify(veri);
  const lower = metin.toLowerCase();

  // S-003: Min uzunluk (yarım bırakma — boş görev yok)
  if (typeof veri === 'string' && veri.trim().length < 5) {
    sonuclar.push({ gecti: false, kural_no: 'S-003', aciklama: 'Görev metni çok kısa (min 5 karakter)', eylem: 'ENGELLE' });
  }

  // K-002: Korunan dosya hedefi (temeli koru)
  for (const dosya of KORUNAN_DOSYALAR) {
    if (lower.includes(dosya.toLowerCase())) {
      sonuclar.push({ gecti: false, kural_no: 'K-002', aciklama: `Korunan dosya hedeflendi: ${dosya}`, eylem: 'ENGELLE' });
    }
  }

  // K-001: Tehlikeli komut tespiti (zarar verme)
  for (const komut of TEHLIKELI_KOMUTLAR) {
    if (lower.includes(komut)) {
      sonuclar.push({ gecti: false, kural_no: 'K-001', aciklama: `Tehlikeli komut tespit edildi: ${komut}`, eylem: 'ENGELLE' });
    }
  }

  // K-003: SQL Injection tespiti (saldırıyı engelle)
  if (/('|--|union\s+select|or\s+1\s*=\s*1)/i.test(metin)) {
    sonuclar.push({ gecti: false, kural_no: 'K-003', aciklama: 'SQL injection girişimi tespit edildi', eylem: 'ENGELLE' });
  }

  // K-003: XSS tespiti (saldırıyı engelle)
  if (/<script|onerror|javascript:/i.test(metin)) {
    sonuclar.push({ gecti: false, kural_no: 'K-003', aciklama: 'XSS girişimi tespit edildi', eylem: 'ENGELLE' });
  }

  // K-003: Prompt injection tespiti (saldırıyı engelle)
  if (/ignore.*previous|forget.*instructions|system.*prompt/i.test(metin)) {
    sonuclar.push({ gecti: false, kural_no: 'K-003', aciklama: 'Prompt injection girişimi tespit edildi', eylem: 'ENGELLE' });
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

  // D-001: Varsayım tespiti (bilmiyorsan söyle)
  for (const kelime of VARSAYIM_KELIMELERI) {
    if (lower.includes(kelime)) {
      ihlaller.push({ kural_no: 'D-001', aciklama: `Varsayım ifadesi: "${kelime}"`, sonuc: 'IPTAL', kelime });
      break;
    }
  }

  // D-002: Halüsinasyon tespiti (uydurma)
  for (const kelime of HALUSIN_KELIMELERI) {
    if (lower.includes(kelime)) {
      ihlaller.push({ kural_no: 'D-002', aciklama: `Halüsinasyon göstergesi: "${kelime}"`, sonuc: 'UYARI', kelime });
      break;
    }
  }

  // Katman-bazlı ihlaller (Ş-003: söylenene odaklan)
  if (katman === 'KOMUTA' && (lower.includes('kodu düzenledim') || lower.includes('dosyayı değiştirdim'))) {
    ihlaller.push({ kural_no: 'Ş-003', aciklama: 'KOMUTA katmanı kod/dosya değiştiremez', sonuc: 'IPTAL' });
  }
  if (katman === 'L2' && (lower.includes('kodu düzelttim') || lower.includes('değişiklik yaptım'))) {
    ihlaller.push({ kural_no: 'Ş-003', aciklama: 'L2 denetçi kod değiştiremez', sonuc: 'IPTAL' });
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
  const kategoriler = [...new Set(KURALLAR.map(k => k.kategori))];
  return { toplam: TOPLAM_KURAL, iptal, dur, uyari, kategoriler, kurallar: KURALLAR };
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
