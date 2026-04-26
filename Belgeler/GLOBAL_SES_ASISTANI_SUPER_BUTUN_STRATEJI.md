# Global Ses Asistanı — Süper Bütün Strateji, Nihai Karar Seti ve Doğru Yol Haritası

## 1. Belgenin rolü
Bu belge, konudaki dağınık seçenekleri tek yerde toplar ve şu soruya net cevap verir:

> Bu işi en doğru, en güvenli, en sürdürülebilir, en insan yararına ve en geniş entegrasyonlu şekilde yapmak için hangi seçenekler seçilmeli, hangi işlem sırası izlenmeli ve hangi kurallar değişmez kabul edilmelidir?

Bu belge birleştirir:
- strateji,
- teknoloji seçimi,
- karar matrisi,
- entegrasyon yaklaşımı,
- operasyon akışı,
- kontrol kriterleri,
- test kriterleri,
- ürün yönü,
- mimari kararlar.

---

## 2. Nihai hedef
Nihai ürün sadece bir sesli yazma aracı değildir.

Nihai hedef:
- kullanıcıyı dinleyen,
- sesi güvenilir biçimde yazıya çeviren,
- gerektiğinde diller arasında çeviri yapan,
- ne anladığını doğrulayan,
- aktif uygulamayı ve platformu tanıyan,
- doğru alana güvenli biçimde yazan,
- doğru yöntemle gönderen,
- cevabı yakalayan,
-   tam net doğru veren 
- Türkçe başta olmak üzere çok dilli sesli geri bildirim veren,
- insanın dikkat yükünü azaltan,
- insan kontrolünü merkezde tutan
bir **global bilişsel ses asistanı** kurmaktır.

---

## 3. Değişmez ana kurallar
Aşağıdaki kurallar her zaman korunmalıdır:

1. İnsan kontrolü en üst katmandır.
2. Kritik işlem doğrulama olmadan gönderilmez.
3. API varsa önce API kullanılır.
4. API yoksa UI Automation kullanılır.
5. UI Automation yoksa pano/klavye fallback kullanılır.
6. OCR son çaredir.
7. Düşük güven puanında otomatik gönderim yapılmaz.
8. Yanlış pencereye işlem yapma riski her zaman kontrol edilir.
9. Sistem kendi sesini kendi komutu saymamalıdır.
10. Sistem kendi pano işlemini yeni cevap sanmamalıdır.
11. Yerel işleme öncelik verilir.
12. Her işlem loglanabilir, test edilebilir ve geri izlenebilir olmalıdır.

---

## 4. Doğru yolun ana omurgası
En doğru genel çözüm aşağıdaki 10 katmanlı mimaridir:

1. Ses giriş katmanı
2. Çoklu STT katmanı
3. Otomatik dil algılama katmanı
4. Niyet ve anlam doğrulama katmanı
5. Çeviri katmanı
6. Uygulama ve platform profili katmanı
7. Güvenli hedefleme ve gönderim katmanı
8. Cevap yakalama katmanı
9.  TTS katmanı
10. Log, kontrol ve kalite katmanı

---

## 5. En iyi teknoloji seçenekleri

## 5.1 Çekirdek dil
**Doğru seçim:** Python

Neden:
- hızlı prototipleme
- otomasyon desteği güçlü
- ses işleme ekosistemi geniş
- masaüstü servis mantığına uygun

## 5.2 Ses alma
**Doğru seçim:** `sounddevice`

## 5.3 STT
### En iyi mevcut yapı
- Türkçe için yerel `Vosk`
- Arapça için ikinci `Vosk` modeli
- ileri seviye doğruluk için yerel `Whisper` yükseltme katmanı

### Nihai doğru seçim
- kısa vadede: `Vosk` çoklu model yapısı
- orta vadede: Türkçe + Arapça + İngilizce için hibrit `Vosk` + yerel `Whisper`

## 5.4 TTS
**Doğru seçim:** `Edge TTS`

Neden:
- erkek/kadın ses desteği
- çok dilli kapsama
- Türkçe ve Arapça ses kalitesi uygun

## 5.5 Çeviri
**Doğru seçim:** yerel/servis tabanlı çeviri katmanı + şu an için `deep-translator`

Orta vadede doğru yön:
- yerel çeviri modeli veya kontrollü servis katmanı

