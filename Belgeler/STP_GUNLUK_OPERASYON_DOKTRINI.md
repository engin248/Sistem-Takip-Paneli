# STP — 4-SAATLİK VARDİYA OPERASYON DOKTRİNİ
> **Konu:** Görev Yaşam Döngüsü ve Denetim Disiplini  
> **Versiyon:** 1.0

## 1. GÖREV AKIŞI (FLOW)
1. **PLANLAMA:** Görev emri `00_PLANLAMA` klasöründe yayınlanır.
2. **İŞ EMRİ:** İlgili ekibin `Is_Emri` klasörüne kopyalanır.
3. **İCRA (L1):** Ekip çalışmayı yapar, çıktıları `Calisma` klasörüne koyar.
4. **DENETİM (L2):** Bağımsız denetçi `Kontrol_Sayfasi` üzerinden raporunu hazırlar.
5. **RAPORLAMA:** Ekip kendi raporunu `Rapor` klasörüne yükler.
6. **onay (QA):** Kalite Güvence birimi son onayı verir.

## 2. HABERLEŞME KURALLARI
- Tüm yazışmalar sistem içi `Hub` üzerinden yapılacaktır.
- "Yaptım" beyanı kanıtsız geçersizdir.
- Hata gizlemek sistemden ihraç sebebidir.

## 3. DENETİM DİSİPLİNİ
- Denetçi asla kod değiştirmez.
- Denetçi sadece "Doğru", "Yanlış", "Riskli" etiketleriyle rapor sunar.
- Yanlış işlem anında `Hata Tutanağı` tutulur.

---
**KANIT:** [PROJE/00_PLANLAMA/03_Operasyon_Plani/STP_GUNLUK_OPERASYON_DOKTRINI.md]


## 4 SAATLİK VARDİYA SİSTEMİ
- **Sıfırlama:** Ajan hafızası ve HermAI Ufuk bağlamı 4 saatte bir devir teslim yapar.
- **Amaç:** Halüsinasyon, yorgunluk veya geçmiş bağlamdan kopmayı kesin olarak engellemek.
- **Zamanlama:** Günde tam 6 vardiya döngüsü vardır. Her vardiya başında açıkta kalan yetkisiz görevler reddedilir.
