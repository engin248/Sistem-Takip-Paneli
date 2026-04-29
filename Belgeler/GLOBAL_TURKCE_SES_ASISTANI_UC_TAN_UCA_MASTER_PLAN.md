# Global Türkçe Ses Asistanı — Uçtan Uca Master Plan, Operasyon Planı, Proje Planı ve Kontrol Raporu

## 1. Belgenin amacı
Bu belge, global çalışan Türkçe ses asistanı konusunu ilk işlemden son işleme kadar tek parça bir sistem olarak ele alır.

Amaç:
- bütün alternatifleri görmek,
- her adım için en doğru seçeneği seçmek,
- alt kriterleri tanımlamak,
- teknoloji, operasyon, test ve kontrol planını birleştirmek,
- eksiksiz bir nihai yol haritası vermek.

Bu belge şu soruya cevap verir:
> İnsanların yazıları okumaya yetişemediği noktada, insan yararına, güvenli, doğrulanabilir, erişilebilir ve sürdürülebilir bir global sesli bilişsel yardımcı sistem nasıl tasarlanmalı, nasıl kurulmalı, nasıl test edilmeli ve nasıl doğrulanmalıdır?

---

## 2. Nihai hedef tanımı
Nihai sistem şunu yapmalıdır:
- kullanıcıyı Türkçe dinlemeli,
- sesi doğru yazıya çevirmeli,
- anladığını doğrulamalı,
- aktif uygulamayı tanımalı,
- doğru giriş alanını bulmalı,
- doğru gönderim yöntemini seçmeli,
- gelen cevabı yakalamalı,
- cevabı özetleyip sesli sunabilmeli,
- düşük güven durumunda işlemi durdurmalı,
- kullanıcı bilişsel yükünü azaltmalı,
- insan kontrolünü korumalı.

Kısaca hedef ürün:
**Global, insan merkezli, doğrulamalı, profil tabanlı, çok katmanlı Türkçe bilişsel ses asistanı.**

---

## 3. Problem tanımı
Ana problem sadece sesli yazma değildir.

Asıl problem:
- bilgi yükü çok fazla,
- okuma kapasitesi sınırlı,
- insan dikkat süresi parçalanıyor,
- yanlış anlamanın maliyeti yüksek,
- uygulamalar arası çalışma kopuk,
- erişilebilirlik sınırlı,
- kritik bilgiyi ayıklamak zor.

Bu yüzden çözüm, sıradan bir `speech-to-text` aracı değil; bir **bilişsel yük azaltma sistemi** olmalıdır.

---

## 4. Değişmez ana ilkeler
Her aşamada korunacak kurallar:

1. Doğrulanmamış kritik metin doğrudan gönderilmez.
2. Aktif hedef uygulama doğrulanmadan otomasyon yapılmaz.
3. API varsa önce API kullanılır.
4. API yoksa UI Automation kullanılır.
5. UI Automation yoksa klavye/pano yedek yöntem olur.
6. Belirsizlik varsa sistem durur ve doğrulama ister.
7. Sistem kendi ürettiği sesi kendi komutu sanmamalıdır.
8. Sistem kendi pano işlemlerini gelen cevap sanmamalıdır.
9. İnsan kontrolü nihai otoritedir.
10. Gizlilik ve yerellik mümkün olan her noktada önceliklidir.
11. Her işlem izlenebilir ve test edilebilir olmalıdır.
12. Hız, doğruluğun önüne geçirilmez.

---

## 5. Başarı ölçütleri
Bir sistemin başarılı sayılması için aşağıdaki hedefler ölçülmelidir:

### 5.1 İşlevsel ölçütler
- Türkçe ses tanıma doğruluğu
- yanlış gönderim oranı
- yanlış pencereye yazma oranı
- hedef alanı doğru bulma oranı
- cevap yakalama oranı
- otomatik okuma doğruluğu
- işlem başına kullanıcı müdahalesi sayısı