## 5.6 Otomasyon
Karar sırası:
1. API
2. Windows UI Automation
3. pano + yapıştırma
4. klavye simülasyonu
5. OCR destekli son çare

## 5.7 Profil yönetimi
**Doğru seçim:** harici JSON profil dosyası

Neden:
- üst projeye entegrasyon kolay
- alt projeye entegrasyon kolay
- masaüstü/web/tablet/mobil ayrımı tanımlanabilir
- dil başına davranış profili verilebilir

---

## 6. Şu an için en doğru karar seti
Bu proje özelinde en iyi karar kombinasyonu:

- Çekirdek: Python servis mantığı
- Ses alma: `sounddevice`
- STT: Türkçe + Arapça çoklu `Vosk`
- Dil algılama: `langdetect` + yazı karakter seti tabanlı puanlama
- TTS: `Edge TTS`
- Çeviri: `deep-translator`
- Ses oynatma: `pygame`
- Yedek otomasyon: `keyboard` + `pyperclip`
- Profil sistemi: `global_ses_asistani_profiles.json`
- Entegrasyon belgesi: ortak mimari doküman

Bu, kısa ve orta vade için en iyi dengedir.

---

## 7. Doğru işlem sırası
İlk işlemden son işleme kadar ideal akış:

1. Sistem başlatılır.
2. Mikrofon ve ses çıkışı doğrulanır.
3. Profil dosyaları yüklenir.
4. Aktif pencere ve platform algılanır.
5. Profil seçilir.
6. Dil tercihleri ve profil tercihleri uygulanır.
7. Kullanıcı uyandırma kelimesiyle sistemi çağırır.
8. Ses segmentlenir.
9. STT aday motorları çalışır.
10. En doğru dil/STT sonucu seçilir.
11. Metin güven puanı hesaplanır.
12. Niyet analizi yapılır.
13. Gerekliyse çeviri hazırlanır.
14. Kullanıcıya “şunu anladım” doğrulaması yapılır.
15. Onay varsa hedef alana güvenli yazım yapılır.
16. Profil kurallarına göre gönderim yapılır.
17. Cevap akışı izlenir.
18. Yeni cevap tespit edilir.
19. Cevap temizlenir veya özetlenir.
20. Kullanıcıya seçili dil ve seçili sesle geri bildirim verilir.
21. Olay logu yazılır.
22. Hata varsa fallback yürütülür.

---

## 8. Doğru alternatif seçimi tablosu

## 8.1 Ses giriş dili için
### Alternatifler
- sabit tek dil
- manuel dil değiştirme
- otomatik dil algılama
- çoklu aday model yarışı

### En iyi seçim
**çoklu aday model + otomatik dil algılama + manuel override**

Bu yüzden doğru yapı:
- varsayılan otomatik algılama
- kullanıcı isterse sabit giriş dili belirleyebilir
- Türkçe ana dil, Arapça ikinci katman

## 8.2 Gönderim için
### Alternatifler
- doğrudan yazma
- yapıştırma
- UI element set value
- API çağrısı

### En iyi seçim
**API > UIA > yapıştırma > klavye**

## 8.3 Cevap alma için
### Alternatifler
- seçili metin
- pano
- son UI elemanı
- API cevabı
- OCR

### En iyi seçim
**API > UIA son mesaj > seçili metin > pano > OCR**

## 8.4 Profil sistemi için
### Alternatifler
- kod içine gömülü profil
- harici JSON
- veritabanı tabanlı profil yönetimi

### En iyi seçim
- şimdi: harici JSON
- sonra: merkezi profil servisi

---

## 9. Doğru entegrasyon yaklaşımı

## 9.1 Üst projelere entegrasyon
Doğru yol:
- çekirdeği ortak servis yap
- üst proje sadece adaptör kullansın
- profilleri dışarıdan beslesin
- log ve olayları üst proje standardına bağlasın

## 9.2 Alt projelere entegrasyon
Doğru yol:
- her alt modül kendi profil tanımını versin
- ortak ses çekirdeği değişmeden kalsın
- dil, gönderim ve cevap alanı kuralları alt projede tanımlansın

## 9.3 Masaüstü bağımsız kullanım
Doğru yol:
- bu mevcut yapı tek başına masaüstünde çalışır
- başlangıçta otomatik açılır
- global odak takibi yapar

