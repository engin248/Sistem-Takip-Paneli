# SİSTEM HARİTASI — TABLO-DOSYA EŞLEME MÜHÜRÜ

> **Görev:** MÜHÜRDAR (BİRİM-3) — Mapeo Tabla-Archivo  
> **Tarih:** 08.04.2026 | 14:30 (UTC+3)  
> **Kaynak:** Canlı Supabase Dashboard + Canlı Kaynak Kodu Taraması  
> **Durum:** MÜHÜRLENMİŞ — VARSAYIM SIFIR  

---

## BÖLÜM 1: STP PROJESİ — AKTİF TABLO ETKİLEŞİMLERİ

STP (Sistem Takip Paneli) projesi, Supabase veritabanındaki **2 tablo** ile doğrudan etkileşim kurmaktadır.

### TABLO 1: `tasks`

| # | Dosya | İşlem | Satır | Detay |
|---|---|---|---|---|
| 1 | `src/services/taskService.ts` | SELECT | 26 | `.from('tasks').select('*').eq('is_archived', false)` — Arşivlenmemiş görevleri çeker |
| 2 | `src/services/taskService.ts` | UPDATE | 55 | `.from('tasks').update({ status })` — Görev durumu günceller |
| 3 | `src/services/taskService.ts` | DELETE | 91 | `.from('tasks').delete().eq('id', id)` — Görev siler |
| 4 | `src/services/taskService.ts` | UPDATE | 126 | `.from('tasks').update({ is_archived: true })` — Görev arşivler |
| 5 | `src/services/taskService.ts` | REALTIME | 162 | `.channel('tasks_realtime')` — tasks tablosunu dinler |
| 6 | `src/components/TaskForm.tsx` | INSERT | 31 | `.from('tasks').insert([{...}])` — Yeni görev oluşturur |

### TABLO 2: `audit_logs`

| # | Dosya | İşlem | Satır | Detay |
|---|---|---|---|---|
| 1 | `src/services/auditService.ts` | INSERT | 78 | `.from('audit_logs').insert([logEntry])` — Denetim kaydı yazar |
| 2 | `src/services/auditService.ts` | SELECT | 113 | `.from('audit_logs').select('*').order(...).limit(5)` — Son 5 log çeker |
| 3 | `src/components/AuditLog.tsx` | REALTIME | 29 | `.channel('audit_logs_realtime')` — audit_logs tablosunu dinler |

---

## BÖLÜM 2: DOLAYLI ETKİLEŞİMLER (Servis Zinciri)

Aşağıdaki dosyalar tablolara doğrudan `.from()` çağrısı yapmazlar, ancak servis katmanı üzerinden dolaylı olarak etkileşirler.

### `tasks` tablosuna dolaylı erişen dosyalar:

| # | Dosya | Erişim Yolu | Detay |
|---|---|---|---|
| 1 | `src/components/TaskCard.tsx` | → `taskService.ts` → `tasks` | updateStatus, deleteTask, archiveTask çağırır |
| 2 | `src/components/Stats.tsx` | → `useTaskStore.ts` → (tasks verisi) | Store'daki tasks dizisini okur |
| 3 | `src/app/page.tsx` | → `taskService.ts` → `tasks` | fetchTasksFromDB, subscribeToTasks çağırır |
| 4 | `src/store/useTaskStore.ts` | → (veri deposu) | tasks[] dizisini tutar, taskService tarafından beslenir |
| 5 | `src/services/exportService.ts` | → `useTaskStore` → (tasks verisi) | Tasks verisini JSON olarak dışa aktarır |

### `audit_logs` tablosuna dolaylı erişen dosyalar:

| # | Dosya | Erişim Yolu | Detay |
|---|---|---|---|
| 1 | `src/services/taskService.ts` | → `auditService.ts` → `audit_logs` | Her CRUD işleminde logAudit/logAuditError çağırır |
| 2 | `src/lib/errorHandler.ts` | → `auditService.ts` → `audit_logs` | Hata oluştuğunda logAudit çağırır |
| 3 | `src/components/TaskForm.tsx` | → `auditService.ts` → `audit_logs` | Görev oluşturunca logAudit çağırır |
| 4 | `src/services/exportService.ts` | → `auditService.ts` → `audit_logs` | Export sonrası logAudit çağırır |
| 5 | `src/app/page.tsx` | → `auditService.ts` → `audit_logs` | fetchAuditLogs import eder |

---

## BÖLÜM 3: SUPABASE ALTYAPI DOSYALARI

