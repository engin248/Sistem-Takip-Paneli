// TEK PARÇA KOD: 25 Dış Saha (Telefon/Mobil) Timi ve 3 IT (Bilgi İşlem) Timi Tanımlamaları

const orduKatalog = {
  DisSahaTimleri: [],
  BilgiIslemTimleri: []
};

// 1. 25 ADET DIŞ SAHA (TELEFON) TİMİ OLUŞTURMA
// Kullanıcı emri: "Telefonda yapılabilecek her işlemde en üst seviye uzman"
const telefonUzmanliklari = [
  "Mobil İletişim, Hızlı Kriz Yönetimi, SMS/WP İstihbaratı",
  "Sosyal Medya Radarı, Anlık Veri Yakalama, Trend Okuma",
  "Müşteri Asistanlığı, Soğukkanlı Diyalog, Müşteri Profili Analizi",
  "Açık Kaynak (OSINT) İnceleme, Mobil Lokasyon Analizi, Harita Verisi",
  "Lojistik ve Tedarik Takibi, Kurye/Araç Rota Organizasyonu"
];

for (let i = 1; i <= 25; i++) {
  orduKatalog.DisSahaTimleri.push({
    tim_id: `DIS-SAHA-TİM-${i.toString().padStart(2, '0')}`,
    uzmanlik: telefonUzmanliklari[i % 5],
    profil: "Mobil Cihazlar Üzerinden Tüm İşlemlerde Sınırsız Otonom Yetkinlik",
    durum: "SAHADA AKTİF",
    komut_ag: ["WhatsApp", "Telegram", "Mobil Arayüz"]
  });
}

// 2. 3 ADET TEKNOLOJİ VE BİLGİ İŞLEM TİMİ (Aktif, Yedek, Hazır Kıta)
// Kullanıcı emri: "Bir veya en fazla iki donanım/yazılım konusunda en üst düzey donanımlı gruplar"
orduKatalog.BilgiIslemTimleri = [
  {
    tim_id: "IT-TİM-01-AKTİF",
    tip: "Ana Müdahale",
    ajanlar: [
      { id: "IT-A1", uzmanlik: "Veritabanı (Supabase) ve REST API Mimarisi", derece: "EN ÜST SEVİYE" },
      { id: "IT-A2", uzmanlik: "Next.js / React Frontend Optimizasyonu", derece: "EN ÜST SEVİYE" },
      { id: "IT-A3", uzmanlik: "Donanım Ağ Sürücüleri ve PnP Resetleme", derece: "EN ÜST SEVİYE" }
    ]
  },
  {
    tim_id: "IT-TİM-02-YEDEK",
    tip: "İkincil Destek",
    ajanlar: [
      { id: "IT-Y1", uzmanlik: "Siber Güvenlik, Token İzleme, Hata Giderme", derece: "EN ÜST SEVİYE" },
      { id: "IT-Y2", uzmanlik: "Yapay Zeka (Ollama) Parametre ve Modelfile Ayarları", derece: "EN ÜST SEVİYE" },
      { id: "IT-Y3", uzmanlik: "Node.js Backend / Log ve Telemetri Uzmanı", derece: "EN ÜST SEVİYE" }
    ]
  },
  {
    tim_id: "IT-TİM-03-HAZIR_KITA",
    tip: "Acil Durum (Standby)",
    ajanlar: [
      { id: "IT-H1", uzmanlik: "Bulut Yedekleme, Vercel/Sunucu Deploy Uzmanı", derece: "EN ÜST SEVİYE" },
      { id: "IT-H2", uzmanlik: "Veri Kurtarma ve Kritik Algoritma Yeniden Yazımı", derece: "EN ÜST SEVİYE" },
      { id: "IT-H3", uzmanlik: "Edge-TTS Ses Servisleri ve Medya İletişimi", derece: "EN ÜST SEVİYE" }
    ]
  }
];

module.exports = orduKatalog;
console.log("[SİSTEM] 25 Dış Saha (Telefon) Timi ve 3 IT (Bilgi İşlem) Timi Başarıyla Kodlandı ve Kataloglandı.");
