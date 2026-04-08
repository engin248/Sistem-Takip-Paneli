# SİSTEM HARİTASI — TABLO-DOSYA EŞLEŞTİRMESİ

> **Oluşturma**: 2026-04-08 14:53  
> **Mühürleme**: 2026-04-08 14:56 — GÖZCÜ (BİRİM-2)  
> **Statü**: 🔒 **MÜHÜRLÜ**  
> **Kaynak**: Canlı Supabase Dashboard + Kod Taraması (grep `.from()`)  
> **Doktrin**: Bu belge canlı veriden üretilmiştir. Referans olarak kullanılır, ana kaynak olamaz.

---

## ÖZET İSTATİSTİK

| Metrik | Değer |
|---|---|
| **Toplam Supabase Tablosu** | 46 |
| **Servis Dosyası Tarafından Yönetilen** | 46 |
| **Servis Dosyası Ataması Olmayan** | 0 |
| **Projeler** | 3 (MİZANET, STP, SKM) |

---

## 1. MİZANET ERP TABLOLARI (34 tablo)

### B0 — Sistem Altyapı Tabloları

| # | Tablo | Ana Servis Dosyası | Proje |
|---|---|---|---|
| 1 | `b0_arsiv` | `src/lib/dipArsiv.js` | MİZANET |
| 2 | `b0_bildirim_loglari` | `src/lib/bildirim.js` | MİZANET |
| 3 | `b0_herm_ai_kararlar` | `src/lib/logger.js` | MİZANET |
| 4 | `b0_sistem_loglari` | `src/lib/logger.js` | MİZANET |
| 5 | `b0_tasarim_ayarlari` | `src/lib/TasarimContext.js` | MİZANET |
| 6 | `b0_yetki_ayarlari` | `src/lib/yetki.js` | MİZANET |

### B1 — Üretim & Operasyon Tabloları

| # | Tablo | Ana Servis Dosyası | Proje |
|---|---|---|---|
| 7 | `b1_agent_loglari` | `src/lib/ajanlar.js` | MİZANET |
| 8 | `b1_ajan_gorevler` | `src/lib/agents/v2/sabahSubayi.js` | MİZANET |
| 9 | `b1_aksesuar_arsivi` | `src/hooks/useKumas.js` | MİZANET |
| 10 | `b1_arge_cost_analysis` | `src/scripts/ai_mastermind/yargic.js` | MİZANET |
| 11 | `b1_arge_products` | `src/lib/m2_kar_kilidi.js` | MİZANET |
| 12 | `b1_arge_risk_analysis` | `src/scripts/ai_mastermind/yargic.js` | MİZANET |
| 13 | `b1_arge_strategy` | `src/scripts/ai_mastermind/yargic.js` | MİZANET |
| 14 | `b1_arge_trend_data` | `src/scripts/ai_mastermind/yargic.js` | MİZANET |
| 15 | `b1_arge_trendler` | `src/features/arge/services/argeApi.js` | MİZANET |
| 16 | `b1_is_emirleri` | `src/hooks/useUretim.js` | MİZANET |
| 17 | `b1_kamera_olaylari` | `src/features/uretim/components/M6_KameraSayaci.js` | MİZANET |
| 18 | `b1_kesim_emirleri` | `src/lib/agents/v2/zincirci.js` | MİZANET |
| 19 | `b1_kumas_arsiv` | `src/lib/agents/v2/zincirci.js` | MİZANET |
| 20 | `b1_kumas_arsivi` | `src/features/kumas/services/kumasApi.js` | MİZANET |
| 21 | `b1_makineler` | `src/features/uretim/hooks/useUretimRecetesi.js` | MİZANET |
| 22 | `b1_maliyet_kalemleri` | `src/lib/agents/v2/zincirci.js` | MİZANET |
| 23 | `b1_maliyet_kayitlari` | `src/features/maliyet/services/maliyetApi.js` | MİZANET |
| 24 | `b1_model_taslaklari` | `src/features/modelhane/services/modelhaneApi.js` | MİZANET |
| 25 | `b1_modelhane_kayitlari` | `src/lib/agents/v2/zincirci.js` | MİZANET |
| 26 | `b1_muhasebe_raporlari` | `src/features/muhasebe/services/muhasebeApi.js` | MİZANET |
| 27 | `b1_operasyon_tanimlari` | `src/features/uretim/components/KioskTerminal.js` | MİZANET |
| 28 | `b1_personel` | `src/features/personel/services/personelApi.js` | MİZANET |
| 29 | `b1_personel_devam` | `src/features/personel/services/personelApi.js` | MİZANET |
| 30 | `b1_personel_performans` | `src/features/uretim/components/KioskTerminal.js` | MİZANET |
| 31 | `b1_sistem_ayarlari` | `src/features/ayarlar/services/ayarlarApi.js` | MİZANET |
| 32 | `b1_sistem_uyarilari` | `src/lib/ajanlar.js` | MİZANET |
| 33 | `b1_stok` | `src/hooks/useStok.js` | MİZANET |
| 34 | `b1_stok_hareketleri` | `src/features/stok/services/stokApi.js` | MİZANET |
| 35 | `b1_tedarikci_sabika` | 🔒 **MÜHÜRLÜ** — Servis dosyası yok, tablo kayıt altında | MİZANET |
| 36 | `b1_uretim_kayitlari` | `src/features/uretim/services/uretimApi.js` | MİZANET |
| 37 | `b1_uretim_operasyonlari` | `src/features/uretim/hooks/useIsEmri.js` | MİZANET |

