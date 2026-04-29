// ============================================================
// PROBLEM TANIMI PROTOKOLÜ — PDP-44
// ============================================================
// MDS-160 Uyumlu 44 Maddelik Problem Tanımı Standardı
// Her görev intake'inde ZORUNLU denetim noktaları.
//
// Kullanım:
//   const { pdp44Dogrula } = require('./pdp_44');
//   const sonuc = pdp44Dogrula(komutMetni);
//   if (!sonuc.gecerli) { /* eksik maddeler bildir */ }
// ============================================================

// ── 44 MADDE GRUPLARI ────────────────────────────────────────
const PDP44_MADDELER = Object.freeze([

  // ── GRUP A: PROBLEM İFADESİ (1-5) ─────────────────────────
  { no: 1,  grup: 'A', ad: 'tek_problem',        aciklama: '1 Ana problem ifadesi var',                  zorunlu: true },
  { no: 2,  grup: 'A', ad: 'tek_anlamli',         aciklama: 'Problem açık ve tek anlamlı',               zorunlu: true },
  { no: 3,  grup: 'A', ad: 'sistem_siniri',        aciklama: 'Sistem sınırı tanımlı',                    zorunlu: true },
  { no: 4,  grup: 'A', ad: 'belirti_olculebilir',  aciklama: 'Belirti ölçülebilir',                      zorunlu: true },
  { no: 5,  grup: 'A', ad: 'etki_sayisal',         aciklama: 'Etki sayısal',                             zorunlu: true },

  // ── GRUP B: KAPSAM VE BAĞLAM (6-12) ───────────────────────
  { no: 6,  grup: 'B', ad: 'etkilenen_bilesen',    aciklama: 'Etkilenen sistem/bileşen belirtilmiş',     zorunlu: true },
  { no: 7,  grup: 'B', ad: 'ortam_belli',          aciklama: 'Ortam/yer belirtilmiş',                    zorunlu: true },
  { no: 8,  grup: 'B', ad: 'zaman_kosul',          aciklama: 'Zaman/koşul belirtilmiş',                  zorunlu: true },
  { no: 9,  grup: 'B', ad: 'baslangic_zamani',     aciklama: 'Başlangıç zamanı var',                     zorunlu: true },
  { no: 10, grup: 'B', ad: 'siklik_belli',         aciklama: 'Sıklık belirtilmiş',                       zorunlu: false },
  { no: 11, grup: 'B', ad: 'kapsam_tanimli',       aciklama: 'Kapsam tanımlı',                           zorunlu: true },
  { no: 12, grup: 'B', ad: 'etkilenmeyen_belli',   aciklama: 'Etkilenmeyen alanlar belirtilmiş',         zorunlu: false },

  // ── GRUP C: BEKLENEN vs GERÇEKLEŞEN (13-16) ───────────────
  { no: 13, grup: 'C', ad: 'beklenen_durum',       aciklama: 'Beklenen durum yazılmış',                  zorunlu: true },
  { no: 14, grup: 'C', ad: 'gerceklesen_durum',    aciklama: 'Gerçekleşen durum yazılmış',               zorunlu: true },
  { no: 15, grup: 'C', ad: 'fark_net',             aciklama: 'Fark net',                                 zorunlu: true },
  { no: 16, grup: 'C', ad: 'olcum_metrigi',        aciklama: 'Ölçüm metriği var',                        zorunlu: true },

  // ── GRUP D: ÖLÇÜM (17-20) ─────────────────────────────────
  { no: 17, grup: 'D', ad: 'olcum_birimi',         aciklama: 'Ölçüm birimi var',                         zorunlu: true },
  { no: 18, grup: 'D', ad: 'olcum_yontemi',        aciklama: 'Ölçüm yöntemi var',                        zorunlu: true },
  { no: 19, grup: 'D', ad: 'veri_kaynagi',         aciklama: 'Veri kaynağı var',                         zorunlu: true },
  { no: 20, grup: 'D', ad: 'zaman_damgasi',        aciklama: 'Zaman damgası var',                        zorunlu: true },

  // ── GRUP E: GİRDİ–SÜREÇ–ÇIKTI (21-30) ────────────────────
  { no: 21, grup: 'E', ad: 'girdi_tanimli',        aciklama: 'Girdi tanımlı',                            zorunlu: true },
  { no: 22, grup: 'E', ad: 'girdi_olculebilir',    aciklama: 'Girdi ölçülebilir',                        zorunlu: true },
  { no: 23, grup: 'E', ad: 'girdi_kaynagi',        aciklama: 'Girdi kaynağı belli',                      zorunlu: true },
  { no: 24, grup: 'E', ad: 'surec_tanimli',        aciklama: 'Süreç tanımlı',                            zorunlu: true },
  { no: 25, grup: 'E', ad: 'surec_adimlari',       aciklama: 'Süreç adımları net',                       zorunlu: true },
  { no: 26, grup: 'E', ad: 'surec_kontrol',        aciklama: 'Süreç kontrol noktaları var',              zorunlu: false },
  { no: 27, grup: 'E', ad: 'cikti_tanimli',        aciklama: 'Çıktı tanımlı',                            zorunlu: true },
  { no: 28, grup: 'E', ad: 'cikti_olculebilir',    aciklama: 'Çıktı ölçülebilir',                        zorunlu: true },
  { no: 29, grup: 'E', ad: 'girdi_cikti_iliskisi', aciklama: 'Girdi–çıktı ilişkisi tanımlı',             zorunlu: true },
  { no: 30, grup: 'E', ad: 'surec_baglantisi',     aciklama: 'Süreç girdi ile çıktıyı bağlıyor',         zorunlu: true },

  // ── GRUP F: KANIT VE VERİ (31-37) ─────────────────────────
  { no: 31, grup: 'F', ad: 'referans_noktasi',     aciklama: 'Referans/karşılaştırma noktası var',       zorunlu: true },
  { no: 32, grup: 'F', ad: 'kanit_var',            aciklama: 'Kanıt var',                                zorunlu: true },
  { no: 33, grup: 'F', ad: 'iki_bagimsiz_kanit',   aciklama: 'En az iki bağımsız kanıt var',             zorunlu: false },
  { no: 34, grup: 'F', ad: 'kanitlar_uyumlu',      aciklama: 'Kanıtlar uyumlu',                          zorunlu: false },
  { no: 35, grup: 'F', ad: 'veri_eksiksiz',        aciklama: 'Veri eksiksiz',                            zorunlu: true },
  { no: 36, grup: 'F', ad: 'veri_tutarli',         aciklama: 'Veri tutarlı',                             zorunlu: true },
  { no: 37, grup: 'F', ad: 'aykirı_veri_isaretli', aciklama: 'Aykırı veri işaretli',                     zorunlu: false },

  // ── GRUP G: TEKRARLANABILIRLIK (38-44) ────────────────────
  { no: 38, grup: 'G', ad: 'repro_adimi',          aciklama: 'Repro adımı var',                          zorunlu: true },
  { no: 39, grup: 'G', ad: 'repro_tutarli',        aciklama: 'Repro aynı sonucu veriyor',                zorunlu: false },
  { no: 40, grup: 'G', ad: 'problem_daraltilmis',  aciklama: 'Problem daraltılmış',                      zorunlu: false },
  { no: 41, grup: 'G', ad: 'yorum_yok',            aciklama: 'Yorum yok',                                zorunlu: true },
  { no: 42, grup: 'G', ad: 'varsayim_yok',         aciklama: 'Varsayım yok',                             zorunlu: true },
  { no: 43, grup: 'G', ad: 'denetlenebilir',       aciklama: 'Denetlenebilir',                           zorunlu: true },
  { no: 44, grup: 'G', ad: 'tekrar_edilebilir',    aciklama: 'Tekrar edilebilir',                        zorunlu: true },
]);