## 9.4 Tablet ve mobil
Doğru yol:
- masaüstü çekirdeğini doğrudan mobile taşımak değil
- çekirdeği servisleştirmek
- istemciyi ayrı geliştirmek
- ortak profil ve dil katmanını paylaşmak

### Sonuç
- masaüstü: mevcut çekirdek uygundur
- web panel: adaptör gerekir
- tablet/mobil: ayrı istemci gerekir

---

## 10. Dil ve ses politikası
En doğru varsayılanlar:
- ana dil: Türkçe
- ikinci güçlü dil: Arapça
- uluslararası destek: İngilizce ve diğer yaygın diller

### Doğru ses politikası
- kullanıcı erkek/kadın ses seçebilmeli
- UI dili ile okuma dili ayrı yönetilebilmeli
- kaynak dil, hedef dil ve seslendirme dili birbirinden bağımsız ama ilişkili tutulmalı

### Doğru çeviri politikası
- kullanıcı Türkçe konuşur
- sistem yazıya döker
- istenirse Arapçaya veya başka dile çevirir
- doğrulama çevrilmiş metin üzerinden yapılır
- gönderim çevrilmiş metin üzerinden yapılır

---

## 11. Kontrol kriterleri
Her aşamada aşağıdaki kontroller zorunludur:

### Ses alma kontrolü
- mikrofon doğru cihaz mı
- ses seviyesi yeterli mi
- yankı bastırma çalışıyor mu

### STT kontrolü
- rakamlar doğru mu
- tarih/saat doğru mu
- özel isim bozuldu mu
- dil doğru algılandı mı

### Doğrulama kontrolü
- düşük güven puanında onay alındı mı
- kullanıcı evet/hayır komutları doğru çözüldü mü

### Profil kontrolü
- doğru pencere mi
- doğru uygulama mı
- doğru platform mu
- doğru dil profili uygulandı mı

### Gönderim kontrolü
- hedef alan doğru mu
- gönder tuşu doğru mu
- çok satırlı içerik bozuldu mu

### Cevap kontrolü
- gerçekten yeni cevap mı
- sistemin kendi metni mi
- tekrarlı mı

### TTS kontrolü
- doğru dil sesi mi
- seçilen erkek/kadın sesi mi
- gereksiz uzunluk var mı

---

## 12. Test planı

## 12.1 Birim test
- dil çözümleme
- profil eşleme
- çeviri yönü
- onay ayrıştırma
- ses seçimi
- aday model puanlama

## 12.2 Entegrasyon testi
- Türkçe konuş → Türkçe gönder
- Türkçe konuş → Arapçaya çevir → Arapça gönder
- Arapça konuş → Arapça çöz → Arapça gönder
- Türkçe konuş → İngilizce çeviri → okuma

## 12.3 Profil testi
- WhatsApp Web
- Telegram
- Local panel
- VS Code
- genel tarayıcı

## 12.4 Dayanıklılık testi
- 2 saat sürekli çalışma
- gürültülü ortam testi
- odak kayması testi
- ardışık cevap testi

## 12.5 Kabul testi
Sistem kabul edilir ancak şu koşullarla:
- yanlış dil algılama oranı kabul sınırında olmalı
- kritik yanlış gönderim olmamalı
- doğrulama akışı kararlı olmalı
- en az Türkçe ve Arapça akışı stabil olmalı

---

## 13. Kör noktaları kapatma listesi
Bu konuda hiçbir açık bırakmamak için kontrol edilmesi gereken başlıklar:

- yanlış dil algılama
- yanlış ses profili
- yanlış pencere odaklanması
- aynı anda konuşma ve seslendirme çakışması
- kendi kopyaladığı metni tekrar okuma
- kullanıcı onayı gelmeden gönderim
- mobil/tablet için yanlış mimari beklentisi
- profil dosyasının bozulması
- uygulama arayüzü değişiminden doğan kırılma
- internet bağımlı çeviri hatası
- düşük kalite mikrofonda yanlış çözümleme

---

## 14. Bugün için en iyi uygulanabilir son durum
Bugün gerçekçi olarak en iyi yapı şudur:

- masaüstünde çalışan ortak ses çekirdeği
- Türkçe + Arapça çoklu STT
- otomatik dil algılama
- çeviri katmanı
- erkek/kadın çok dilli seslendirme
- dış JSON profil sistemi
- üst/alt proje entegrasyonuna uygun yapı
- masaüstünde bağımsız çalışma
- web panellerde profil uyarlaması
- mobil/tablet için servisleşmeye hazır mimari

