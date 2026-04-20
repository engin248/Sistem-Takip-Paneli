# SİSTEM TAKİP PANELİ - BÜYÜK İNŞA İCRA PLANI (NİHAİ MİMARİ YOL HARİTASI)
*Sıfır Hata (Zero Defect) Doktrini uyarınca, adım sekmeden uygulanacak sıralı operasyon listesi.*

## [✔] KADEME 0: ANAYASA (CORE CONTRACTS & TYPINGS)
- **Hedef:** Sistemin omurgası olan `TASK CONTRACT`, `ACL`, `Validation` gibi tiplerin Typescript safiyetinde `src/core/types/architecture.ts` altına kodlanması.
- **Kural:** Şema sözleşmeleri olmadan hiçbir modül veri akışı sağlayamaz. (Sıfır inisiyatif).
- **Test:** `npx tsc --noEmit` ile matematiksel derleme kontrolü.

## [ ] KADEME 1: GÖREV KABUL VE ANLAMA MOTORU API SERVİSİ
- **Hedef:** Distilasyon, Atomizasyon, Consensus ve Red-Team check algoritmalarının mock / entegre servisi.
- **Güvenlik Çemberi:** Intent Sanity Check kapısında iptallerin test edilmesi.
- **Test:** API uç noktasına gönderilen bozuk komutun "Saldırı" algılanıp G-7 onaya fırlayışının test edilmesi (Echo Gate).

## [ ] KADEME 2: SİMÜLASYON VE KAYNAK YÖNETİMİ
- **Hedef:** Multi-Scenario Dry-Run mekanizması ve `RESOURCE GOVERNOR` dosyasının inşası. (İşlem limit testleri).
- **Test:** Düşük Token / Yüksek CPU gerektiren sahte bir görevin simülasyonda patlatılarak "Bütçe Aşımı" dedekte edilip reddedilmesinin test edilmesi.

## [ ] KADEME 3: SNAPSHOT LOCK VE PLANLAMA KÖPRÜSÜ
- **Hedef:** İşleme başlamadan önceki "Durumu Dondur" kod diziliminin (Supabase Database savepoint / Rollback noktası referansı) yaratılması.
- **Handshake:** G-0 Komutan Teknik Onayı mekanizmasının devrede olup Mühür beklenmesi.
- **Test:** Snapshot kaydı simülasyonu çalıştırılarak Rollback mekanizmasının tepkisini doğrulama.

## [ ] KADEME 4: İCRA, EXECUTION GUARD VE ÇİFT DENETİM (DUAL VALIDATION)
- **Hedef:** Ajan dağıtımından sonra anlık sapmaları algılayan guard'ın uyarılara karşı kill-switch atması. Result Validation ve Dual Validation algoritmalarının çapraz analizi.
- **Test:** Bir ajanın görev sahası dışına kasıtlı çıkartıldığı senaryoda Global Kill-Switch teyidi.

## [ ] KADEME 5: SCORING (SKORLAMA), AUDIT VE MEMORY WRITE (ACL)
- **Hedef:** Geri Bildirim ve Eğitim Döngüsü inşası. Yerel veya veritabanı ACL Filter yazılarak zehirlenmenin engellenmesi.
- **Test:** Skorların başarılı görevlere göre yazıldığının ve yetkisiz okumaların ACL Filter tarafından reddedildiğinin simülasyon ispatı.
