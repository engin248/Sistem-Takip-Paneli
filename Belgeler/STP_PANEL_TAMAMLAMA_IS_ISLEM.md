# STP — PANEL TAMAMLAMA İŞ-İŞLEM PLANI
> **Görev ID:** TASK-20260418-001  
> **Kapsam:** Komuta Paneli Eksiklikleri ve İletişim Hattı  
> **Sorumlu:** L1 - Antigravity

## 1. ADIMLAR VE İCRA SIRASI

| No | İşlem | Sorumlu | Beklenen Çıktı | Test Kriteri |
|----|-------|---------|----------------|--------------|
| 1 | `api/hub/messages` 500 hatası analizi ve fix | L1 | Hata kodunun 200'e dönmesi | curl/fetch testi |
| 2 | `.next` temizliği ve dev sunucu stabilizasyonu | L1 | Kesintisiz dev server akışı | 3000 port erişimi |
| 3 | 16 Ekran bileşenlerinin veri bağlantısı kontrolü | L1 | Placeholder'ların canlı veriye bağlanması | Dashboard visual check |
| 4 | Ajan Bootstrap sürecinin tetiklenmesi | L1 | 50 ajanın DB'ye sağlıklı kaydı | `api/agents` listesi |

## 2. TEKNİK KISITLAR
- Dış API bağımlılığı kesinlikle olmayacak.
- Tüm loglar `audit_logs` tablosuna yazılacak.
- Hata anında süreç durdurulacak (NİZAM #5).

## 3. DOĞRULAMA (VALIDATION)
- L2 Denetçi, her adımın loglarını inceleyerek `Kontrol_Sayfasi` raporu verecektir.
- QA, `Final_QA_Raporu` ile süreci mühürleyecektir.

---
**KANIT:** [PROJE/00_PLANLAMA/02_Is_Islem_Plani/STP_PANEL_TAMAMLAMA_IS_ISLEM.md]
