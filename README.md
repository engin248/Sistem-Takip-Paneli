# Sistem Kontrol Merkezi

> Bağımsız komuta merkezi — tüm sistemleri dışarıdan izler, kontrol eder, denetler.

## Bu Sistem Ne Yapar?
- Tüm sistemleri gerçek zamanlı izler (47 Sil Baştan, Analiz Motoru, ARGE, ve gelecekte kurulacak tüm sistemler)
- Her işlemi çift kontrol mekanizmasından geçirir
- Değiştirilmez kayıt tutar (immutable log)
- Alarm ve eskalasyon yönetir

## Teknik
- Next.js bağımsız uygulama
- Supabase veritabanı (ayrı şema veya ortak DB üzerinde ayrı tablolar)
- Tüm sistemlere API/webhook/realtime ile bağlantı

## Dosya Yapısı
```
sistem-kontrol-merkezi/
├── README.md
├── database/
│   └── skm_kurulum.sql        # Veritabanı tabloları
├── src/
│   ├── lib/
│   │   └── skm.js              # Backend kütüphane
│   └── app/
│       └── page.js             # Komuta ekranı
```
