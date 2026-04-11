# STP — 5 KATMANLI İŞLEM PROTOKOLÜ
# Versiyon: 1.0 | Tarih: 10 Nisan 2026
# Kurucu: Engin | Doktrin: THE ORDER / NİZAM

---

## HER İŞLEM EN AZ 5 KATMANDAN GEÇECEKTİR

### KATMAN-1: İŞ VE İŞLEM PLANI UYGUNLUĞU
- İşlem planlı mı? İş planında kayıtlı mı?
- Sırası doğru mu? Öncelikli bağımlılıkları tamamlanmış mı?
- Alt, üst, yan, ön, arka bağlantıları tanımlanmış mı?
- **Sorumlu:** AJAN-B (Uygunluk Kontrolcüsü)

### KATMAN-2: SİSTEM VE ÖZELLİK/BECERİ UYGUNLUĞU
- İstenen özellik/beceri mevcut sistemde tanımlı mı?
- Teknoloji yığını uyumlu mu?
- Mevcut mimariye eklenebilir mi?
- **Sorumlu:** AJAN-B (Uygunluk Kontrolcüsü)

### KATMAN-3: İŞ VE İŞLEM YAPILMASI (UYGULAMA)
- Kod yazıldı mı? Dosya oluşturuldu mu?
- Entegrasyon noktaları bağlandı mı?
- errorCore entegrasyonu yapıldı mı?
- **Sorumlu:** AJAN-A (Yapıcı — İşlemi yeniden yapıyormuş gibi kontrol eder)

### KATMAN-4: İŞ VE PROJE UYGUNLUK KONTROLÜ
- 4 katman dizin yapısına (01,02,03,04) uyuyor mu?
- i18n (TR/AR) simetri sağlanmış mı?
- RTL desteği var mı?
- Audit log'a kaydediliyor mu?
- **Sorumlu:** AJAN-B (Uygunluk Kontrolcüsü)

### KATMAN-5: YAPILAN İŞLEMLERİN KONTROLÜ (DOĞRULAMA VE ONAY)
- İşlem doğru çalışıyor mu?
- Yan etkisi var mı?
- Hata kodu doğru atanmış mı?
- İş planı + Proje planı + Doğruluk = 3'ü de uygun mu?
- **Sorumlu:** AJAN-C (Doğrulayıcı — Final onay)
- **KOŞUL:** 3 ajan onaylamadan işlem "TAMAMLANDI" sayılmaz.

---

## İLAVE KATMANLAR (İhtiyaç halinde)

### KATMAN-6: GÖREV İŞ KABUL
- İşlem iş emri olarak sisteme kaydedildi mi?
- Görev kodu (TSK-XXXX) atandı mı?

### KATMAN-7: SİSTEM KONTROLÜ
- Canlı ortamda çalışıyor mu?
- Performans etkisi ölçüldü mü?

### KATMAN-8: GERİ BİLDİRİM
- Kurucu (Engin) onayı alındı mı?
- Değişiklik talep edildi mi?

---

## 3 AJAN TANIMI

| Ajan | Kod | Görev | Kontrol Alanı |
|------|-----|-------|--------------|
| **AJAN-A** | YAPICI | İşlemi yeniden yapıyormuş gibi kontrol eder | KATMAN-3 |
| **AJAN-B** | UYGUNLUK | Projeye ve iş planına uygunluğunu kontrol eder | KATMAN-1, 2, 4 |
| **AJAN-C** | DOĞRULAYICI | Doğruluğu + tüm planlara uygunluğu doğrular, final onay | KATMAN-5 |

## KURALLAR

1. Hiçbir işlem sıradan çıkarılamaz
2. Hiçbir katman atlanamaz
3. 3 ajan onayı olmadan işlem kapanmaz
4. Her onay kanıtlanır ve raporlanır
5. Bu protokol değişmezdir (immutable) — sadece katman EKLENEBİLİR, çıkarılamaz

---

> Mühür: 5-KATMAN-PROTOKOL-V1-STP
> Tarih: 10 Nisan 2026