const ZORUNLU_MADDELER = PDP44_MADDELER.filter(m => m.zorunlu);
const OPSIYONEL_MADDELER = PDP44_MADDELER.filter(m => !m.zorunlu);
const ZORUNLU_SAYISI = ZORUNLU_MADDELER.length; // 35
const TOPLAM_MADDE = PDP44_MADDELER.length;     // 44

// ── GRUP AGIRLIK TANIMI ──────────────────────────────────────
const GRUP_AGIRLIK = Object.freeze({
  A: { ad: 'Problem İfadesi',          agirlik: 25, madde_sayisi: 5  },
  B: { ad: 'Kapsam ve Bağlam',         agirlik: 20, madde_sayisi: 7  },
  C: { ad: 'Beklenen vs Gerçekleşen',  agirlik: 15, madde_sayisi: 4  },
  D: { ad: 'Ölçüm',                    agirlik: 10, madde_sayisi: 4  },
  E: { ad: 'Girdi–Süreç–Çıktı',        agirlik: 15, madde_sayisi: 10 },
  F: { ad: 'Kanıt ve Veri',            agirlik: 10, madde_sayisi: 7  },
  G: { ad: 'Tekrarlanabilirlik',        agirlik: 5,  madde_sayisi: 7  },
});

// ── AI PROMPT FORMATI ────────────────────────────────────────
const PDP44_AI_PROMPT = `
════════════════════════════════════════════════════════
PROBLEM TANIMI PROTOKOLÜ — PDP-44 (MDS-160 UYUMLU)
════════════════════════════════════════════════════════
Her görevi bu 44 madde ile değerlendirirsin.
Her madde için: ✅ MEVCUT | ❌ EKSİK | ⚠️ KISMI yaz.

GRUP A — Problem İfadesi (1-5) [%25 ağırlık]
  1. Tek problem ifadesi var
  2. Problem açık ve tek anlamlı
  3. Sistem sınırı tanımlı
  4. Belirti ölçülebilir
  5. Etki sayısal

GRUP B — Kapsam ve Bağlam (6-12) [%20 ağırlık]
  6. Etkilenen sistem/bileşen belirtilmiş
  7. Ortam/yer belirtilmiş
  8. Zaman/koşul belirtilmiş
  9. Başlangıç zamanı var
  10. Sıklık belirtilmiş
  11. Kapsam tanımlı
  12. Etkilenmeyen alanlar belirtilmiş

GRUP C — Beklenen vs Gerçekleşen (13-16) [%15 ağırlık]
  13. Beklenen durum yazılmış
  14. Gerçekleşen durum yazılmış
  15. Fark net
  16. Ölçüm metriği var

GRUP D — Ölçüm (17-20) [%10 ağırlık]
  17. Ölçüm birimi var
  18. Ölçüm yöntemi var
  19. Veri kaynağı var
  20. Zaman damgası var

GRUP E — Girdi–Süreç–Çıktı (21-30) [%15 ağırlık]
  21. Girdi tanımlı
  22. Girdi ölçülebilir
  23. Girdi kaynağı belli
  24. Süreç tanımlı
  25. Süreç adımları net
  26. Süreç kontrol noktaları var
  27. Çıktı tanımlı
  28. Çıktı ölçülebilir
  29. Girdi–çıktı ilişkisi tanımlı
  30. Süreç girdi ile çıktıyı bağlıyor

GRUP F — Kanıt ve Veri (31-37) [%10 ağırlık]
  31. Referans/karşılaştırma noktası var
  32. Kanıt var
  33. En az iki bağımsız kanıt var
  34. Kanıtlar uyumlu
  35. Veri eksiksiz
  36. Veri tutarlı
  37. Aykırı veri işaretli

GRUP G — Tekrarlanabilirlik (38-44) [%5 ağırlık]
  38. Repro adımı var
  39. Repro aynı sonucu veriyor
  40. Problem daraltılmış
  41. Yorum yok
  42. Varsayım yok
  43. Denetlenebilir
  44. Tekrar edilebilir

════════════════════════════════════════════════════════
ÇIKTI FORMATI (SAPMA = GEÇERSİZ):
[PDP44_PUANI]: XX/44 (YY puan ağırlıklı)
[KRİTİK_EKSİKLER]: Madde numaralarını listele
[DURUM]: TAM_TANIMLI | EKSİK_VERİ | TAM_BELIRSIZ
[EKSİK_MADDELER]: ...
[AKSİYON]: Görevi kabul et veya kullanıcıdan eksik bilgileri iste
════════════════════════════════════════════════════════`;