### 5.2 İnsan merkezli ölçütler
- kullanıcı başına günlük zaman kazancı
- okuma yükünde azalma
- dikkat yorgunluğunda azalma
- erişilebilirlik puanı
- kullanıcı güven puanı
- iptal edilen yanlış işlem oranı

### 5.3 Matematiksel başarı formu
$$
Skor = 0.30D + 0.20G + 0.15A + 0.15E + 0.10H + 0.10K
$$

Burada:
- $D$ = doğruluk
- $G$ = güvenlik
- $A$ = erişilebilirlik
- $E$ = etkileşim kalitesi
- $H$ = hız
- $K$ = kullanıcı memnuniyeti

---

## 6. Uçtan uca sistem akışı
İlk işlemden son işleme kadar ana akış:

1. Sistem başlatılır.
2. Mikrofon ve ses çıkışı doğrulanır.
3. Uygulama profili algılama modülü çalışır.
4. Aktif pencere takip edilir.
5. Kullanıcı uyandırma kelimesiyle sistemi çağırır.
6. Ses alınır.
7. Gürültü/sessizlik segmentasyonu yapılır.
8. Ses yazıya çevrilir.
9. Güven puanı hesaplanır.
10. Niyet analizi yapılır.
11. Hedef uygulama profili seçilir.
12. Giriş alanı tespit edilir.
13. Düşük güven veya kritik işlem varsa doğrulama sorulur.
14. Kullanıcı onayı alınır.
15. Metin güvenli yöntemle hedefe yazılır.
16. Profil kurallarına göre gönderim yapılır.
17. Cevap alanı izlenir.
18. Yeni cevap yakalanır.
19. Cevap temizlenir/özetlenir.
20. Kullanıcıya sesli veya yazılı sunulur.
21. Günlük/log kaydı tutulur.
22. Başarısızlık varsa fallback mekanizması çalışır.
23. Test ve doğrulama metrikleri kaydedilir.

---

## 7. Ana modüller

### 7.1 Ses alma modülü
İşlev:
- sürekli dinleme
- uyandırma kelimesi
- sessizlik algılama
- segmentleme

### 7.2 STT modülü
İşlev:
- Türkçe ses → yazı
- kelime güven puanı
- düşük güven tespiti

### 7.3 Niyet ve doğrulama modülü
İşlev:
- komut mu
- gönderilecek metin mi
- sistem ayarı mı
- okuma isteği mi
- onay gerektiriyor mu

### 7.4 Profil tespit modülü
İşlev:
- WhatsApp Web
- Telegram
- tarayıcı tabanlı local panel
- VS Code
- masaüstü uygulamalar
- genel güvenli mod

### 7.5 Hedef alan otomasyonu modülü
İşlev:
- yazı kutusu bulma
- gönder butonu bulma
- son mesaj alanı bulma
- okunacak cevap alanı bulma

### 7.6 Gönderim modülü
İşlev:
- API tabanlı gönderim
- UI Automation tabanlı gönderim
- pano/yapıştırma tabanlı gönderim
- profil bazlı Enter/tuş/buton seçimi

### 7.7 Cevap işleme modülü
İşlev:
- cevabı yakalama
- temizleme
- özetleme
- kritik bilgi ayıklama
- tekrar filtresi

### 7.8 TTS modülü
İşlev:
- Türkçe seslendirme
- kısa özet okuma
- kritik durum uyarısı
- onay isteme

### 7.9 Güvenlik/log modülü
İşlev:
- işlem geçmişi
- hatalı işlem kaydı
- geri izleme
- kullanıcı onay geçmişi

---

## 8. Teknoloji seçimi — bütün alternatifler ve en doğru seçim

## 8.1 Türkçe STT alternatifleri
### Seçenek A: `Vosk`
Artıları:
- yerel çalışır
- hızlıdır
- düşük kaynak tüketir
- çevrimdışı uygundur

Eksileri:
- doğruluk sınırlı olabilir
- karmaşık konuşmada hata artabilir

Kullanım yeri:
- temel global kullanım
- çevrimdışı zorunlu senaryo

