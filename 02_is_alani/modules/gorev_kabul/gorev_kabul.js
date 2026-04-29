// ============================================================
// GÖREV KABUL DEPARTMANI — Komut Alım & Doğrulama Motoru
// ============================================================
// Görev: Gelen her komutu (sesli/yazılı/görsel) doğru anlamak,
// yöneticiye onaylatmak ve ancak onaydan sonra Planlama'ya geçirmek.
//
// Mimari:
//   1. Algilama    → 3 farklı ajan komutu bağımsız analiz eder
//   2. Sentez      → 3 sonuç karşılaştırılır, ortak anlam çıkarılır
//   3. Doğrulama   → "Siz şunu mu istediniz?" → Yöneticiye sor
//   4. Onay        → EVET → Planlama'ya gönder | HAYIR → tekrar sor
//   5. Öğrenme     → Her onay/red kaydedilir, güven skoru artar
//
// Çalıştırma: const kabul = new GorevKabulDepartmani();
// ============================================================

'use strict';

const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

// ── KOMUT TİPLERİ ────────────────────────────────────────────
const KOMUT_TIPLERI = {
  YAZILI:  'YAZILI',   // Panel, mesaj, chat
  SESLI:   'SESLI',    // Mikrofon, sesli komut
  GORSEL:  'GORSEL',   // Ekran görüntüsü, dosya
};

// ── KOMUT DURUMLARI ──────────────────────────────────────────
const KOMUT_DURUM = {
  ALGILANDI:    'ALGILANDI',     // 3 ajan okudu
  SENTEZLENDI:  'SENTEZLENDI',   // Ortak anlam çıkarıldı
  ONAY_BEKLIYOR:'ONAY_BEKLIYOR', // Yöneticiye soruldu
  ONAYLANDI:    'ONAYLANDI',     // Yönetici EVET dedi
  REDDEDILDI:   'REDDEDILDI',    // Yönetici HAYIR dedi
  PLANLAMAYA_GITTI: 'PLANLAMAYA_GITTI', // Planlama departmanına iletildi
};

// ── GÜVEN SKORU AYARLARI ─────────────────────────────────────
// Sistem öğrendikçe güven skoru artar.
// Skor eşiği aşınca artık yöneticiye sormaz.
const GUVEN_AYARLARI = {
  BASLANGIC_SKOR:    0,      // Her yeni komut tipi 0'dan başlar
  ONAY_ARTIS:        10,     // Her EVET → +10 puan
  RED_AZALIS:        -20,    // Her HAYIR → -20 puan
  OTOMATIK_ESIK:     100,    // Bu skora ulaşınca otomatik onay
  MIN_ORNEK_SAYISI:  20,     // En az 20 başarılı onay gerekli
};

// ── ÖĞRENME VERİTABANI (Persist) ─────────────────────────────
const OGRENME_DB_YOLU = path.join(__dirname, '..', 'data', 'gorev_kabul_ogrenme.json');

function ogrenmeDBOku() {
  try {
    if (fs.existsSync(OGRENME_DB_YOLU)) {
      return JSON.parse(fs.readFileSync(OGRENME_DB_YOLU, 'utf-8'));
    }
  } catch { /* bozuk dosya */ }
  return { kaliplar: {}, toplam_onay: 0, toplam_red: 0, gecmis: [] };
}

function ogrenmeDBYaz(data) {
  const dir = path.dirname(OGRENME_DB_YOLU);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = OGRENME_DB_YOLU + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, OGRENME_DB_YOLU);
}


// ═══════════════════════════════════════════════════════════════
// ALGILAMA AJANLARI — 3 bağımsız ajan komutu analiz eder
// ═══════════════════════════════════════════════════════════════

/**
 * Ajan-A: Ham metin çıkarma
 * Sayıları yazıya döker, kısaltmaları açar, temizler.
 */
