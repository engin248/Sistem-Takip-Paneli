# OPERASYON PLANI: SISTEM TAKIP PANELI - KAPI ENTEGRASYONU

> **Plan ID:** OP-20260418-001
> **Sorumlu:** Antigravity (A-03 İCRACI-DB / A-10 İCRACI-AKIŞ)
> **Hedef:** Veritabanı şemasının güncellenmesi ve G6/G7 kapılarının Sistem Takip Paneli akışına entegrasyonu.

---

## 1. STRATEJİK ANALİZ
- **Sorun:** Pipeline G1 ve G2 kapılarını destekliyor ancak G6 (Kanıt) ve G7 (Nihai Onay) kapıları mantıksal olarak eksik. Migration 008 dosyası hazır ancak uygulanıp uygulanmadığı belirsiz.
- **Çözüm:** Veritabanı şemasını ilgili tablolar üzerinden doğrula. Eksikse gerekli tanımlamaları uygula. Pipeline dosyasında G6 ve G7 duraklarını aktif et.

## 2. TEKNİK ANALİZ
- **Veritabanı:** `pipeline_checkpoints` ve `pipeline_evidence` tablolarının varlığı kontrol edilecek.
- **Kod:** `src/core/pipeline.ts` dosyasında G6_EVIDENCE ve G7_HUMAN_APPROVAL kontrol blokları eklenecek.
- **Bağımlılık:** `src/core/humanGate.ts` zaten bu gate_id'leri destekliyor, sadece pipeline'da çağrılmaları gerekiyor.

## 3. OPERASYONEL ADIMLAR
1. **[DENETİM]** `pipeline_checkpoints` tablosunun varlığını kontrol et.
2. **[İCRA-DB]** Eğer tablo yoksa `supabase_migration_008_pipeline_gates.sql` içeriğini uygula.
3. **[İCRA-CODE]** `src/core/pipeline.ts` dosyasına G6 ve G7 kapı mantığını ekle.
4. **[DENETİM]** Pipeline'ın ESCALATED durumunda doğru checkpoint ürettiğini doğrula.

## 4. RİSK ANALİZİ
- **Risk:** Mevcut pipeline akışının bozulması.
- **Önlem:** Snapshot/Rollback mekanizması (K8) sayesinde risk minimaldir. Her adım sonrası audit log yazılacak.

## 5. KANIT VE RAPORLAMA
- İşlem sonrası `03_denetim_kanit` klasörüne `PROV_008_GATE_INTEGRATION.txt` dosyası eklendi.
- `immutable_logs` tablosuna kayıt atılamadı (tablo eksikliği nedeniyle).

---
**DURUM:** KISMİ TAMAMLANDI (MİGRASYON MANUEL UYGULANMALI)
**ONAY:** Pipeline kod entegrasyonu tamamlandı. SQL Editor üzerinden migration 008 uygulanmalıdır.