| # | Dosya | Rolü | Tablo |
|---|---|---|---|
| 1 | `src/lib/supabase.ts` | Supabase client (singleton) | TÜM TABLOLAR (bağlantı katmanı) |
| 2 | `01_komutlar/supabase_schema.sql` | SQL şema tanımı | `tasks` + `audit_logs` tanımı |

---

## BÖLÜM 4: TABLO İLE ETKİLEŞİMİ OLMAYAN DOSYALAR

| # | Dosya | Rolü |
|---|---|---|
| 1 | `src/lib/constants.ts` | Hata kodu sabitleri (ERR-STP001-XXX) |
| 2 | `src/store/useLanguageStore.ts` | Dil seçimi (TR/AR) — Supabase bağlantısı yok |
| 3 | `src/components/NavBar.tsx` | Navigasyon — Supabase bağlantısı yok |
| 4 | `src/app/layout.tsx` | Root layout — Supabase bağlantısı yok |
| 5 | `src/app/globals.css` | Stil dosyası |

---

## BÖLÜM 5: SUPABASE VERİTABANINDAKİ TÜM TABLOLAR (CANLI VERİ)

Supabase dashboard'dan **08.04.2026 14:31 (UTC+3)** tarihinde alınan canlı tablo listesi.
Veritabanında toplam **87 tablo** tespit edilmiştir.

### STP Projesi Tarafından Kullanılan Tablolar (2/87):

| # | Tablo | STP Dosyası | Durum |
|---|---|---|---|
| 1 | `tasks` | taskService.ts, TaskForm.tsx | ✅ AKTİF |
| 2 | `audit_logs` | auditService.ts, AuditLog.tsx | ✅ AKTİF |

### STP Projesi Tarafından KULLANILMAYAN Tablolar (85/87):

#### Grup B0 — Sistem/Güvenlik (10 tablo)
| # | Tablo |
|---|---|
| 1 | `b0_ajan_loglari` |
| 2 | `b0_api_spam_kalkani` |
| 3 | `b0_arsiv` |
| 4 | `b0_bildirim_loglari` |
| 5 | `b0_giris_girisimleri` |
| 6 | `b0_herm_ai_kararlar` |
| 7 | `b0_sistem_loglari` |
| 8 | `b0_tasarim_ayarlari` |
| 9 | `b0_telegram_log` |
| 10 | `b0_yetki_ayarlari` |

#### Grup B1 — Üretim/Operasyon (40 tablo)
| # | Tablo |
|---|---|
| 1 | `b1_agent_loglari` |
| 2 | `b1_ai_is_kuyrugu` |
| 3 | `b1_ajan_gorevler` |
| 4 | `b1_aksesuar_arsivi` |
| 5 | `b1_ara_is_emirleri` |
| 6 | `b1_arge_cost_analysis` |
| 7 | `b1_arge_products` |
| 8 | `b1_arge_products_karantina` |
| 9 | `b1_arge_risk_analysis` |
| 10 | `b1_arge_strategy` |
| 11 | `b1_arge_trend_data` |
| 12 | `b1_arge_trendler` |
| 13 | `b1_askeri_haberlesme` |
| 14 | `b1_dikim_talimatlari` |
| 15 | `b1_fire_kayitlari` |
| 16 | `b1_gorevler` |
| 17 | `b1_ic_mesajlar` |
| 18 | `b1_imalat_emirleri` |
| 19 | `b1_is_emirleri` |
| 20 | `b1_kamera_olaylari` |
| 21 | `b1_kesim_emirleri` |
| 22 | `b1_kesim_is_emirleri` |
| 23 | `b1_kesim_operasyonlari` |
| 24 | `b1_kumas_arsiv` |
| 25 | `b1_kumas_arsivi` |
| 26 | `b1_makineler` |
| 27 | `b1_maliyet_kalemleri` |
| 28 | `b1_maliyet_kayitlari` |
| 29 | `b1_mesaj_gizli` |
| 30 | `b1_mesaj_okundu_log` |
| 31 | `b1_model_is_akislari` |
| 32 | `b1_model_kaliplari` |
| 33 | `b1_model_malzeme_listesi` |
| 34 | `b1_model_taslaklari` |
| 35 | `b1_modelhane_kayitlari` |
| 36 | `b1_muhasebe_raporlari` |
| 37 | `b1_numune_uretimleri` |
| 38 | `b1_operasyon_adimlari` |
| 39 | `b1_operasyon_takip` |
| 40 | `b1_operasyon_tanimlari` |