### Seçenek B: `Whisper` yerel modeller
Artıları:
- daha yüksek doğruluk
- bağlamlı çözümleme daha güçlü

Eksileri:
- daha ağırdır
- GPU/CPU maliyeti daha yüksektir

Kullanım yeri:
- yüksek doğruluk gereken sistem
- güçlü donanım varsa

### Seçenek C: Bulut tabanlı STT
Artıları:
- bazı durumlarda yüksek doğruluk
- bakım kolay olabilir

Eksileri:
- mahremiyet riski
- internet bağımlılığı
- gecikme
- maliyet

### En doğru seçim
- **Birincil:** `Vosk` veya yerel `Whisper`
- **Uzun vadeli en iyi:** hibrit yapı
  - varsayılan yerel STT
  - kritik hata durumunda ikinci görüş motoru

---

## 8.2 Türkçe TTS alternatifleri
### Seçenek A: `Edge TTS`
Artıları:
- doğal sesler
- Türkçe desteği iyi
- uygulaması kolay

Eksileri:
- servis davranış bağımlılığı olabilir

### Seçenek B: yerel TTS motorları
Artıları:
- çevrimdışı çalışır

Eksileri:
- kalite düşük olabilir

### En doğru seçim
- **Birincil:** `Edge TTS`
- **Yedek:** yerel TTS

---

## 8.3 Otomasyon katmanı alternatifleri
### Seçenek A: API entegrasyonu
En doğru yöntemdir.

Artıları:
- en güvenli
- en doğru
- en izlenebilir
- en az kırılgan

Eksileri:
- her uygulamada yok

### Seçenek B: Windows UI Automation
Artıları:
- gerçek UI öğesi tanıma
- alan, buton, liste, metin öğesi seçimi
- seçmeden son mesaj yakalama imkanı

Eksileri:
- her uygulamada eşit kalite yok
- bazı web arayüzlerinde ekstra uyarlama gerekir

### Seçenek C: Klavye/pano otomasyonu
Artıları:
- hızlı kurulum
- çoğu yerde çalışır

Eksileri:
- kırılgan
- yanlış pencereye yazma riski
- alan doğruluğu zayıf

### Seçenek D: OCR/screen parsing
Artıları:
- diğer yöntemler yoksa işe yarar

Eksileri:
- hata riski yüksek
- performans yükü

### En doğru seçim sırası
1. API
2. UI Automation
3. Klavye/pano
4. OCR

---

## 8.4 Aktif pencere/alan tespiti için doğru seçim
En doğru yaklaşım:
- pencere başlığı + işlem adı + UIA element ağacı birlikte kullanılmalı
- sadece pencere başlığına güvenilmemeli

---

## 9. Profil tabanlı davranış tasarımı

## 9.1 WhatsApp Web profili
Tespit:
- pencere başlığında `WhatsApp`
- tarayıcı içinde WhatsApp DOM/UI yapısı

Davranış:
- mesaj kutusunu UIA ile bul
- mesaj balonlarını izle
- `Enter` ile gönder
- son gelen mesajı otomatik çek
- okunacak mesajı gönderene göre filtrele

Kontrol kriteri:
- yanlış kişiye gönderim olmamalı
- aktif sohbet doğrulanmalı

## 9.2 Telegram profili
Tespit:
- pencere başlığında `Telegram`

Davranış:
- mesaj giriş alanını UIA ile bul
- gönder tuşu/Enter davranışını profil ayarından kullan
- yeni mesaj alanını izle

Kontrol kriteri:
- çok satırlı mesaj ve gönder davranışı ayrılmalı

## 9.3 Local panel profili
Tespit:
- `localhost`, `127.0.0.1`, proje adı, panel adı

Davranış:
- giriş alanı ve yanıt alanı tanınmalı
- mümkünse DOM/API entegrasyonu yapılmalı
- cevap alanı değişim bazlı izlenmeli

Kontrol kriteri:
- her panel için selector veya UIA tanımı tutulmalı

## 9.4 Tarayıcı genel profili
Tespit:
- Chrome/Edge/Firefox ve profil eşleşmesi yoksa