// ── ANAHTAR KELİME TABLOSU — 44 MADDE TAM KAPSAM ────────────
// Her maddenin varlığının otomatik tespiti için ipuçları.
// NOT: Keyword dedektör tamamlayıcıdır. Kesin karar AI'ya bırakılır.
// DÜZELTİLDİ (2026-04-25): Önceki sürümde sadece 10/44 madde
// dedektörlüydü; 34 madde (26 zorunlu) dedektörsüz kaldığı için
// tüm görevler otomatik TAM_BELIRSIZ ile reddediliyordu.
const MADDE_DETEKTORLERI = {

  // ── GRUP A: PROBLEM İFADESİ (1-5) ─────────────────────────
  tek_problem:         ['problem', 'sorun', 'görev', 'iş', 'konu', 'mesele', 'yap', 'oluştur', 'geliştir', 'ekle', 'düzelt', 'kur', 'güncelle', 'sil', 'değiştir', 'entegre', 'bağla', 'kontrol', 'analiz', 'incele', 'hazırla', 'planla', 'taşı', 'aktar', 'dönüştür', 'optimize'],
  tek_anlamli:         ['yapılacak', 'yapılması', 'istenen', 'gerekli', 'lazım', 'ihtiyaç', 'hedef', 'amaç', 'olmalı', 'olacak', 'edilecek', 'edilmeli', 'sağla', 'tamamla', 'bitir', 'başla', 'kur', 'oluştur', 'yap', 'et', 'çalıştır', 'getir', 'gönder'],
  sistem_siniri:       ['sistem', 'modül', 'bileşen', 'panel', 'servis', 'departman', 'dosya', 'fonksiyon', 'sayfa', 'ekran', 'api', 'veritabanı', 'tablo', 'motor', 'bot', 'whatsapp', 'telegram', 'frontend', 'backend', 'sunucu', 'port', 'supabase', 'endpoint', 'route', 'index', 'komponent', 'menü'],
  belirti_olculebilir: ['hata', 'sorun', 'çalışmıyor', 'başarısız', 'düşük', 'yüksek', 'yavaş', 'bozuk', 'kırık', 'eksik', 'fazla', 'olmadı', 'olmuyor', 'gelmiyor', 'gitmiyor', 'açılmıyor', 'kapanmıyor', 'red', 'fail', 'error', 'crash', 'timeout', 'boş', 'çöküyor', 'donuyor', 'yanıt vermiyor'],
  etki_sayisal:        ['%', 'adet', 'tane', 'lira', 'sn', 'ms', 'kb', 'mb', 'gb', 'kez', 'kullanıcı', 'sayı', 'miktar', 'oran', 'puan', 'skor', 'seviye', 'derece', 'birim'],

  // ── GRUP B: KAPSAM VE BAĞLAM (6-12) ───────────────────────
  etkilenen_bilesen:   ['panel', 'modül', 'servis', 'departman', 'tablo', 'api', 'fonksiyon', 'sayfa', 'dosya', 'motor', 'bot', 'sistem', 'bileşen', 'ekran', 'menü', 'buton', 'form', 'endpoint', 'veritabanı', 'ajan', 'komponent', 'route', 'script', 'algoritma'],
  ortam_belli:         ['ortam', 'sunucu', 'localhost', 'production', 'test', 'geliştirme', 'windows', 'linux', 'tarayıcı', 'browser', 'lokal', 'bulut', 'cloud', 'canlı', 'dev', 'staging', 'masaüstü', 'mobil', 'port', 'local', 'bilgisayar', 'makine', 'terminal', 'konsol'],
  zaman_kosul:         ['zaman', 'süre', 'koşul', 'durum', 'ne zaman', 'sırasında', 'esnasında', 'sonrasında', 'öncesinde', 'başladığında', 'bittiğinde', 'her', 'bazen', 'sürekli', 'şu an', 'şimdi', 'acil', 'hemen', 'bugün', 'yarın', 'dün', 'hafta'],
  baslangic_zamani:    ['tarih', 'saat', 'başladı', 'ne zaman', 'ilk', 'önce', 'sonra', 'itibaren', 'bugün', 'dün', 'bu hafta', 'şu an', 'şimdi', 'güncel'],
  siklik_belli:        ['her gün', 'dakikada', 'saatte', 'sürekli', 'aralıklı', 'zaman zaman', 'kez', 'periyodik', 'döngü', 'tekrarlı', 'rutin'],
  kapsam_tanimli:      ['kapsam', 'sınır', 'alan', 'dahil', 'hariç', 'sadece', 'yalnızca', 'arasında', 'içinde', 'dışında', 'ilgili', 'ile', 'için', 'üzerinde', 'hakkında', 'departman', 'modül', 'bölüm', 'proje'],
  etkilenmeyen_belli:  ['etkilenmeyen', 'dışında', 'hariç', 'dışındaki', 'bunun dışında', 'diğer', 'geri kalan', 'bağımsız'],

  // ── GRUP C: BEKLENEN vs GERÇEKLEŞEN (13-16) ───────────────
  beklenen_durum:      ['beklenen', 'olması gereken', 'hedef', 'istenen', 'doğru olan', 'normal', 'olmalı', 'gerekiyor', 'lazım', 'amaç', 'plan'],
  gerceklesen_durum:   ['olan', 'gerçekleşen', 'mevcut', 'şu an', 'hata', 'sorun', 'ama', 'fakat', 'ancak', 'maalesef', 'çalışmıyor', 'olmuyor', 'etmiyor', 'vermiyor', 'gelmiyor'],
  fark_net:            ['fark', 'değişiklik', 'sapma', 'farklı', 'yerine', 'ama', 'ancak', 'oysa', 'beklenmiyor', 'olması gerekirken', 'aksine', 'tersine', 'sorun', 'hata', 'bozuk', 'yanlış'],
  olcum_metrigi:       ['metrik', 'kpi', 'ölçü', 'gösterge', 'kriter', 'standart', 'performans', 'başarı', 'oran', 'skor', 'puan', 'derece', 'kalite', 'verimlilik', 'hız', 'doğruluk'],

  // ── GRUP D: ÖLÇÜM (17-20) ─────────────────────────────────
  olcum_birimi:        ['birim', 'saniye', 'dakika', 'saat', 'gün', 'kb', 'mb', 'gb', 'adet', 'sayı', 'puan', 'yüzde', '%', 'ms', 'sn', 'pixel', 'satır', 'karakter', 'tl', 'lira', 'dolar', 'byte'],
  olcum_yontemi:       ['yöntem', 'ölçme', 'test', 'kontrol', 'doğrulama', 'izleme', 'takip', 'monitör', 'analiz', 'tarama', 'denetim', 'inceleme', 'gözlem', 'sayma', 'hesaplama', 'loglama'],
  veri_kaynagi:        ['veritabanı', 'tablo', 'api', 'dosya', 'log', 'supabase', 'kaynak', 'db', 'database', 'json', 'csv', 'endpoint', 'sorgu', 'query', 'veri tabanı', 'store', 'cache'],
  zaman_damgasi:       ['2024', '2025', '2026', ':', 'tarih', 'saat', 'süre', 'zaman', 'şimdi', 'bugün', 'an', 'timestamp'],

  // ── GRUP E: GİRDİ–SÜREÇ–ÇIKTI (21-30) ────────────────────
  girdi_tanimli:       ['girdi', 'giriş', 'input', 'kaynak', 'veri', 'parametre', 'komut', 'mesaj', 'istek', 'request', 'gelen', 'alınan', 'okunan', 'yüklenen'],
  girdi_olculebilir:   ['boyut', 'uzunluk', 'büyüklük', 'limit', 'sınır', 'değer', 'aralık', 'miktar', 'sayı', 'ölçü', 'minimum', 'maksimum', 'en az', 'en fazla', 'karakter', 'satır', 'byte'],
  girdi_kaynagi:       ['kaynağı', 'gelen', 'alan', 'toplayan', 'form', 'kullanıcı', 'istek', 'webhook', 'api', 'panel', 'bot', 'mesaj', 'komut', 'dosya', 'veritabanı', 'supabase', 'whatsapp', 'telegram'],
  surec_tanimli:       ['süreç', 'adım', 'akış', 'pipeline', 'işlem', 'fonksiyon', 'api', 'metod', 'algoritma', 'mantık', 'logic', 'motor'],
  surec_adimlari:      ['adım', 'sıra', 'önce', 'sonra', 'ardından', 'ilk', 'ikinci', 'başla', 'bitir', 'aşama', 'faz', 'kademe', 'sırayla', 'sonrasında', 'devamında', 'akabinde', 'takiben'],
  surec_kontrol:       ['kontrol noktası', 'checkpoint', 'doğrulama', 'validasyon', 'onay', 'denetim', 'check', 'verify', 'kontrol', 'test'],
  cikti_tanimli:       ['çıktı', 'sonuç', 'output', 'yanıt', 'rapor', 'üretilen', 'dönen', 'response', 'cevap', 'oluşan', 'kayıt'],
  cikti_olculebilir:   ['doğru', 'başarılı', 'tamamlandı', 'oluşturuldu', 'kaydedildi', 'gönderildi', 'döndü', 'geçti', 'pass', 'onaylandı', 'kabul', 'beklenen sonuç', 'beklenen çıktı'],
  girdi_cikti_iliskisi:['dönüştür', 'üret', 'hesapla', 'oluştur', 'çevir', 'sonucunda', 'sonuç olarak', 'çıktısı', 'üretir', 'verir', 'döndürür', 'sağlar', 'elde', 'yazar', 'kaydeder', 'gönderir'],
  surec_baglantisi:    ['bağlantı', 'entegrasyon', 'akış', 'pipeline', 'köprü', 'iletişim', 'haberleşme', 'bağla', 'entegre', 'yönlendir', 'ilet', 'gönder', 'al', 'route', 'ara', 'çağır'],

  // ── GRUP F: KANIT VE VERİ (31-37) ─────────────────────────
  referans_noktasi:    ['referans', 'karşılaştırma', 'benchmark', 'önceki', 'mevcut', 'standart', 'baz', 'temel', 'başlangıç', 'varsayılan', 'default', 'orijinal', 'eski', 'yeni'],
  kanit_var:           ['log', 'hata mesajı', 'ekran görüntüsü', 'kayıt', 'rapor', 'çıktı', 'kanıt', 'görüntü', 'screenshot', 'trace', 'stack', 'konsol', 'terminal'],
  iki_bagimsiz_kanit:  ['iki', 'birden fazla', 'çoklu', 'bağımsız', 'ayrı', 'farklı kaynak', 'hem', 'birkaç', 'çeşitli'],
  kanitlar_uyumlu:     ['uyumlu', 'tutarlı', 'destekleyen', 'doğrulayan', 'örtüşen', 'eşleşen', 'aynı sonuç', 'teyit'],
  veri_eksiksiz:       ['tam', 'eksiksiz', 'tüm', 'tamamı', 'bütün', 'hepsi', 'komple', 'full', 'tamamen', 'tamamlanmış', 'tamamla', 'bitir'],
  veri_tutarli:        ['tutarlı', 'uyumlu', 'doğru', 'geçerli', 'onaylanmış', 'doğrulanmış', 'valid', 'sağlam', 'güvenilir', 'stabil'],
  aykiri_veri_isaretli:['aykırı', 'anormal', 'beklenmeyen', 'olağandışı', 'uyumsuz', 'sapma', 'outlier', 'garip', 'tuhaf'],

  // ── GRUP G: TEKRARLANABILIRLIK (38-44) ────────────────────
  repro_adimi:         ['tekrar', 'yeniden', 'adım', 'uygula', 'çalıştır', 'test', 'dene', 'reproduce', 'yapılır', 'yapılacak', 'nasıl', 'prosedür', 'talimat'],
  repro_tutarli:       ['aynı', 'tutarlı', 'her seferinde', 'tekrarlanıyor', 'sürekli', 'hep', 'daima', 'değişmiyor', 'sabit'],
  problem_daraltilmis: ['daraltılmış', 'izole', 'spesifik', 'belirli', 'odaklanmış', 'sadece', 'yalnızca', 'tek', 'özel', 'bu', 'şu'],
  yorum_yok:           ['kesin', 'net', 'açık', 'belirli', 'somut', 'doğrudan', 'direkt', 'spesifik', 'tam olarak', 'şu', 'bu', 'yapılacak', 'yapılması'],
  varsayim_yok:        ['doğrulanmış', 'kanıtlanmış', 'gözlemlenmiş', 'test edilmiş', 'tespit', 'görüldü', 'belirlendi', 'saptandı', 'kesin', 'net', 'belli', 'bilinen', 'onaylanmış'],
  denetlenebilir:      ['denetim', 'kontrol', 'izlenebilir', 'kayıt', 'log', 'takip', 'rapor', 'audit', 'trace', 'loglama', 'iz', 'izleme', 'monitör'],
  tekrar_edilebilir:   ['tekrar', 'yeniden', 'aynı', 'her seferinde', 'tutarlı', 'repro', 'yinelenebilir', 'sürekli', 'hep', 'stabil', 'sabit', 'deterministik'],
};

