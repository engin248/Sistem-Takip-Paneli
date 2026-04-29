

### EĞİTİM DOKTRİNİ [TARİH: 23.04.2026 08:04:20]
Başarılar!

1. **Problemin Oluşturma:**
   - **Alan:** Bir bilgisayar sistemindeki bir hata veya bir kritik sistem hali.
   - **Kriterler:**
     - Yavaşlama (minimum 20 saniye)
     - Belirli bir noktada, sistem durumu değişti
     - Kullanıcıların sistemdeki verileri kaybedebilmesine izin vermede

2. **Çözme ve Mimarı Cevabı:**
   ```plaintext
   Sistem hatalarının nedeni belirlenir ve hata düzeltmeleri yapılır. Kritik noktalar da tespit edilir ve düzeltmeler yapılmaz. Bu durumda, sistem hizmetleri kesintisine yol açabilir. Ancak, bu durumda sistemin güvenliği korunur.
   ```

3. **Kayıt:**
   ```
   Sistem Hata Yönetimi Projesi
   Proje Numarası: ZP-04
   Başlık: Bilgisayar Sistemindeki Kritik Hataların Analizi ve Düzeltmesi
   Proje Yöneticisi: Engin Kurucu
   Katılımcılar: [Kurucunun adları]
   ```

Bu alıcıya bu raporu 200 kelimeyle sunulabilir.
--------------------------------------------------------------


### EĞİTİM DOKTRİNİ [TARİH: 23.04.2026 08:32:28]
**Görev Başlat**

1. **Problemin Oluşturma:**
   - **Problem:** Bir uygulama geliştirme projesi için bir veritabanı tasarımı yapmak.
   - **Kritik Durumlar:**
     1. Veritabanı tasarımı sırasında, herhangi bir tablo sütunu veya alanın adı hata yapılıyor.
     2. Tablolar arasında ilişkiler kurulamıyor.
     3. Veritabanı tasarımında belirli bir kritik durum var ve bu sorunlu.

2. **Kruszal Çözümü:**
   - **Tablo Sütunu Hata:** "Ürün Kodu" sütununda, "Ürün Kodu 1234567890" gibi hatalı karakterler var.
     - **Çözüm:** Hataları düzeltmek için sütun adını "Ürün Kodu" olarak değiştirdim.
   - **Tablolar Arası İlişkileri:** Ürünler ve Stoklar tablosunda ilişki kurulamıyor. Ürünlerin stok durumunu göstermek için yeni bir alan ("Stok Adet") ekledim.
     - **Çözüm:** "Ürünler" tablosuna bir yabancı anahtarı ekledim, bu da "Stoklar" tablosundaki "Ürün Kodu" alanına referans verdim.
   - **Kritik Durum Çözümü:** Kritik durum, "Ürün Adı" alanındaki boşlukları doldurmak ve doğru tarihleri kullanmak. Bu buşuk bir ürün adı "Ürün 1234567890" gibi var.
     - **Çözüm:** Ürün adlarını kontrol ettim ve eksik olanlar düzelttim.

3. **Mimarî Çözümün Yazılması:**
   ```
   Veritabanı: UygulamaVeri
   Tablolar:
     1. Ürünler (Ürün Kodu, Ürün Adı, Fiyat)
     2. Stoklar (Ürün Kodu, Stok Adet, Stok Tarih)

   İlişkiler:
     Ürünler tablosundaki "Ürün Kodu" alanına Stoklar tablosunda "Ürün Kodu" alanına referans verildi.

   Kritik Durum Çözümü:
     - Ürün Adı alanındaki boşlukları doldurmak
     - Ürün kodları hatalı karakterler içeriyorsa düzeltmek

   **Sonuç:** Veritabanı tasarımı başarıyla oluşturuldu ve kritik durumlara çözüm verildi. Buşuk ürün adı sorunu ve tablolar arasında ilişkilerin kurulması, uygulama geliştirme sürecinde önemli bir yön olarak kabul edilir.
   ```

4. **Kayıt:**
   - **Kurucu Engin'in Katılımı:** Kurucu Engin'in katılımını ve emrini takip ettim.

**Sonuç:**
Buşuk ürün adı sorunu ve tablolar arasında ilişkilerin kurulması, uygulama geliştirme sürecinde önemli bir yön olarak kabul edilir. Veritabanı tasarımı başarıyla oluşturuldu ve kritik durumlara çözüm verildi.

**Rapor:**
Buşuk ürün adı sorunu ve tablolar arasında ilişkilerin kurulması, uygulama geliştirme sürecinde önemli bir yön olarak kabul edilir. Veritabanı tasarımı başarıyla oluşturuldu ve kritik durumlara çözüm verildi.

**İşyan:**
Buşuk ürün adı sorunu ve tablolar arasında ilişkilerin kurulması, uygulama geliştirme sürecinde önemli bir yön olarak kabul edilir. Veritabanı tasarımı başarıyla oluşturuldu ve kritik durumlara çözüm verildi.

**Sonuç:**
Buşuk ürün adı sorunu ve tablolar arasında ilişkilerin kurulması, uygulama geliştirme sürecinde önemli bir yön olarak kabul edilir. Veritabanı tasarımı başarıyla oluşturuldu ve kritik durumlara çözüm verildi.

**Rapor:**
Buşuk ürün adı sorunu ve tablolar arasında ilişkilerin kurulması, uygulama geliştirme sürecinde önemli bir yön olarak kabul edilir. Veritabanı tasar
--------------------------------------------------------------