Davranış:
- genel güvenli mod
- otomatik gönderim sınırlı
- onay zorunlu

## 9.5 Masaüstü uygulama profili
Tespit:
- işlem adı + pencere başlığı + UI element yapısı

Davranış:
- UIA öncelikli
- pano fallback

---

## 10. Alt kriter matrisi
Her işlem için alt kriterler:

### 10.1 Ses alma
- mikrofon erişimi
- ortam gürültüsü
- sessizlik eşikleri
- echo bastırma
- kullanıcı sesi ayırma

### 10.2 Ses çözümleme
- kelime doğruluğu
- cümle bütünlüğü
- terim tanıma
- güven puanı
- tekrar çözümleme ihtiyacı

### 10.3 Anlam doğrulama
- cümle anlamı korunmuş mu
- kritik kelime kaybı var mı
- sayı/tarih/saat doğru mu
- özel isim doğru mu

### 10.4 Uygulama tespiti
- pencere başlığı doğru mu
- işlem doğru mu
- yanlış sekme riski var mı
- profil eşleşme güveni yeterli mi

### 10.5 Hedefe yazma
- doğru input alanı mı
- odak kayması oldu mu
- metin eksik mi
- Unicode/Türkçe karakterler tam mı

### 10.6 Gönderim
- buton mu Enter mı
- çok satırlı mesaj sorunu var mı
- yanlış alana Enter basıldı mı

### 10.7 Cevap alma
- cevap gerçekten yeni mi
- sistem kendi yazısını mı okuyor
- aynı cevap tekrarlandı mı
- sadece son cevap mı seçildi

### 10.8 Sesli sunum
- kısa mı
- anlaşılır mı
- gereksiz uzun mu
- kritik bilgi öne çıkarıldı mı

---

## 11. Operasyon planı

## Faz 0 — Hazırlık
İşler:
- gereksinim toplama
- hedef uygulama listesi
- kullanıcı senaryoları
- gizlilik şartları

Çıktı:
- kapsam dokümanı
- kullanım senaryoları
- risk listesi

## Faz 1 — Temel çalışan çekirdek
İşler:
- ses alma
- Türkçe STT
- TTS
- uyandırma kelimesi
- temel global gönderim

Test:
- mikrofon testi
- Türkçe karakter testi
- temel konuşma doğruluğu
- TTS kalite testi

Çıktı:
- minimum çalışan prototip

## Faz 2 — Doğrulama ve güvenlik
İşler:
- güven puanı
- doğrulama diyalogu
- düşük güven durumunda durma
- kendi sesini algılamama
- pano çakışma kontrolü

Test:
- yanlış anlama testi
- yankı testi
- iptal senaryoları

Çıktı:
- güvenli sesli komut sistemi

## Faz 3 — Uygulama profilleri
İşler:
- WhatsApp Web profili
- Telegram profili
- local panel profili
- genel tarayıcı profili

Test:
- her uygulamada giriş alanı doğruluğu
- doğru sohbet hedefi testi
- gönderim yöntemi testi

Çıktı:
- profil tabanlı otomasyon

## Faz 4 — UI Automation katmanı
İşler:
- gerçek element bulma
- input, button, message list tanıma
- yeni mesaj ayıklama

Test:
- alan bulma doğruluğu
- ekran değişim dayanıklılığı
- farklı çözünürlük testi

Çıktı:
- dayanıklı uygulama etkileşimi

## Faz 5 — Cevap işleme ve özetleme
İşler:
- yeni cevap tespiti
- temizleme
- özetleme
- kritik madde çıkarımı

Test:
- uzun cevap testi
- çok mesajlı akış testi
- yinelenen cevap filtresi

Çıktı:
- bilişsel yük azaltan geri bildirim katmanı

## Faz 6 — İzleme, log, ölçüm
İşler:
- olay kaydı
- hata kaydı
- kalite metrikleri
- performans raporu

Test:
- yük testi
- uzun süreli çalışma testi
- arıza sonrası toparlanma