Bu, şu anda teknik olarak en iyi dengeyi verir.

---

## 15. Bundan sonraki en doğru adımlar
1. UI Automation katmanı eklemek
2. API/IPC servis katmanı açmak
3. profil dosyasını genişletmek
4. Türkçe + Arapça + İngilizce için gelişmiş STT katmanı eklemek
5. mobil/web istemci ayrıştırması yapmak
6. cevap yakalama katmanını güçlendirmek
7. özetleme ve önceliklendirme motoru eklemek

---

## 16. Nihai sonuç
En doğru ve en iyi bütünleşik seçenek şudur:

**Tek çekirdek + çoklu STT + otomatik dil algılama + çeviri + dil başına profil + API-first entegrasyon + UI Automation + güvenli doğrulama + çok dilli TTS + harici profil yönetimi.**

Bu yapı:
- masaüstünde çalışır,
- üst ve alt projelere entegre olabilir,
- web ve local panelleri destekler,
- mobil/tablet tarafına servisleşerek taşınabilir,
- insan yararını ve doğruluğu merkeze alır.

---

## 17. Dış AR-GE ve pazar sentezi ile güçlendirilmiş nihai karar
Bu belge artık yalnızca iç mimari tercihlere değil, dış pazar taramasıyla ortaya çıkan ortak doğrulara da dayanır.

Pazarda öne çıkan iyi tarafların birleşimi:
- `ChatGPT Voice` ve `Gemini Live`: doğal konuşma akışı ve bağlam hissi
- `Windows Voice Access`, `Apple Voice Control`, `Talon`: güvenli sistem seviyesi kontrol disiplini
- `Whisper`, `Deepgram`, `Speechmatics`, `AssemblyAI`: yüksek kalite STT yaklaşımı
- `Vosk`, `Picovoice`, `Rhasspy`, `Home Assistant Assist`: local-first güven ve mahremiyet yaklaşımı
- `ElevenLabs`, `Cartesia`, `Azure Neural TTS`: doğal ve güçlü TTS yaklaşımı
- `Voiceflow`, `Cognigy`, `Genesys`, `NiCE`: gözlemlenebilirlik, akış kontrolü ve kurumsal denetim
- `Twilio`, `LiveKit`, `Telnyx`, `Retell AI`, `Vapi`: gerçek zamanlı iletişim ve handoff kalitesi

Bu yüzden nihai karar değişmez biçimde şudur:

> Sistem bir "sesli yazıcı" değil, bir "güvenli bilişsel operasyon katmanı" olarak kurulmalıdır.

---

## 18. Pazardaki büyük şikayetlerden çıkarılan yasaklı hata listesi
Şu hatalar bizim sistemde baştan engellenmelidir:

1. Yanlış pencereye yazma
2. Onaysız kritik gönderim
3. Düşük güven puanında otomatik aksiyon
4. Tek sağlayıcıya aşırı bağımlılık
5. Kullanıcının araya girmesine rağmen sistemin konuşmaya devam etmesi
6. Sistem kendi sesi veya kendi pano çıktısını yeni olay sanması
7. Çok dilli akışta kaynak dil, hedef dil ve seslendirme dilinin karışması
8. Logsuz ve izlenemez işlem yürütülmesi
9. Hata sonrası kök neden bulunamaması
10. Yerel fallback olmadan tamamen buluta bağımlı çalışma

---

## 19. 5 farklı açıdan zorunlu analiz modeli
Her büyük geliştirme ve her faz aşağıdaki 5 açıdan kontrol edilmelidir:

### 19.1 Fonksiyonel doğruluk
- doğru dili seçiyor mu
- doğru metni çözüyor mu
- doğru profile giriyor mu
- doğru alana doğru biçimde yazıyor mu

### 19.2 Güvenlik ve mahremiyet
- hassas veri gereksiz yere dışarı çıkıyor mu
- kritik işlem onaysız ilerliyor mu
- emergency stop ve abort komutları her zaman çalışıyor mu

### 19.3 Dayanıklılık ve hata toleransı
- STT motoru düşerse fallback var mı
- aktif pencere değişirse aksiyon duruyor mu
- sesli geri bildirim ve dinleme çakıştığında sistem güvenli davranıyor mu

