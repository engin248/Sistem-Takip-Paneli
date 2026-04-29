# İŞ EMRİ — EKİP-A (ANİ-2)
> **Görev ID:** TASK-EKIP-A-001  
> **Konu:** Haberleşme Hattı ve Bot Bağlantıları  
> **Sorumlu:** L1 - Antigravity (Ekip-A)

## 1. GÖREV TANIMI
Komuta merkezi ile ajanlar arasındaki "Haberleşme Hub" yapısının dışa kapalı, yerel ve %100 loglanabilir şekilde finalize edilmesi.

## 2. ADIMLAR
1. `api/hub/message` ve `api/hub/messages` uç noktalarını test et.
2. `TelegramSender.tsx` bileşeninin `Hub` üzerinden mesaj gönderip almasını sağla.
3. Mesaj trafiğinin `audit_logs` tablosuna "HUB_TRAFFIC" koduyla düştüğünü doğrula.

## 3. TESLİM KRİTERLERİ
- **Çalışma:** [PROJE/01_EKIP_A/Calisma] klasöründe ekran görüntüleri veya loglar.
- **Rapor:** [PROJE/01_EKIP_A/Rapor] klasöründe sonuç raporu.
- **Test:** En az 10 mesajlık başarılı trafik kanıtı.

---
**EMRİ VEREN:** L1-KOORDİNATÖR (Antigravity)
