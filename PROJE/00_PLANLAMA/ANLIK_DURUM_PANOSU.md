# ANLIK DURUM PANOSU — KOMUTA MERKEZİ

Bu dosya tek gerçek durum kaydıdır. Kanıt linki olmayan iş **yapılmamış** sayılır.

## 1) Ekip Dağılımı

| Kişi | Rol | Sorumluluk |
|---|---|---|
| KISI-1 | İŞ-1 (Uygulama) | Görevi uygular, çıktı üretir |
| KISI-2 | İŞ-2 (Uygulama Destek) | Kanıt/log toplar, teslim paketi hazırlar |
| KISI-3 | PLAN KONTROL | Proje/İş-İşlem/Operasyon planı tutarlılık kontrolü |
| KISI-4 | KONTROL-1 | K-1/K-2/K-4 uygunluk denetimi |
| KISI-5 | KONTROL-2 | K-5 doğrulama denetimi |
| COPILOT-QA | FINAL QA | Final karar: ONAY / DÜZELTME / RED |

---

## 2) Aktif İş Emirleri

| İş Emri | Sorumlu | Başlangıç | Durum | Kanıt | Not |
|---|---|---|---|---|---|
| EMIR-PLAN-001 — Proje Planı v1 | KISI-1 | 2026-04-18 | BEKLIYOR | YOK | Plan şablonu kilitlenecek |
| EMIR-PLAN-002 — İş-İşlem Planı v1 | KISI-2 | 2026-04-18 | BEKLIYOR | YOK | Adım/alt adım/checkpoint zorunlu |
| EMIR-PLAN-003 — Operasyon Planı v1 | KISI-1 | 2026-04-18 | BEKLIYOR | YOK | Eskalasyon + runbook zorunlu |
| EMIR-KONTROL-001 — Plan Kontrol | KISI-3 | 2026-04-18 | BEKLIYOR | YOK | Plan onayı olmadan uygulama başlamaz |
| EMIR-KONTROL-002 — Uygunluk Denetimi | KISI-4 | 2026-04-18 | BEKLIYOR | YOK | K-1/K-2/K-4 |
| EMIR-KONTROL-003 — Final Doğrulama | KISI-5 | 2026-04-18 | BEKLIYOR | YOK | K-5 |

---

## 3) Zorunlu Kanıt Paketi (Her İş Emri)

1. Değişen dosya listesi
2. Yapılan adımlar (zaman damgalı)
3. Test/doğrulama çıktısı
4. Log/ekran görüntüsü/endpoint sonucu
5. Sorumlu kişi ve onaylayan kişi

> Kanıt paketi eksikse durum otomatik: **DÜZELTME**

---

## 4) Final QA Karar Defteri (COPILOT-QA)

| İş Emri | Karar | Gerekçe | Tarih |
|---|---|---|---|
| EMIR-PLAN-001 | BEKLIYOR | Kanıt bekleniyor | 2026-04-18 |
| EMIR-PLAN-002 | BEKLIYOR | Kanıt bekleniyor | 2026-04-18 |
| EMIR-PLAN-003 | BEKLIYOR | Kanıt bekleniyor | 2026-04-18 |

---

## 5) Kesin Kural

- Plan Kontrol onayı yoksa uygulama başlamaz.
- 2 kontrol raporu yoksa final QA'ya geçemez.
- Final QA ONAYı olmadan iş kapanmaz.
- Kanıt yoksa iş yapılmamış sayılır.