### 19.4 İnsan faydası ve kullanılabilirlik
- kullanıcıyı hızlandırıyor mu
- bilişsel yükü azaltıyor mu
- aşırı onay sorup akışı bozmuyor mu
- hata anında kullanıcıyı korkutmadan toparlıyor mu

### 19.5 Gelecek uyumu ve ölçeklenebilirlik
- yeni dil eklemek kolay mı
- yeni STT/TTS sağlayıcısı eklemek kolay mı
- masaüstü, web, mobil ve tablet ayrışması mimariyi bozmuyor mu

---

## 20. Faz kapıları: test geçmeden ilerleme yok
Her iş paketi şu sırayla doğrulanır:

1. Tasarım kararı yazılır
2. Riskleri listelenir
3. Uygulama yapılır
4. Birim test yapılır
5. Entegrasyon testi yapılır
6. Güvenlik testi yapılır
7. Log/trace doğrulanır
8. Manuel kullanıcı doğrulaması yapılır
9. Başarısızlık varsa düzeltme döngüsü çalıştırılır
10. Tüm kapılar geçtiyse sonraki faza geçilir

Geçiş kuralı:
- `Test = Geçti`
- `Log = Oluştu`
- `Fallback = Doğrulandı`
- `Manual Review = Onaylandı`
- `Risk = Kabul edilebilir`

Bunlardan biri eksikse ilerleme yasaktır.

---

## 21. İşlem etki alanları
Her büyük iş kalemi aşağıdaki etki alanlarıyla birlikte değerlendirilmelidir:

### Kullanıcı etkisi
- yanlış aksiyon stresi
- güven hissi
- hız ve rahatlık

### Teknik etki
- modülerlik
- bakım maliyeti
- hata ayıklanabilirlik

### Güvenlik etkisi
- veri sızıntısı riski
- yetkisiz aksiyon riski
- sağlayıcı bağımlılığı riski

### Operasyonel etki
- izlenebilirlik
- bakım yükü
- destek ekibi için okunabilirlik

### Maliyet etkisi
- oturum başı maliyet
- model geçiş maliyeti
- bulut bağımlılığı maliyeti

---

## 22. İşlem test kriterleri

### Ses alma
- mikrofon doğruluğu
- gürültü altında kararlılık
- sessizlik algılama doğruluğu

### Wake-word ve VAD
- yanlış tetikleme oranı
- kaçırılan tetikleme oranı

### STT
- isim, rakam, tarih, saat, özel terim doğruluğu
- Türkçe/Arapça/İngilizce geçiş başarısı

### Profil motoru
- doğru pencere tespiti
- doğru uygulama davranışı
- yanlış uygulamaya aksiyon engelleme

### Gönderim
- tek satır / çok satır bütünlüğü
- onay mantığı
- profil bazlı gönder tuşu doğruluğu

### Cevap toplama
- yeni cevap tespiti
- kendi metnini cevap sanmama
- tekrarları filtreleme

### TTS
- doğru dil
- doğru ses profili
- araya girildiğinde anında durma

### Log ve trace
- her olayın benzersiz kimliği
- hata sınıfı
- fallback nedeni
- tekrar üretilebilirlik

---

## 23. 2030+ hedefi için bugünden zorunlu mimari kuralları
Bugünün sistemi kurulurken 5-10 yıl sonrası düşünülerek şu kurallar zorunlu kabul edilmelidir:

1. `local-first safety core`
2. `cloud-fallback quality layer`
3. `provider-swappable adapters`
4. `deterministic action engine`
5. `confidence-based policy engine`
6. `multilingual state machine`
7. `human handoff continuity`
8. `structured audit and replay`
9. `privacy by default`
10. `continuous evaluation pipeline`

Bu yapı kurulmadan sistem tamamlanmış sayılmamalıdır.

---

## 24. Nihai proje yürütme kuralı
Bu projede doğru çalışma ilkesi şudur:

> Her işlem uygulanır, test edilir, doğrulanır, loglanır; yalnızca doğruysa bir sonraki işleme geçilir.

Bu ilke bozulursa:
- ürün kalitesi düşer,
- hatalar gizlenir,
- ekip güven kaybeder,
- sistem dış denetime dayanamaz.

Bu ilke korunursa:
- ürün savunulabilir olur,
- dış ekip denetiminden geçer,
- insan yararı merkezde kalır,
- uzun vadeli platforma dönüşür.