Çıktı:
- üretim kalitesine yakın sistem

---

## 12. Proje planı

## 12.1 İş paketleri
### Paket 1 — Ses altyapısı
- mikrofon
- segmentleme
- STT
- TTS

### Paket 2 — Anlama ve doğrulama
- güven puanı
- onay akışı
- komut sınıflama

### Paket 3 — Profil sistemi
- uygulama tespiti
- profil kuralları
- hedef alan kuralları

### Paket 4 — UI Automation
- Windows UIA
- element bulma
- okuma alanı bulma

### Paket 5 — Cevap işleme
- yeni cevap tespiti
- özetleme
- sesli sunum

### Paket 6 — Güvenlik ve kalite
- gizlilik
- log
- test setleri
- regresyon testi

## 12.2 Bağımlılık sırası
1. Ses altyapısı
2. Doğrulama katmanı
3. Profil sistemi
4. UI Automation
5. Cevap işleme
6. Gözlemleme/test/raporlama

---

## 13. Teknoloji listesi
Önerilen teknoloji yığını:

### Çekirdek
- Python 3.11+

### Ses
- `sounddevice`
- `vosk` veya yerel `whisper`
- `edge-tts`
- `pygame`

### Otomasyon
- `keyboard`
- `pyperclip`
- Windows UI Automation kütüphanesi (`uiautomation` tipi yaklaşım)

### İşleme ve mantık
- Python tabanlı profil motoru
- yerel JSON/YAML profil tanımları

### Test
- birim test
- senaryo testi
- manuel doğrulama checklisti
- log tabanlı regresyon testi

---

## 14. Etki alanları
Bu sistem şu alanlarda etkilidir:
- erişilebilirlik
- yaşlı bakım destek teknolojileri
- yoğun bilgi işçiliği
- eğitim destek sistemleri
- saha operasyonları
- sağlık personeli destek araçları
- yönetici asistan sistemleri
- kişisel verimlilik

---

## 15. Riskler ve karşı önlemler

### Risk: yanlış anlama
Önlem:
- güven puanı
- sesli tekrar
- onay

### Risk: yanlış pencereye yazma
Önlem:
- aktif pencere + işlem + UIA üçlü doğrulama

### Risk: kendi sesi tetikleme
Önlem:
- TTS sırasında dinleme bastırma

### Risk: pano çakışması
Önlem:
- geçici pano bastırma süresi

### Risk: uygulama arayüz değişikliği
Önlem:
- profil güncelleme katmanı
- selector/UIA fallback

### Risk: gizlilik ihlali
Önlem:
- yerel işleme önceliği
- hassas içerik için bulut dışı çalışma

### Risk: kullanıcı aşırı güveni
Önlem:
- kritik işlemlerde zorunlu onay

---

## 16. Kontrol kriterleri
Her sürüm çıkmadan önce aşağıdaki kontrol listesi çalıştırılmalıdır:

### 16.1 Ses kontrolü
- mikrofon doğru mu
- yankı bastırma çalışıyor mu
- Türkçe karakter çözümü tam mı
- sessizlik algısı doğru mu

### 16.2 STT doğruluk kontrolü
- sayı/tarih/saat doğru mu
- özel adlar doğru mu
- teknik terimler doğru mu
- güven puanı hesaplanıyor mu

### 16.3 Profil kontrolü
- aktif pencere doğru tanınıyor mu
- profil doğru seçiliyor mu
- yanlış profil riski var mı

### 16.4 Hedef alan kontrolü
- yazı kutusu doğru mu
- başka alan mı seçildi
- çok satırlı alanda sorun var mı

### 16.5 Gönderim kontrolü
- doğru tuş/buton mu
- yanlış pencere Enter aldı mı
- otomatik gönder doğru çalışıyor mu

### 16.6 Cevap kontrolü
- gerçekten yeni cevap mı
- kendi ürettiği metni mi yakaladı
- bir önceki mesaj tekrarlandı mı