function ajanA_HamMetinCikarma(komut) {
  let metin = String(komut.icerik || '').trim();

  // Sayıları yazıya dök
  const sayiHaritasi = {
    '0': 'sıfır', '1': 'bir', '2': 'iki', '3': 'üç', '4': 'dört',
    '5': 'beş', '6': 'altı', '7': 'yedi', '8': 'sekiz', '9': 'dokuz',
    '10': 'on', '20': 'yirmi', '50': 'elli', '100': 'yüz',
  };

  // Tekil sayı dönüşümü (bağlam koruyarak)
  const temizMetin = metin.replace(/\b(\d+)\b/g, (m) => {
    return sayiHaritasi[m] || m;
  });

  // Kısaltmaları aç
  const kisaltmaHaritasi = {
    'FE': 'frontend', 'BE': 'backend', 'DB': 'veritabanı',
    'UI': 'kullanıcı arayüzü', 'UX': 'kullanıcı deneyimi',
    'API': 'uygulama programlama arayüzü', 'CSS': 'stil dosyası',
    'SQL': 'veritabanı sorgusu', 'RLS': 'satır seviyesi güvenlik',
  };

  let acilmisMetin = temizMetin;
  for (const [k, v] of Object.entries(kisaltmaHaritasi)) {
    acilmisMetin = acilmisMetin.replace(new RegExp(`\\b${k}\\b`, 'gi'), `${k} (${v})`);
  }

  return {
    ajan: 'A-ALGILAMA',
    ham_metin: metin,
    temiz_metin: temizMetin,
    acilmis_metin: acilmisMetin,
    kelime_sayisi: acilmisMetin.split(/\s+/).length,
    karakter_sayisi: acilmisMetin.length,
    tip: komut.tip || KOMUT_TIPLERI.YAZILI,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Ajan-B: Niyet tespiti
 * Komuttan ne isteniyor? OLUŞTUR, DÜZELT, SİL, KONTROL, ANALİZ?
 */
function ajanB_NiyetTespiti(komut) {
  const metin = String(komut.icerik || '').toLowerCase();

  // Niyet kalıpları — ağırlıklı eşleşme
  // Birincil fiiller (ağırlık: 3), İkincil fiiller (ağırlık: 2), Kök eşleşme (ağırlık: 1)
  const niyetler = {
    DUZELT:   {
      birincil: ['düzelt', 'düzenle', 'fix', 'onar'],
      ikincil:  ['iyileştir', 'güncelle', 'değiştir', 'revize', 'patch'],
    },
    KONTROL:  {
      birincil: ['kontrol et', 'denetle', 'doğrula', 'incele'],
      ikincil:  ['test', 'gözden geçir', 'kontrolü', 'kontrol', 'denetim', 'denetimi', 'doğrulama'],
    },
    OLUSTUR:  {
      birincil: ['oluştur', 'yarat', 'inşa et'],
      ikincil:  ['yap', 'ekle', 'kur', 'yaz', 'üret', 'geliştir', 'hazırla'],
    },
    SIL:      {
      birincil: ['sil', 'kaldır'],
      ikincil:  ['temizle', 'kapat', 'iptal', 'çıkar'],
    },
    ANALIZ:   {
      birincil: ['analiz', 'araştır'],
      ikincil:  ['bul', 'tespit', 'raporla', 'ölç', 'tarama'],
    },
    PLANLAMA: {
      birincil: ['planla', 'tasarla'],
      ikincil:  ['mimari', 'strateji', 'yol haritası'],
    },
    DEPLOY:   {
      birincil: ['deploy', 'yayınla'],
      ikincil:  ['push', 'canlıya', 'production'],
    },
  };

  const tespit = {};
  let enYuksek = { niyet: 'BELIRSIZ', skor: 0 };

  // Niyetler sırası önemli — DUZELT ve KONTROL önce değerlendirilir
  for (const [niyet, kelimeGruplari] of Object.entries(niyetler)) {
    let skor = 0;
    const bulunan = [];

    for (const k of kelimeGruplari.birincil) {
      if (metin.includes(k)) {
        skor += 3;  // Birincil fiil → yüksek ağırlık
        bulunan.push(`${k}(+3)`);
      }
    }
    for (const k of kelimeGruplari.ikincil) {
      if (metin.includes(k)) {
        skor += 2;  // İkincil fiil → orta ağırlık
        bulunan.push(`${k}(+2)`);
      }
    }

    tespit[niyet] = { skor, bulunan };
    if (skor > enYuksek.skor) {
      enYuksek = { niyet, skor };
    }
  }

  return {
    ajan: 'B-NIYET',
    birincil_niyet: enYuksek.niyet,
    niyet_skoru: enYuksek.skor,
    tum_niyetler: tespit,
    belirsiz: enYuksek.skor === 0,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Ajan-C: Bağlam ve kapsam analizi
 * Hangi alan? Hangi dosyalar? Ne kadar iş?
 */
function ajanC_BaglamAnalizi(komut) {
  const metin = String(komut.icerik || '').toLowerCase();

  // Alan tespiti
  const alanlar = {
    FRONTEND:  ['react', 'css', 'component', 'bileşen', 'sayfa', 'panel', 'ui', 'arayüz', 'stil', 'tasarım'],
    BACKEND:   ['api', 'endpoint', 'route', 'server', 'middleware', 'servis'],
    VERITABANI:['sql', 'supabase', 'tablo', 'migration', 'veritabanı', 'rls', 'schema'],
    GUVENLIK:  ['güvenlik', 'auth', 'jwt', 'şifre', 'yetki', 'owasp'],
    TEST:      ['test', 'vitest', 'playwright', 'unit', 'e2e', 'coverage'],
    DEPLOYMENT:['deploy', 'vercel', 'docker', 'ci', 'cd', 'build'],
    AI:        ['ollama', 'ai', 'yapay zeka', 'model', 'prompt', 'llm'],
    BOT:       ['telegram', 'bot', 'bildirim', 'webhook'],
  };

  const tespitAlanlar = [];
  for (const [alan, kelimeler] of Object.entries(alanlar)) {
    let skor = 0;
    for (const k of kelimeler) {
      if (metin.includes(k)) skor++;
    }
    if (skor > 0) tespitAlanlar.push({ alan, skor });
  }
  tespitAlanlar.sort((a, b) => b.skor - a.skor);

  // Karmaşıklık tahmini
  const kelimeSayisi = metin.split(/\s+/).length;
  let karmasiklik = 'DUSUK';
  if (kelimeSayisi > 20 || tespitAlanlar.length > 2) karmasiklik = 'ORTA';
  if (kelimeSayisi > 50 || tespitAlanlar.length > 3) karmasiklik = 'YUKSEK';

  // Aciliyet tespiti
  let aciliyet = 'NORMAL';
  if (metin.match(/acil|hemen|şimdi|kritik|urgency|asap/)) aciliyet = 'KRITIK';
  if (metin.match(/bugün|bu gün|yarın/)) aciliyet = 'YUKSEK';

  return {
    ajan: 'C-BAGLAM',
    alanlar: tespitAlanlar,
    birincil_alan: tespitAlanlar.length > 0 ? tespitAlanlar[0].alan : 'GENEL',
    karmasiklik,
    aciliyet,
    kelime_sayisi: kelimeSayisi,
    timestamp: new Date().toISOString(),
  };
}


// ═══════════════════════════════════════════════════════════════
// SENTEZ — 3 ajanın sonucunu birleştir
// ═══════════════════════════════════════════════════════════════

function sentezle(hamSonuc, niyetSonuc, baglamSonuc) {
  // Sistemin anladığı şeyi Türkçe cümleye dök
  const niyet = niyetSonuc.birincil_niyet;
  const alan = baglamSonuc.birincil_alan;
  const aciliyet = baglamSonuc.aciliyet;
  const karmasiklik = baglamSonuc.karmasiklik;
  const hamMetin = hamSonuc.ham_metin;

  // Niyeti Türkçe fiil yap
  const niyetFiil = {
    OLUSTUR: 'oluşturulmasını',
    DUZELT:  'düzeltilmesini',
    SIL:     'silinmesini',
    KONTROL: 'kontrol edilmesini',
    ANALIZ:  'analiz edilmesini',
    PLANLAMA:'planlanmasını',
    DEPLOY:  'yayınlanmasını',
    BELIRSIZ:'işlenmesini',
  };

  // Alanı Türkçe isim yap
  const alanIsim = {
    FRONTEND: 'frontend (kullanıcı arayüzü)',
    BACKEND:  'backend (sunucu tarafı)',
    VERITABANI:'veritabanı',
    GUVENLIK: 'güvenlik',
    TEST:     'test',
    DEPLOYMENT:'deployment (yayın)',
    AI:       'yapay zeka',
    BOT:      'bot/bildirim',
    GENEL:    'genel sistem',
  };

  const anlasilanCumle = [
    `Siz, ${alanIsim[alan] || alan} alanında`,
    `${niyetFiil[niyet] || 'işlenmesini'} istiyorsunuz.`,
    aciliyet !== 'NORMAL' ? `Aciliyet: ${aciliyet}.` : '',
    `Karmaşıklık: ${karmasiklik}.`,
  ].filter(Boolean).join(' ');

  const anlasilanOzet = {
    ham_komut:        hamMetin,
    anlasilan_cumle:  anlasilanCumle,
    niyet:            niyet,
    alan:             alan,
    aciliyet:         aciliyet,
    karmasiklik:      karmasiklik,
    kelime_sayisi:    hamSonuc.kelime_sayisi,
    ajanlar: {
      algilama: hamSonuc,
      niyet:    niyetSonuc,
      baglam:   baglamSonuc,
    },
    timestamp: new Date().toISOString(),
  };

  return anlasilanOzet;
}


// ═══════════════════════════════════════════════════════════════
// GÜVEN SKORU & ÖĞRENME
// ═══════════════════════════════════════════════════════════════

/**
 * Komut kalıbının güven skorunu hesapla.
 * Benzer komutlar daha önce kaç kez onaylandı/reddedildi?
 */
function guvenSkoruHesapla(niyet, alan) {
  const db = ogrenmeDBOku();
  const anahtar = `${niyet}::${alan}`;
  const kalip = db.kaliplar[anahtar];

  if (!kalip) {
    return {
      skor: GUVEN_AYARLARI.BASLANGIC_SKOR,
      otomatik_onay: false,
      onay_sayisi: 0,
      red_sayisi: 0,
      aciklama: 'Yeni kalıp — yönetici onayı gerekli',
    };
  }

  return {
    skor: kalip.skor,
    otomatik_onay: kalip.skor >= GUVEN_AYARLARI.OTOMATIK_ESIK
                   && kalip.onay_sayisi >= GUVEN_AYARLARI.MIN_ORNEK_SAYISI,
    onay_sayisi: kalip.onay_sayisi,
    red_sayisi: kalip.red_sayisi,
    aciklama: kalip.skor >= GUVEN_AYARLARI.OTOMATIK_ESIK
      ? 'Yeterli öğrenme — otomatik onay'
      : `Güven skoru: ${kalip.skor}/${GUVEN_AYARLARI.OTOMATIK_ESIK}`,
  };
}

/**
 * Onay/Red sonucunu öğrenme veritabanına kaydet.
 */
function ogrenmeKaydet(niyet, alan, onaylandi) {
  const db = ogrenmeDBOku();
  const anahtar = `${niyet}::${alan}`;

  if (!db.kaliplar[anahtar]) {
    db.kaliplar[anahtar] = { skor: 0, onay_sayisi: 0, red_sayisi: 0 };
  }

  const kalip = db.kaliplar[anahtar];
  if (onaylandi) {
    kalip.skor += GUVEN_AYARLARI.ONAY_ARTIS;
    kalip.onay_sayisi++;
    db.toplam_onay++;
  } else {
    kalip.skor += GUVEN_AYARLARI.RED_AZALIS;
    kalip.red_sayisi++;
    db.toplam_red++;
  }

  // Minimum skor 0
  if (kalip.skor < 0) kalip.skor = 0;

  // Geçmiş kaydı
  db.gecmis.push({
    anahtar,
    onaylandi,
    yeni_skor: kalip.skor,
    timestamp: new Date().toISOString(),
  });

  // Son 500 kaydı tut
  if (db.gecmis.length > 500) db.gecmis = db.gecmis.slice(-500);

  ogrenmeDBYaz(db);
  return kalip;
}


// ═══════════════════════════════════════════════════════════════
// ANA SINIF — GorevKabulDepartmani
// ═══════════════════════════════════════════════════════════════

class GorevKabulDepartmani extends EventEmitter {
  constructor() {
    super();
    this._bekleyen = new Map(); // onay bekleyen komutlar
    this._gecmis = [];
    this._sayac = 0;
  }

  /**
   * Yeni komut al — 3 ajanla algıla, sentezle, güven kontrolü yap.
   * @param {{ icerik: string, tip?: string, kaynak?: string }} komut
   * @returns {{ komut_id: string, anlasilan: object, onay_gerekli: boolean, guven: object }}
   */
  komutAl(komut) {
    if (!komut || !komut.icerik || String(komut.icerik).trim().length < 3) {
      return {
        basarili: false,
        hata: 'Komut içeriği geçersiz (minimum 3 karakter)',
      };
    }

    this._sayac++;
    const komut_id = `KMT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // ── 1. ALGILAMA: 3 bağımsız ajan ──────────────────────
    const hamSonuc   = ajanA_HamMetinCikarma(komut);
    const niyetSonuc = ajanB_NiyetTespiti(komut);
    const baglamSonuc = ajanC_BaglamAnalizi(komut);

    // ── 2. SENTEZ: 3 sonucu birleştir ─────────────────────
    const anlasilan = sentezle(hamSonuc, niyetSonuc, baglamSonuc);

    // ── 3. GÜVEN SKORU: Otomatik onay mümkün mü? ─────────
    const guven = guvenSkoruHesapla(niyetSonuc.birincil_niyet, baglamSonuc.birincil_alan);

    const kayit = {
      komut_id,
      ham_komut: komut.icerik,
      tip: komut.tip || KOMUT_TIPLERI.YAZILI,
      kaynak: komut.kaynak || 'PANEL',
      durum: guven.otomatik_onay ? KOMUT_DURUM.ONAYLANDI : KOMUT_DURUM.ONAY_BEKLIYOR,
      anlasilan,
      guven,
      olusturma: new Date().toISOString(),
    };

    if (guven.otomatik_onay) {
      // Yeterli öğrenme — otomatik geç
      kayit.durum = KOMUT_DURUM.ONAYLANDI;
      kayit.otomatik = true;
      this._gecmis.push(kayit);
      this.emit('komut_otomatik_onay', kayit);
    } else {
      // Yöneticiye sor
      this._bekleyen.set(komut_id, kayit);
      this.emit('komut_onay_bekliyor', {
        komut_id,
        soru: `Siz şunu mu istediniz?\n\n"${anlasilan.anlasilan_cumle}"\n\nOrijinal komut: "${komut.icerik}"\n\nDoğru mu? (EVET / HAYIR)`,
        anlasilan,
        guven,
      });
    }

    return {
      basarili: true,
      komut_id,
      anlasilan: anlasilan.anlasilan_cumle,
      ham_komut: komut.icerik,
      niyet: anlasilan.niyet,
      alan: anlasilan.alan,
      durum: kayit.durum,
      onay_gerekli: !guven.otomatik_onay,
      guven,
    };
  }

  /**
   * Yönetici onayı — EVET veya HAYIR.
   * @param {string} komut_id
   * @param {boolean} onay
   * @param {string} [duzeltme] — HAYIR ise doğru versiyon
   * @returns {{ basarili: boolean, durum: string }}
   */
  onayVer(komut_id, onay, duzeltme) {
    const kayit = this._bekleyen.get(komut_id);
    if (!kayit) {
      return { basarili: false, hata: 'Komut bulunamadı veya zaten işlendi' };
    }

    // Öğrenme kaydı
    ogrenmeKaydet(kayit.anlasilan.niyet, kayit.anlasilan.alan, onay);

    if (onay) {
      kayit.durum = KOMUT_DURUM.ONAYLANDI;
      kayit.onay_zamani = new Date().toISOString();
      this._bekleyen.delete(komut_id);
      this._gecmis.push(kayit);
      this.emit('komut_onaylandi', kayit);
      return { basarili: true, durum: 'ONAYLANDI', komut_id };
    } else {
      kayit.durum = KOMUT_DURUM.REDDEDILDI;
      kayit.red_zamani = new Date().toISOString();
      kayit.duzeltme = duzeltme || null;
      this._bekleyen.delete(komut_id);
      this._gecmis.push(kayit);
      this.emit('komut_reddedildi', kayit);

      // Düzeltme varsa yeni komut olarak tekrar al
      if (duzeltme) {
        return this.komutAl({
          icerik: duzeltme,
          tip: kayit.tip,
          kaynak: kayit.kaynak,
        });
      }

      return { basarili: true, durum: 'REDDEDILDI', komut_id };
    }
  }

  /**
   * Bekleyen onaylar listesi.
   */
  bekleyenler() {
    return Array.from(this._bekleyen.values()).map(k => ({
      komut_id: k.komut_id,
      ham_komut: k.ham_komut,
      anlasilan: k.anlasilan.anlasilan_cumle,
      niyet: k.anlasilan.niyet,
      alan: k.anlasilan.alan,
      guven_skoru: k.guven.skor,
      bekleme_suresi: Date.now() - new Date(k.olusturma).getTime(),
    }));
  }

  /**
   * Öğrenme istatistikleri.
   */
  ogrenmeRaporu() {
    const db = ogrenmeDBOku();
    const kaliplar = Object.entries(db.kaliplar).map(([anahtar, kalip]) => ({
      kalip: anahtar,
      skor: kalip.skor,
      onay: kalip.onay_sayisi,
      red: kalip.red_sayisi,
      otomatik: kalip.skor >= GUVEN_AYARLARI.OTOMATIK_ESIK
                && kalip.onay_sayisi >= GUVEN_AYARLARI.MIN_ORNEK_SAYISI,
    }));

    return {
      toplam_onay: db.toplam_onay,
      toplam_red: db.toplam_red,
      toplam_kalip: kaliplar.length,
      otomatik_kalip: kaliplar.filter(k => k.otomatik).length,
      kaliplar,
      esik: GUVEN_AYARLARI.OTOMATIK_ESIK,
      min_ornek: GUVEN_AYARLARI.MIN_ORNEK_SAYISI,
    };
  }

  /**
   * Durum raporu.
   */
  durumRaporu() {
    return {
      bekleyen_sayisi: this._bekleyen.size,
      toplam_islenen: this._sayac,
      gecmis_sayisi: this._gecmis.length,
      ogrenme: this.ogrenmeRaporu(),
    };
  }
}


// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  GorevKabulDepartmani,
  KOMUT_TIPLERI,
  KOMUT_DURUM,
  GUVEN_AYARLARI,

  // Alt fonksiyonlar (test için)
  ajanA_HamMetinCikarma,
  ajanB_NiyetTespiti,
  ajanC_BaglamAnalizi,
  sentezle,
  guvenSkoruHesapla,
  ogrenmeKaydet,
};
