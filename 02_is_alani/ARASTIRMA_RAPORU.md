# SİSTEM TAKİP PANELLERİ — ARAŞTIRMA RAPORU
> Tarih: 2026-04-17 | Hazırlayan: Antigravity | Kaynak: Web araştırması

---

## 1. SİSTEM TAKİP PANELİ NEDİR?

Sistem Takip Paneli (System Monitoring Dashboard), bir organizasyonun tüm teknolojik
altyapısını tek ekrandan izlemek, yönetmek ve müdahale etmek için kullanılan
merkezi komuta arayüzüdür.

**3 Temel Görev:**
- İZLE → Sistem durumunu gerçek zamanlı göster
- UYAR → Anormallik tespit edince alarm ver
- MÜDAHALE ET → Operatöre aksiyon aldır

**Farklı İsimleri:**
- NOC (Network Operations Center) → Ağ izleme
- SOC (Security Operations Center) → Güvenlik izleme
- Komuta Merkezi → Askeri/operasyonel
- Observability Platform → Modern DevOps

---

## 2. ENDÜSTRİ STANDARDI ARAÇLAR

### Ticari Araçlar

| Araç | Ne Yapar? | Güçlü Yanı | Zayıf Yanı | Fiyat |
|------|-----------|-----------|-----------|-------|
| **Datadog** | Tam observability (metrik+log+trace) | Her şey bir arada, bulut entegrasyon | Pahalı, vendor lock-in | $15-35/host/ay |
| **New Relic** | APM + altyapı izleme | Güçlü uygulama performans analizi | Karmaşık fiyatlandırma | Ücretsiz katman var |
| **Splunk** | Log analizi + SIEM | En güçlü log arama motoru | Çok pahalı, kaynak yoğun | $150+/GB/gün |
| **PagerDuty** | Olay yönetimi + çağrı | En iyi alarm yönlendirme | Sadece alarm, izleme yok | $21/kullanıcı/ay |

### Açık Kaynak Araçlar

| Araç | Ne Yapar? | Güçlü Yanı | Zayıf Yanı | Maliyet |
|------|-----------|-----------|-----------|---------|
| **Grafana** | Dashboard görselleştirme | En güzel paneller, çoklu veri kaynağı | Kendisi veri toplamaz | 0₺ |
| **Prometheus** | Metrik toplama (time-series) | Kubernetes standartı, PromQL | Uzun süreli depolama zayıf | 0₺ |
| **Zabbix** | Hepsi bir arada izleme | Sunucu, ağ, uygulama, hepsini izler | Öğrenme eğrisi yüksek | 0₺ |
| **Nagios** | Durum kontrolü (up/down) | 20+ yıllık, güvenilir, eklenti bol | UI eski, modern değil | 0₺ |
| **Uptime Kuma** | Basit uptime izleme | Kurulumu kolay, şık arayüz | Sadece uptime, metrik yok | 0₺ |

### Hangisi Ne İçin?

```
Kubernetes/Mikro servis → Prometheus + Grafana
Karma altyapı (sunucu+ağ) → Zabbix
Sadece "çalışıyor mu?" → Nagios veya Uptime Kuma
Güzel dashboard → Grafana (her şeyin üstüne)
Log analizi → Loki (Grafana) veya ELK Stack
```

---

## 3. İDEAL MİMARİ — BİR SİSTEM TAKİP PANELİ NASIL OLMALI?

### 3 Katmanlı Mimari (Endüstri Standardı)

```
KATMAN 1: VERİ TOPLAMA
├── Agent tabanlı (sunucuya ajan kur)
├── Agentless (SNMP, API, webhook ile topla)
├── Push modeli (uygulama metrikleri kendisi gönderir)
└── Pull modeli (merkez düzenli aralıklarla çeker — Prometheus)

KATMAN 2: VERİ İŞLEME + DEPOLAMA
├── Time-series veritabanı (InfluxDB, Prometheus, TimescaleDB)
├── Log depolama (Elasticsearch, Loki)
├── Olay motoru (alarm kuralları, anomali tespiti)
└── AI/ML analiz (adaptif baseline, tahminleme)

KATMAN 3: GÖRSELLEŞTIRME + AKSİYON
├── Dashboard (Grafana, özel panel)
├── Alarm sistemi (PagerDuty, Telegram, email)
├── Otomasyon (sorun tespit → otomatik düzelt)
└── Raporlama (günlük/haftalık/aylık)
```