/**
 * PDP-44'ü bir komut/görev metni üzerinde basit otomatik analiz yapar.
 * NOT: Bu otomatik analiz tamamlayıcıdır. Kesin karar AI'ya bırakılır.
 *
 * @param {string} metin - Analiz edilecek görev/problem metni
 * @returns {{ puan: number, eksikler: string[], tam: boolean, durum: string }}
 */
function pdp44OtomatikTarama(metin) {
  if (!metin || typeof metin !== 'string') {
    return { puan: 0, eksikler: PDP44_MADDELER.map(m => m.no + '. ' + m.aciklama), tam: false, durum: 'TAM_BELIRSIZ' };
  }

  const lower = metin.toLowerCase();
  const eksikler = [];
  let puan = 0;

  for (const madde of PDP44_MADDELER) {
    const dedektorlar = MADDE_DETEKTORLERI[madde.ad];
    let bulundu = false;

    if (dedektorlar) {
      bulundu = dedektorlar.some(ipucu => lower.includes(ipucu));
    }

    if (bulundu) {
      puan++;
    } else if (madde.zorunlu) {
      eksikler.push(`${madde.no}. ${madde.aciklama} [ZORUNLU]`);
    } else {
      eksikler.push(`${madde.no}. ${madde.aciklama} [OPSİYONEL]`);
    }
  }

  const zorunluEksik = eksikler.filter(e => e.includes('[ZORUNLU]')).length;
  // DÜZELTİLDİ (2026-04-26): Eşik 30 → 33.
  // Mantık: 35 zorunlu maddenin en az 2'si eşleşmeli → görev minimum tanımlı.
  // ≤33 = EKSİK_VERİ (AI tamamlayacak), >33 = TAM_BELIRSIZ (RED — tamamen boş/çöp girdi).
  // Neden: Kullanıcının normal "şunu yap" tarzı komutları 4-10 puan alıyor,
  // eski eşik bunları reddediyordu. Şimdi sadece 1 kelimelik anlamsız girdiler reddedilir.
  const durum = zorunluEksik === 0 ? 'TAM_TANIMLI' :
                zorunluEksik <= 33 ? 'EKSİK_VERİ'  : 'TAM_BELIRSIZ';

  return { puan, toplam: TOPLAM_MADDE, eksikler, tam: zorunluEksik === 0, durum };
}

/**
 * PDP-44 Denetim Raporu üretir (komut_alim.js entegrasyonu için)
 */
function pdp44Rapor(metin) {
  const tarama = pdp44OtomatikTarama(metin);
  return {
    pdp44_puan:    `${tarama.puan}/${TOPLAM_MADDE}`,
    durum:         tarama.durum,
    tam_tanimli:   tarama.tam,
    eksik_maddeler: tarama.eksikler.filter(e => e.includes('[ZORUNLU]')),
    opsiyonel_eksik: tarama.eksikler.filter(e => e.includes('[OPSİYONEL]')),
    aksiyon:       tarama.tam ? 'KABUL_EDILEBILIR' : 'EKSİK_BILGI_TALEP_ET',
    ai_prompt:     PDP44_AI_PROMPT,
  };
}

module.exports = {
  PDP44_MADDELER,
  ZORUNLU_MADDELER,
  OPSIYONEL_MADDELER,
  GRUP_AGIRLIK,
  PDP44_AI_PROMPT,
  pdp44OtomatikTarama,
  pdp44Rapor,
  TOPLAM_MADDE,
  ZORUNLU_SAYISI,
};
