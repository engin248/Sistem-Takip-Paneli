# İŞ EMRİ — EKİP-B (ANİ-3)
> **Görev ID:** TASK-EKIP-B-001  
> **Konu:** Planlama Departmanı Otonom Karar Mekanizması  
> **Sorumlu:** L1 - Antigravity (Ekip-B)

## 1. GÖREV TANIMI
`planningService.ts` üzerinden gelen planlama taleplerinin, otonom ajanlar tarafından "Sıfır İnisiyatif" kuralıyla işleme alınması.

## 2. ADIMLAR
1. `api/planning` üzerinden gelen taleplerin `agentWorker.ts` ile eşleşmesini sağla.
2. Plan üretilirken zorunlu 2 alternatif üretme kuralını (Rule #10) koda entegre et.
3. Proje Planı, İş İşlem Planı ve Operasyon Planı dosyalarının otonom taslaklarını oluştur.

## 3. TESLİM KRİTERLERİ
- **Çalışma:** [PROJE/02_EKIP_B/Calisma] otonom üretilen plan taslakları.
- **Rapor:** [PROJE/02_EKIP_B/Rapor] sonuç raporu.
- **Doğrulama:** Karar ağacının (Decision Tree) log kanıtı.

---
**EMRİ VEREN:** L1-KOORDİNATÖR (Antigravity)