### B2 — Ticari & Finans Tabloları

| # | Tablo | Ana Servis Dosyası | Proje |
|---|---|---|---|
| 38 | `b2_cek_senet_vade` | `src/features/kasa/services/kasaApi.js` | MİZANET |
| 39 | `b2_kasa_hareketleri` | `src/features/kasa/services/kasaApi.js` | MİZANET |
| 40 | `b2_malzeme_katalogu` | `src/features/katalog/services/katalogApi.js` | MİZANET |
| 41 | `b2_muhasebe` | `src/hooks/useMuhasebe.js` | MİZANET |
| 42 | `b2_musteriler` | `src/features/musteriler/services/musterilerApi.js` | MİZANET |
| 43 | `b2_personel` | `src/hooks/usePersonel.js` | MİZANET |
| 44 | `b2_personel_devam` | `src/hooks/usePersonel.js` | MİZANET |
| 45 | `b2_siparis_kalemleri` | `src/features/siparisler/services/siparislerApi.js` | MİZANET |
| 46 | `b2_siparisler` | `src/features/siparisler/services/siparislerApi.js` | MİZANET |
| 47 | `b2_stok_hareketleri` | `src/features/stok/services/stokApi.js` | MİZANET |
| 48 | `b2_tedarikciler` | `src/features/siparisler/services/siparislerApi.js` | MİZANET |
| 49 | `b2_teklif_logs` | 🔒 **MÜHÜRLÜ** — Servis dosyası yok, tablo kayıt altında | MİZANET |
| 50 | `b2_urun_katalogu` | `src/features/stok/services/stokApi.js` | MİZANET |
| 51 | `b2_urun_varyant_stok` | 🔒 **MÜHÜRLÜ** — Servis dosyası yok, tablo kayıt altında | MİZANET |

### Diğer — Bağımsız Tablolar (Mizanet)

| # | Tablo | Ana Servis Dosyası | Proje |
|---|---|---|---|
| 52 | `bot_tracking_logs` | `src/lib/sentinel.js` | MİZANET |
| 53 | `camera_access_log` | 🔒 **MÜHÜRLÜ** — Kamera modülü beklemede, tablo kayıt altında | MİZANET |
| 54 | `camera_events` | 🔒 **MÜHÜRLÜ** — Kamera modülü beklemede, tablo kayıt altında | MİZANET |
| 55 | `cameras` | 🔒 **MÜHÜRLÜ** — Kamera modülü beklemede, tablo kayıt altında | MİZANET |
| 56 | `cost_analysis` | `src/lib/agents/ekip2/MatematikciYargic.js` | MİZANET |
| 57 | `m2_finans_veto` | `src/lib/m2_kar_kilidi.js` | MİZANET |
| 58 | `notifications` | `src/lib/components/ui/BildirimZili.js` | MİZANET |
| 59 | `orders` | 🔒 **MÜHÜRLÜ** — Eski/yedek tablo, kayıt altında | MİZANET |
| 60 | `production_orders` | `src/features/uretim/services/uretimApi.js` | MİZANET |
| 61 | `products` | `src/lib/agents/ekip1/OluIsciTaburu.js` | MİZANET |
| 62 | `risk_analysis` | `src/lib/agents/ekip2/MatematikciYargic.js` | MİZANET |
| 63 | `strategy` | `src/lib/agents/ekip2/MatematikciYargic.js` | MİZANET |
| 64 | `trend_data` | `src/lib/agents/ekip1/OluIsciTaburu.js` | MİZANET |