### Her Panelde Olması Gereken 8 Temel Bileşen

| # | Bileşen | Açıklama | STP'de Var mı? |
|---|---------|----------|---------------|
| 1 | **Sistem Sağlık Göstergesi** | Tüm sistemin durumu tek bakışta (yeşil/sarı/kırmızı) | ✅ SCR-01 |
| 2 | **Metrik Grafikleri** | CPU, bellek, disk, ağ — zaman serisi | ✅ SCR-13 |
| 3 | **Log Akışı** | Son olaylar, hatalar, uyarılar — canlı | ✅ SCR-09, SCR-12 |
| 4 | **Alarm Paneli** | Aktif alarmlar, önem sırası | ✅ SCR-07 |
| 5 | **Görev/Olay Yönetimi** | Açık görevler, durum takibi | ✅ SCR-03 |
| 6 | **Ajan/Servis Durumu** | Her bileşenin aktif/pasif durumu | ✅ SCR-10 |
| 7 | **Güvenlik Paneli** | Tehdit tespiti, erişim kontrolü | ✅ SCR-14 |
| 8 | **Bildirim Sistemi** | Telegram, email, SMS ile uyarı | ✅ SCR-08 |

---

## 4. KOMUTA MERKEZİ TASARIM İLKELERİ

Askeri/operasyonel komuta merkezleri için endüstri standartları:

### MIL-STD-1472H (ABD Askeri Standart)
İnsan mühendisliği standartdı — ekran, kontrol, çalışma ortamı tasarımı.

### ISO 11064 (Uluslararası Kontrol Odası Standardı)
Fiziksel layout, çalışma ortamı, ergonomi.

### Temel İlkeler

| İlke | Açıklama | STP'de? |
|------|----------|---------|
| **5 Saniye Kuralı** | Operatör 5 saniyede durumu anlayabilmeli | ✅ Renk kodları |
| **Bilgi Hiyerarşisi** | Kritik bilgi sol üstte, detay altta | ✅ Grid layout |
| **Progresif Açılım** | Özet göster, detay tıklamayla gelsin | ✅ ▲/▼ butonları |
| **Tutarlı Renk Dili** | Kırmızı=kritik, sarı=uyarı, yeşil=sağlıklı her yerde aynı | ✅ |
| **Rol Bazlı Görünüm** | Herkes kendi ihtiyacını görsün | ⚠️ Kısmen (operatör seçimi var) |
| **Aksiyon Odaklı** | Sadece izleme değil, doğrudan müdahale | ✅ Görev atama, karar verme |
| **7/24 Ergonomi** | Göz yorgunluğu azaltma, dark mode | ✅ Dark theme |
| **Alarm Önceliklendirme** | Alarm yorgunluğu önle, önem sırala | ✅ Severity sistemi |

---

## 5. MODERN TRENDLER (2025-2026)

### AI Destekli İzleme

| Trend | Açıklama | STP'de? |
|-------|----------|---------|
| **Adaptif Baseline** | Normal davranışı öğren, sapma tespit et | ⚠️ Kısmen (öğrenme motoru var) |
| **Anomali Tespiti** | AI ile anormal durumları otomatik bul | ⚠️ Kısmen |
| **Tahminleme** | Arıza 2 saat sonra olacak → şimdiden uyar | ❌ Henüz yok |
| **Doğal Dil Sorgu** | "Son 1 saatte hata oranı ne?" diye sor | ❌ Henüz yok |
| **Otomatik Düzeltme** | Sorun tespit → kendi kendine çöz | ⚠️ Kısmen (ajan sistemi) |
| **Kök Neden Analizi** | Hata → neden oldu → hangi değişiklik tetikledi | ❌ Henüz yok |