### 16.7 Sesli okuma kontrolü
- cevap doğru mu okundu
- özet doğru mu
- kritik alanlar kayboldu mu

### 16.8 Güvenlik kontrolü
- log doğru mu
- kritik onaylar tutuluyor mu
- hassas veri dışarı çıkıyor mu

---

## 17. Test planı

## 17.1 Birim testler
- profil eşleme testi
- güven puanı hesaplama testi
- doğrulama cevabı ayrıştırma testi
- mesaj temizleme testi
- tekrar filtresi testi

## 17.2 Entegrasyon testleri
- ses al → yazı → doğrulama → gönder
- cevap al → özetle → seslendir
- profil değiştir → farklı uygulama akışı

## 17.3 Kullanıcı senaryo testleri
### Senaryo 1
WhatsApp Web açık
- kullanıcı komutu söyler
- sistem tekrar eder
- kullanıcı onaylar
- mesaj doğru kişiye gider

### Senaryo 2
Telegram açık
- çok satırlı mesaj testi
- Enter davranışı kontrolü

### Senaryo 3
Local panel açık
- otomatik yanıt algısı
- sesli özet okuma

### Senaryo 4
Yanlış anlama
- kullanıcı “hayır” der
- sistem iptal eder
- yeniden ister

### Senaryo 5
Düşük güven puanı
- sistem zorunlu onay ister

## 17.4 Regresyon testleri
Her yeni sürümde tekrar çalıştırılacak:
- 20 sabit komut seti
- 10 gürültülü ortam örneği
- 10 farklı uygulama geçişi
- 10 cevap yakalama örneği

## 17.5 Kabul testleri
Sistem ancak şu durumda kabul edilir:
- kritik yanlış gönderim oranı çok düşük
- profil doğruluğu yeterli
- kullanıcı onay akışı hatasız
- sesli okuma kararlı
- en az 2 saat stabil çalışma

---

## 18. Nihai karar matrisi

### En doğru genel mimari
- yerel öncelikli
- doğrulama zorunlu
- profil tabanlı
- API-first
- UIA-second
- pano/keyboard fallback
- cevap özetlemeli
- sesli geri bildirimli

### En iyi teknoloji kombinasyonu
- STT: yerel `Vosk`, ileri aşamada yerel `Whisper`
- TTS: `Edge TTS`
- otomasyon: UI Automation + yedek clipboard/keyboard
- mantık: Python profil motoru
- kalite: sürekli test + log + kontrol listesi

---

## 19. Sonuç
Bu konuda tek doğru sonuç şudur:

Sadece konuşmayı yazıya çevirmek yetmez.
Doğru sistem:
- insanı dinler,
- doğru anlar,
- emin değilse durur,
- doğru uygulamayı seçer,
- doğru alana işler,
- doğru cevabı yakalar,
- dikkat yükünü azaltır,
- insan yararını merkeze koyar.

Bu yüzden bu projenin en doğru final formu:
**insan merkezli, doğrulamalı, güvenli, profil tabanlı, UI otomasyon destekli, cevap özetleyen global Türkçe bilişsel asistan sistemi**dir.

---

## 20. Net sonlandırma ve uygulama sırası
Bu belgeden sonra izlenecek doğru uygulama sırası:

1. mevcut çekirdeği koru
2. UI Automation katmanı ekle
3. uygulama profillerini gerçek alan tanımalı hale getir
4. cevap alanı yakalama modülü ekle
5. özetleme ve kritik bilgi ayıklama katmanı ekle
6. kapsamlı test senaryolarını çalıştır
7. log ve kalite raporlarını topla
8. üretim öncesi kabul testini uygula
9. kullanıcı pilotu yap
10. geri bildirimle profilleri sertleştir

---

## 21. Bu belge nasıl kullanılmalı
Bu belge aynı anda:
- strateji belgesi,
- mimari referans,
- operasyon planı,
- kontrol rehberi,
- test rehberi,
- proje yol haritası
olarak kullanılmalıdır.

Bu belge, konunun parçalı değil bütünlüklü ilerletilmesi için temel referans dokümandır.