#### Grup B1 — Personel/Stok (10 tablo)
| # | Tablo |
|---|---|
| 1 | `b1_personel` |
| 2 | `b1_personel_devam` |
| 3 | `b1_personel_performans` |
| 4 | `b1_sistem_ayarlari` |
| 5 | `b1_sistem_uyarilari` |
| 6 | `b1_stok` |
| 7 | `b1_stok_hareketleri` |
| 8 | `b1_tedarikci_sabika` |
| 9 | `b1_uretim_kayitlari` |
| 10 | `b1_uretim_operasyonlari` |

#### Grup B2 — Finans/Ticaret (13 tablo)
| # | Tablo |
|---|---|
| 1 | `b2_cek_senet_vade` |
| 2 | `b2_kasa_hareketleri` |
| 3 | `b2_malzeme_katalogu` |
| 4 | `b2_muhasebe` |
| 5 | `b2_musteriler` |
| 6 | `b2_personel_devam` |
| 7 | `b2_siparis_kalemleri` |
| 8 | `b2_siparisler` |
| 9 | `b2_stok_hareketleri` |
| 10 | `b2_tedarikciler` |
| 11 | `b2_teklif_logs` |
| 12 | `b2_urun_katalogu` |
| 13 | `b2_urun_varyant_stok` |

#### Bağımsız Tablolar (12 tablo)
| # | Tablo |
|---|---|
| 1 | `bot_tracking_logs` |
| 2 | `camera_access_log` |
| 3 | `camera_events` |
| 4 | `cameras` |
| 5 | `cost_analysis` |
| 6 | `m2_finans_veto` |
| 7 | `notifications` |
| 8 | `orders` |
| 9 | `production_orders` |
| 10 | `products` |
| 11 | `risk_analysis` |
| 12 | `strategy` |
| 13 | `trend_data` |

---

## BÖLÜM 6: DOSYA → TABLO AKIŞDİYAGRAMI

```
src/app/page.tsx (Dashboard)
  ├── [DOĞRUDAN] supabase.removeChannel()
  ├── [SERVİS]   taskService.fetchTasksFromDB()   → tasks (SELECT)
  ├── [SERVİS]   taskService.subscribeToTasks()    → tasks (REALTIME)
  ├── [SERVİS]   auditService.fetchAuditLogs()     → audit_logs (SELECT)
  └── [SERVİS]   exportService.exportSystemData()  → audit_logs (INSERT via logAudit)

src/components/TaskForm.tsx
  ├── [DOĞRUDAN] supabase.from('tasks').insert()   → tasks (INSERT)
  ├── [SERVİS]   auditService.logAudit()           → audit_logs (INSERT)
  └── [SERVİS]   errorHandler.handleError()        → audit_logs (INSERT)

src/components/TaskCard.tsx
  ├── [SERVİS]   taskService.updateStatus()        → tasks (UPDATE) + audit_logs (INSERT)
  ├── [SERVİS]   taskService.deleteTask()          → tasks (DELETE) + audit_logs (INSERT)
  └── [SERVİS]   taskService.archiveTask()         → tasks (UPDATE) + audit_logs (INSERT)

src/components/AuditLog.tsx
  ├── [SERVİS]   auditService.fetchAuditLogs()     → audit_logs (SELECT)
  └── [DOĞRUDAN] supabase.channel('audit_logs_realtime') → audit_logs (REALTIME)

src/components/Stats.tsx
  └── [STORE]    useTaskStore.tasks                → (bellekten okur, DB'ye gitmez)

src/components/NavBar.tsx
  └── [STORE]    useLanguageStore                  → (DB etkileşimi YOK)
```

---

## BÖLÜM 7: NİHAİ MÜHÜR

```
SONUÇ:
  - STP projesi Supabase'deki 87 tablodan sadece 2 tanesini kullanıyor
  - Kullanılan tablolar: tasks, audit_logs
  - Tüm CRUD ve REALTIME etkileşimleri yukarıda haritalandı
  - STP kaynak kodunda başka tabloya erişim YOKTUR
  - Bu harita sayesinde sistem KONTROLEDİLEBİLİR durumdadır

MÜHÜR DURUMU: ✅ MÜHÜRLENDİ
KAYNAK: Canlı Supabase Dashboard + grep taraması + dosya okuma
```

---

> **Mühürleyen:** Antigravity AI — MÜHÜRDAR (BİRİM-3)  
> **Varsayım:** SIFIR  
> **Kanıt:** Canlı kaynak kodu taraması + Supabase Dashboard  
> **Son Güncelleme:** 08 Nisan 2026 — 14:32 (UTC+3)