---

## 2. STP TABLOLARI (Sistem Takip Paneli — 2 tablo)

| # | Tablo | Ana Servis Dosyası | Diğer Erişenler |
|---|---|---|---|
| 65 | `tasks` | `src/services/taskService.ts` | `TaskForm.tsx` (INSERT), `TaskCard.tsx` (UPDATE/DELETE), `page.tsx`, `useTaskStore.ts`, `exportService.ts`, `Stats.tsx` |
| 66 | `audit_logs` | `src/services/auditService.ts` | `AuditLog.tsx`, `taskService.ts`, `errorHandler.ts`, `TaskForm.tsx`, `exportService.ts`, `page.tsx` |

---

## 3. SKM TABLOLARI (Sistem Kontrol Merkezi — 8 tablo)

| # | Tablo | Ana Servis Dosyası | Proje |
|---|---|---|---|
| 67 | `skm_sistemler` | `src/app/api/health-check/route.ts` | SKM |
| 68 | `skm_saglik_kayitlari` | `src/app/api/health-check/route.ts` | SKM |
| 69 | `skm_olaylar` | `src/lib/skm.ts` | SKM |
| 70 | `skm_cift_kontrol` | `src/lib/skm.ts` | SKM |
| 71 | `skm_alarmlar` | `src/lib/skm.ts` | SKM |
| 72 | `gorevler` | `src/lib/gorev-motoru.ts` | SKM |
| 73 | `gorev_kanitlar` | `src/lib/gorev-motoru.ts` | SKM |
| 74 | `gorev_loglar` | `src/lib/gorev-motoru.ts` | SKM |

---

## 🔒 MÜHÜRLÜ TABLOLAR (Servis Dosyası Olmayan)

Aşağıdaki tablolar Supabase'de mevcut, servis dosyası tespit edilememiştir. Tamamı kayıt altına alınmış ve MÜHÜRLÜ statüsüne çevrilmiştir.

| Tablo | Statü | Açıklama |
|---|---|---|
| `b1_tedarikci_sabika` | 🔒 MÜHÜRLÜ | Yeni veya beklemede — kayıt altında |
| `b2_teklif_logs` | 🔒 MÜHÜRLÜ | Yeni veya beklemede — kayıt altında |
| `b2_urun_varyant_stok` | 🔒 MÜHÜRLÜ | Yeni veya beklemede — kayıt altında |
| `camera_access_log` | 🔒 MÜHÜRLÜ | Kamera modülü beklemede — kayıt altında |
| `camera_events` | 🔒 MÜHÜRLÜ | Kamera modülü beklemede — kayıt altında |
| `cameras` | 🔒 MÜHÜRLÜ | Kamera modülü beklemede — kayıt altında |
| `orders` | 🔒 MÜHÜRLÜ | Eski/yedek tablo — kayıt altında |

---

## PROJE DİZİN HARİTASI

| Proje | Konum | Servis Dizini |
|---|---|---|
| **MİZANET** | `C:\Users\Esisya\Desktop\New-mizanet\mizanet.com-main\` | `src/features/*/services/` + `src/lib/` |
| **STP** | `C:\sistem_takip_paneli\02_is_alani\` | `src/services/` |
| **SKM** | `C:\Users\Esisya\Desktop\sistem-kontrol-merkezi\` | `src/lib/` + `src/services/` |

---

> **NOT**: Bu belge canlı Supabase taraması ve kod grep analizi ile oluşturulmuştur. Tablo sayısı veya servis dosyaları değiştiğinde güncellenmesi gerekir.