### Observability vs Monitoring

```
ESKİ YAKLAŞIM: MONİTÖRİNG
→ "Sistem çalışıyor mu?" sorusuna cevap verir
→ Önceden bilinen metrikleri izler
→ Bilinen sorunları tespit eder

YENİ YAKLAŞIM: OBSERVABİLİTY (Gözlemlenebilirlik)
→ "Neden böyle davranıyor?" sorusuna cevap verir
→ Bilinmeyen sorunları keşfeder
→ 3 sütun: Metrikler + Loglar + Trace'ler
→ Korelasyon: metrik spike → hangi log → hangi istek
```

---

## 6. STP'NİN ENDÜSTRİYE GÖRE KONUMU

### Karşılaştırma Matrisi

| Özellik | Grafana | Datadog | Zabbix | STP (Bizim) |
|---------|---------|---------|--------|-------------|
| Dashboard | ✅ | ✅ | ✅ | ✅ 16 Ekran |
| Metrik toplama | ❌ (dış kaynak) | ✅ | ✅ | ✅ İç API'ler |
| Log yönetimi | ✅ (Loki ile) | ✅ | ✅ | ✅ Audit + immutable |
| Alarm sistemi | ✅ | ✅ | ✅ | ✅ AlarmPanel |
| AI entegrasyon | ⚠️ Kısıtlı | ✅ | ❌ | ✅ 50 AI ajan |
| Ajan sistemi | ❌ | ❌ | ❌ | ✅ 50 otonom ajan |
| Görev yönetimi | ❌ | ❌ | ❌ | ✅ TaskBoard |
| Güvenlik denetimi | ❌ | ⚠️ | ❌ | ✅ SHA-256 + RLS |
| Komut pipeline | ❌ | ❌ | ❌ | ✅ 9 katman (K0-K9) |
| Otonom karar | ❌ | ❌ | ❌ | ✅ Konsensüs motoru |
| Kural motoru | ❌ | ⚠️ | ✅ | ✅ Nizamname + RuleGuard |
| Self-healing | ❌ | ⚠️ | ⚠️ | ⚠️ Circuit Breaker |
| Maliyet | 0₺ | $$$$ | 0₺ | 0₺ |

### STP'nin Farkı

```
STANDART İZLEME PANELLERİ:
→ Sadece İZLER (pasif)
→ İnsan müdahalesi bekler
→ Alarm verir, gerisi seninle

STP (BİZİM SİSTEM):
→ İZLER + DÜŞÜNÜR + KARAR VERİR + İCRA EDER (aktif)
→ 50 otonom ajan kendi kendine çalışır
→ L1 yapar → L2 denetler → L3 hakem karar verir
→ Pipeline ile her komut 9 katmandan doğrulanır
→ SHA-256 ile her işlem değiştirilemez şekilde kaydedilir
```

---

## 7. TEKNOLOJİ ÖNERİLERİ — GELECEKTEKİ İYİLEŞTİRMELER

| # | Öneri | Zorluk | Etki | Açıklama |
|---|-------|--------|------|----------|
| 1 | **WebSocket gerçek zamanlı veri** | Orta | Yüksek | Polling yerine anlık veri akışı |
| 2 | **OpenTelemetry entegrasyonu** | Yüksek | Yüksek | Endüstri standardı metrik toplama |
| 3 | **Adaptif baseline** | Yüksek | Yüksek | Normal davranışı öğren, sapma uyar |
| 4 | **Doğal dil sorgu** | Orta | Orta | "Son 1 saatteki hatalar ne?" |
| 5 | **Mobil uyumlu dashboard** | Düşük | Orta | Telefonda izleme |
| 6 | **Grafana entegrasyonu** | Düşük | Orta | Grafana'ya STP verileri gönder |
| 7 | **Prometheus metrikleri** | Orta | Yüksek | Standart /metrics endpoint |
| 8 | **Kök neden analizi** | Yüksek | Yüksek | Hata → neden → çözüm zinciri |

---

## 8. REFERANS MİMARİ DİYAGRAMLARI

### Endüstri Standardı 3 Katman

```
┌─────────────────────────────────────────────────┐
│              GÖRSELLEŞTIRME KATMANI               │
│                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Dashboard │ │  Alarm   │ │    Raporlama     │  │
│  │  Paneli   │ │  Paneli  │ │  (PDF/Email)     │  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│              İŞLEME + DEPOLAMA KATMANI           │
│                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Time-    │ │  Olay    │ │    AI/ML         │  │
│  │ Series   │ │  Motoru  │ │    Analiz        │  │
│  │ DB       │ │  Alarm   │ │    Anomali       │  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│               VERİ TOPLAMA KATMANI               │
│                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  Agent   │ │  API     │ │    Webhook       │  │
│  │  (Pull)  │ │  (Push)  │ │    (Event)       │  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
└─────────────────────────────────────────────────┘
```

### STP'nin Katman Eşleşmesi

```
ENDÜSTRİ STANDARDI          →    STP KARŞILIĞI
─────────────────────────────────────────────────
Görselleştirme               →    page.tsx (16 Ekran)
Dashboard                    →    HealthDashboard, Stats, LiveMetrics
Alarm Paneli                 →    AlarmPanel, NotificationBell
Raporlama                    →    AuditLog, exportService

İşleme + Depolama            →    core/ + services/
Time-Series DB               →    Supabase (performance_metrics)
Olay Motoru                  →    pipeline.ts + control_engine.ts
AI Analiz                    →    agentWorker.ts + aiProvider.ts

Veri Toplama                 →    lib/ + API routes
Agent (Pull)                 →    fetchWithTimeout (polling)
API (Push)                   →    /api/tasks, /api/agents
Webhook (Event)              →    /api/telegram webhook
```

---

## 9. ANAHTAR METRİKLER — NE ÖLÇÜLMELİ?

### RED Metodu (Mikro servisler için)
- **R**ate → İstek oranı (kaç istek/saniye)
- **E**rrors → Hata oranı (% başarısız)
- **D**uration → Gecikme (ms cevap süresi)

### USE Metodu (Altyapı için)
- **U**tilization → Kullanım oranı (CPU %80)
- **S**aturation → Doygunluk (kuyruk doluluk)
- **E**rrors → Hata sayısı

### STP İçin Önerilen Metrikler

| Metrik | Açıklama | Şu An İzleniyor mu? |
|--------|----------|---------------------|
| API yanıt süresi | Her endpoint kaç ms? | ⚠️ Kısmen (performance_metrics) |
| Ajan görev süresi | Her ajan kaç ms? | ✅ duration_ms |
| AI çağrı süresi | Ollama kaç ms cevap veriyor? | ✅ durationMs |
| Hata oranı | Son 1 saatte kaç hata? | ✅ alerts tablosu |
| Uptime | Sistem kaç % çalışıyor? | ✅ SCR-01 uptime göstergesi |
| Kuyruk derinliği | Bekleyen görev sayısı | ✅ queue API |
| Circuit Breaker durumu | Ollama sağlıklı mı? | ✅ SCR-14 |
| Ajan verimliliği | Başarılı/başarısız görev oranı | ✅ tamamlanan_gorev/hata_sayisi |

---

## 10. KAYNAKLAR

| # | Kaynak | URL | Konu |
|---|--------|-----|------|
| 1 | Grafana Dashboard Best Practices | grafana.com | Dashboard tasarım |
| 2 | MIL-STD-1472H | ABD DoD | Askeri ergonomi standardı |
| 3 | ISO 11064 | ISO | Kontrol odası tasarımı |
| 4 | OpenTelemetry | opentelemetry.io | Observability standardı |
| 5 | Prometheus Docs | prometheus.io | Metrik toplama |
| 6 | Datadog Architecture | docs.datadoghq.com | Ticari çözüm mimarisi |
| 7 | CNCF Observability | cncf.io | Cloud-native izleme |
| 8 | 5-Second Dashboard Rule | UX araştırmaları | Dashboard UX |
