# Sesli Ajan / Çok Dilli Asistan Pazar Araştırması (2025)

## 1. Bu araştırmada kullanılan mevcut altyapı

Workspace içindeki yapılandırmalarda aktif veya kullanılabilir görünen katmanlar:

- `GEMINI_API_KEY`: birden fazla projede mevcut.
- `OLLAMA_BASE_URL` / `OLLAMA_URL`: local-first model erişimi için mevcut yapı.
- `OPENAI_API_KEY`: örnek yapılandırmada destekleniyor, ancak aktif değer her yerde görünmüyor.
- `SUPABASE_*`: veri/senkronizasyon/olay altyapısı için mevcut.
- `TELEGRAM_BOT_TOKEN`: mesajlaşma entegrasyonu için mevcut.
- `BROWSERLESS_*`: sadece örnek dosyada görüldü; aktif üretim anahtarı net değil.

Sonuç:

- Aktif araştırma/sentez tarafında en kullanılabilir katman: `Gemini`.
- Yerel yürütme/fallback tarafında en kullanılabilir katman: `Ollama`.
- Doğrudan web arama / SERP / scraping odaklı özel bir API anahtarı net biçimde görünmedi.
- Bu nedenle en doğru yaklaşım: **webden doğrulanabilen resmi ürün sayfaları + mevcut model katmanlarıyla sentez**.

## 2. Ana ürün / sistem kategorileri

### A. Tüketici tipi genel sesli asistanlar
- ChatGPT Voice
- Gemini Live
- Siri
- Alexa
- Copilot tabanlı sesli deneyimler

### B. İşletim sistemi / erişilebilirlik odaklı ses kontrolü
- Windows Voice Access
- Apple Siri + Shortcuts
- Android / Gemini tabanlı cihaz entegrasyonları

### C. Geliştirici odaklı STT / TTS / multimodal temel katmanlar
- Whisper
- Vosk
- Edge TTS / bulut TTS servisleri
- Gemini / OpenAI / yerel LLM + ses zincirleri

### D. Sesli ajan platformları / omnichannel orchestration
- Voiceflow
- Retell AI
- Pipecat
- benzer çağrı merkezi / telefon ajan altyapıları

### E. Yerel ve mahremiyet öncelikli açık kaynak çözümler
- Vosk tabanlı masaüstü çözümler
- Whisper tabanlı offline veya yarı-offline çözümler
- Ollama / LM Studio / GPT4All ile local LLM orkestrasyonu

## 2.1. Sıralı sistem tablosu

Not:

- Aşağıdaki tablo bu alanın **çekirdek 16 sistem / ürün ailesini** sıralı verir.
- Bu tablo **tam evrendeki bütün girişimleri** kapsamaz.
- Ama bu proje açısından en kritik ve referans alınması gereken ana sistemleri kapsar.

| # | Sistem / ürün | Kategori | İyi tarafı | Kötü tarafı | Bu proje için hüküm |
|---|---|---|---|---|---|
| 1 | ChatGPT Voice | Genel sesli asistan | Doğal diyalog, güçlü muhakeme, multimodal deneyim | Kapalı kutu, masaüstü otomasyonunda sınırlı, veri dışarı çıkışı | Referans alınmalı |
| 2 | Gemini Live | Genel sesli asistan | Ses + ekran/kamera + bağlı uygulama mantığı güçlü | Tam masaüstü uygulama otomasyonu sınırlı | Referans alınmalı |
| 3 | Microsoft Copilot Voice deneyimleri | Genel / üretken asistan | Office ve iş üretkenliği bağlamı güçlü | Her uygulamada derin otomasyon yok | Kısmi referans |
| 4 | Siri | Cihaz asistanı | Wake-word olgun, cihaz içi kullanım kolay | Açık uçlu ajanlık sınırlı | Sadece wake-word mantığı alınmalı |
| 5 | Alexa | Cihaz asistanı | Ev/cihaz komutları güçlü | Üretken operasyon ajanı gibi çalışmaz | Kısmi referans |
| 6 | Windows Voice Access | OS kontrol | Erişilebilirlik ve temel desktop kontrolü güçlü | Sohbetçi ajan değildir, semantik otomasyon zayıf | UI kontrol referansı |
| 7 | Apple Shortcuts + Siri | Otomasyon | Hazır akış mantığı, görev zinciri | Apple ekosistemine bağımlı | Akış mantığı referansı |
| 8 | Whisper | STT | Çok dilli kalite, dil algılama, çeviri | Ağır, gecikme ve donanım maliyeti yüksek olabilir | İkinci kalite katmanı olmalı |
| 9 | Vosk | STT | Offline, hafif, streaming, yerel kullanım güçlü | Gürültü/aksan altında kalite değişebilir | Birinci yerel komut katmanı olmalı |
| 10 | Edge TTS / bulut TTS ailesi | TTS | Doğal sesler, çok dil, hızlı entegrasyon | Sağlayıcı bağımlılığı ve ağ ihtiyacı olabilir | Kullanılmalı |
| 11 | Voiceflow | Sesli ajan platformu | Omnichannel, guardrail, gözlemlenebilirlik | SaaS bağımlılığı, desktop-geneli ajan için sınırlı | Mimari referans |
| 12 | Retell AI | Telefon/ses ajan | Telefon ve gerçek zamanlı ses akışı kuvvetli | Masaüstü kişisel ajan tarafında sınırlı | Sesli ajan prensip referansı |
| 13 | Pipecat | Açık kaynak ses ajan çerçevesi | Açık kaynak, multimodal, geliştirici esnekliği | Ürün değil çerçeve; kurulum karmaşıklığı var | Güçlü teknik referans |
| 14 | Ollama | Local LLM runtime | Local-first, düşük dış bağımlılık, mahremiyet | Model kalite farkları ve yerel kaynak ihtiyacı | Çekirdek katman olmalı |
| 15 | LM Studio | Local model servis | Yerel model deneme ve OpenAI-benzeri uçlar kolay | Üretim olgunluğu senaryoya bağlı | Yardımcı fallback |
| 16 | GPT4All | Yerel model runtime | Offline / yerel çalışma yaklaşımı | Sınırlı model ve iş akışı olgunluğu | İkincil alternatif |

## 2.2. Sayısal özet

- Çekirdek sıralı tabloya alınan ana sistem / ürün ailesi sayısı: **16**
- Ana kategori sayısı: **5**
- En kritik doğrudan rakip / referans kümesi: **8**
	- ChatGPT Voice
	- Gemini Live
	- Copilot Voice deneyimleri
	- Siri
	- Alexa
	- Windows Voice Access
	- Whisper
	- Vosk

## 3. Kategori bazlı değerlendirme

### A. ChatGPT Voice / Gemini Live tipi genel asistanlar

#### Güçlü yanlar
- Doğal konuşma akışı.
- Düşük sürtünmeli kullanıcı deneyimi.
- Çok modlu bağlam: ses + görüntü + ekran/kamera.
- Geniş genel bilgi ve güçlü muhakeme.

#### Sık şikayet alanları
- Tam masaüstü otomasyonunda sınırlılık.
- Her uygulamada güvenilir "doğrudan gönder" davranışı yok.
- Kurumsal süreçlerde deterministik kontrol zayıf kalabiliyor.
- Gizlilik ve veri dışarı çıkışı endişeleri.
- Yanlış anlama durumunda bazen fazla özgüvenli yanıt.

#### Bu proje için çıkarım
- **Alınmalı:** doğal diyalog, kesintisiz konuşma, çok modlu yardımcı akıl.
- **Alınmamalı:** kapalı kutu tam bağımlılık, uygulama gönderimini kör güvenle yapmak.

### B. Siri / Alexa / klasik cihaz asistanları

#### Güçlü yanlar
- Wake-word olgunluğu.
- Ev/cihaz komutlarında yüksek pratiklik.
- Düşük öğrenme eşiği.

#### Sık şikayet alanları
- Derin üretken görevlerde sınırlılık.
- Açık uçlu iş akışlarında zayıflık.
- Kurum içi özel iş akışlarına uyarlama sınırlı.
- Çok adımlı bağlamsal görevlerde tutarlılık sorunları.

#### Bu proje için çıkarım
- **Alınmalı:** uyandırma mantığı, basit hızlı komut yapısı.
- **Alınmamalı:** tek katmanlı komut mantığına sıkışmak.

### C. Windows Voice Access benzeri OS kontrol katmanı

#### Güçlü yanlar
- Eller serbest işletim sistemi kontrolü.
- Erişilebilirlik açısından güçlü yaklaşım.
- Pencere, odak, tıklama, yazma gibi temel kontrol senaryoları.

#### Sık şikayet alanları
- Serbest sohbet asistanı değildir.
- Karmaşık çok uygulamalı akışlarda yorucu olabilir.
- Her özel web arayüzünde semantik olarak yeterli değildir.

#### Bu proje için çıkarım
- **Alınmalı:** UI otomasyonuna saygılı, erişilebilirlik-temelli kontrol felsefesi.
- **Alınmamalı:** bunu tek başına "zeka katmanı" sanmak.

### D. Whisper

#### Güçlü yanlar
- Çok dilli STT, dil algılama ve konuşma çevirisi yetenekleri.
- Geliştirici ekosistemi çok güçlü.
- Özellikle kaliteli ses kaydında yüksek kalite potansiyeli.

#### Sık şikayet alanları
- Donanım tüketimi.
- Gerçek zamanlı masaüstü kullanımda optimizasyon ihtiyacı.
- Düşük güçlü cihazlarda gecikme.
- Büyük modellerde operasyonel maliyet.

#### Bu proje için çıkarım
- **Alınmalı:** ikinci katman STT veya kalite modunda.
- **Alınmamalı:** tek başına sürekli düşük gecikmeli kontrol katmanı olarak kör kullanmak.

### E. Vosk

#### Güçlü yanlar
- Offline çalışma.
- Hafif modeller.
- Streaming API.
- Türkçe ve Arapça dahil çoklu dil desteği.

#### Sık şikayet alanları
- Zor aksanlarda ve gürültüde kalite dalgalanması.
- Büyük ticari oyunculara göre doğal konuşma doğruluğu sınırlı olabilir.
- Model seçimi ve kelime uyarlaması gerektirebilir.

#### Bu proje için çıkarım
- **Alınmalı:** her zaman hazır yerel komut katmanı olarak.
- **Alınmamalı:** yüksek riskli gönderimlerde tek doğrulama katmanı yapmak.

### F. Voiceflow / Retell / Pipecat tipi sesli ajan platformları

#### Güçlü yanlar
- Omnichannel tasarım.
- Orkestrasyon, gözlemlenebilirlik, guardrail, entegrasyon yaklaşımı.
- Sesli ajan UX'i için hazır yapı taşları.
- Telefon / web / çağrı merkezi senaryolarında hız.

#### Sık şikayet alanları
- Vendor lock-in riski.
- Maliyet ölçeği.
- Çok özel masaüstü otomasyonu için yetersizlik.
- Kendi kurallarını ve profillerini derin özelleştirmede sınırlamalar.

#### Bu proje için çıkarım
- **Alınmalı:** gözlemlenebilirlik, ortam ayırma, guardrail, akış yönetimi prensipleri.
- **Alınmamalı:** masaüstü-geneli kişisel ajanı tamamen SaaS mantığına kilitlemek.

## 4. Piyasadaki ortak şikayet kümeleri

En sık tekrar eden problem kümeleri:

1. **Yanlış anlama ve erken gönderim**
	- Kullanıcı bir şey dikte eder, sistem yanlış anlar, mesaj erken gider.

2. **Doğal konuşma var ama iş akışı güvenilir değil**
	- Demo güçlüdür, gerçek uygulama entegrasyonu kırılgandır.

3. **Mahremiyet / veri dışarı çıkışı**
	- Özellikle iş, özel yazışma ve yerel masaüstü kontrolünde kritik.

4. **Gecikme**
	- STT, LLM, TTS ve otomasyon zinciri birleşince hissedilir yavaşlık oluşur.

5. **Uygulama bazlı davranış eksikliği**
	- WhatsApp, Telegram, web panel, editör ve form davranışları aynı değildir.

6. **Çok dilli akışta karışıklık**
	- Giriş dili, hedef dili, UI dili, okuma dili ve gönderim dili birbirine karışır.

7. **Kapatılamayan otomasyon korkusu**
	- Kullanıcı sistemin yanlış pencereye yazmasından çekinir.

## 5. Bu proje için ne alınmalı

### Kesin alınmalı
- `local-first + cloud-fallback`
- `confirm-before-send`
- `profile-per-app`
- `selected-text read / translate / confirm`
- `input-language auto-detect + manual override`
- `clipboard/keyboard fallback + gelecekte UI Automation`
- `audit/log/decision trace`

### Güçlü biçimde önerilir
- `confidence score` tabanlı zorunlu onay
- `silent mode / read mode / send mode` ayrımı
- `wrong-window protection`
- `human-in-the-loop` varsayılanı
- `policy-based send rules`

### Kaçınılmalı
- Tek sağlayıcıya tam bağımlılık
- Her uygulamada tek `Enter` mantığı
- Onaysız otomatik gönderim varsayılanı
- Sadece bulut STT/TTS ile çalışma
- Sadece kopyala-yapıştırı “entegrasyon” sanmak

## 6. Mimari karar değerlendirmesi

### `local-first + cloud-fallback`
Karar: **doğru**

Gerekçe:
- Mahremiyet, süreklilik ve gecikme için yerel katman şart.
- Zor durumlarda kalite artırımı için bulut fallback gerekir.

### `app-profile + confirm-before-send`
Karar: **kritik zorunluluk**

Gerekçe:
- Piyasadaki en büyük kırılma noktası yanlış pencere / yanlış gönderim.
- Güven duygusu ancak profil + onayla oluşur.

### `çok dilli giriş + çeviri + okuma`
Karar: **rekabet avantajı**

Gerekçe:
- Türkçe + Arapça + dünya dilleri kombinasyonu birçok genel ürünün kullanım kalitesini aşabilir.

### `masaüstü-geneli + chat platformları`
Karar: **yüksek değer, yüksek zorluk**

Gerekçe:
- Piyasa ürünleri ya genel sohbetçidir ya çağrı merkezi ajanıdır.
- Masaüstü-geneli kişisel/operasyonel ajan boşluğu hâlâ tam çözülmüş değil.

## 7. En doğru hedef ürün tanımı

Bu proje için en doğru konumlandırma:

> **"Çok dilli, profil-temelli, insan onaylı, masaüstü-geneli operasyon asistanı"**

Bu; Siri, Alexa veya yalnızca ChatGPT Voice kopyası olmamalı.
Asıl fark şu olmalı:

- uygulamaya göre davranma,
- yanlış gönderimi önleme,
- yerel çalışma,
- kurumsal/operasyonel iş akışlarına uyum,
- seçili metin ve aktif pencere farkındalığı,
- güvenlik ve denetlenebilirlik.

## 8. Son karar özeti

### En güçlü referans alınacaklar
- ChatGPT Voice / Gemini Live → doğal konuşma deneyimi
- Whisper / Vosk → STT omurgası
- Voiceflow / Pipecat / Retell → orkestrasyon ve gözlemlenebilirlik prensipleri
- Windows erişilebilirlik yaklaşımı → güvenli masaüstü kontrol mantığı

### En kritik farklaştırıcı alanlar
- yanlış anlamayı gönderim öncesinde yakalama
- uygulama profili bazlı davranış
- çok dilli gerçek operasyon akışı
- local-first güven mimarisi

### Nihai hüküm
- Mevcut proje yönü **doğru eksende**.
- En büyük fırsat: **genel sohbet asistanı değil, güvenilir operasyon ajanı** olmak.
- En büyük risk: otomasyonu fazla erkenden, yeterli UIA/API guardrail olmadan büyütmek.

## 9. 50+ sistemlik tam geniş tablo

Önemli not:

- Aşağıdaki tablo **2026 itibarıyla bu alandaki doğrulanabilir ana sistemleri** geniş biçimde toplar.
- Bu tablo, pazardaki en önemli açık ürünleri / platformları / frameworkleri / API katmanlarını kapsar.
- Yine de “dünyadaki bütün kapalı kurumsal iç sistemleri” %100 eksiksiz saymak pratikte mümkün değildir.
- Bu nedenle en doğru ifade şudur: **küresel olarak ana ve etkili sistemlerin geniş, güçlü ve kullanılabilir envanteri**.

| # | Sistem | Kategori | En iyi yaptığı nokta | Büyük şikayet / zayıf alan | Güven |
|---|---|---|---|---|---|
| 1 | Siri | Tüketici asistanı | Derin cihaz entegrasyonu | Zeka ve güvenilirlik dalgalanması | Yüksek |
| 2 | Gemini Live | Tüketici asistanı | Ses + ekran + kamera bağlamı | Bölge/özellik eşitsizliği | Yüksek |
| 3 | Google Assistant | Tüketici asistanı | Geniş kullanıcı tabanı ve ev cihazları | Gemini geçişi nedeniyle kimlik karışıklığı | Orta |
| 4 | Amazon Alexa | Tüketici asistanı | Akıllı ev ekosistemi | Üretken akıl tarafı sınırlı algılanabiliyor | Yüksek |
| 5 | ChatGPT Voice | Tüketici asistanı | Doğal konuşma ve muhakeme | Bulut bağımlılığı / kapalı kutu | Yüksek |
| 6 | Microsoft Copilot | Tüketici / üretken asistan | Windows ve iş üretkenliği bağlamı | Ses tarafında konumlama dalgalı | Orta |
| 7 | Samsung Bixby | Tüketici asistanı | Samsung cihaz kontrolü | Küresel geliştirici ilgisi daha zayıf | Yüksek |
| 8 | XiaoAI | Tüketici asistanı | Xiaomi ekosistem entegrasyonu | Bölgesel sınırlılık | Orta |
| 9 | Yandex Alice | Tüketici asistanı | Bölgesel dil uyumu | Global kapsama sınırlı | Yüksek |
| 10 | Huawei Celia | Tüketici asistanı | Huawei cihaz bütünleşmesi | Ekosistem sınırı | Orta |
| 11 | Windows Voice Access | OS / erişilebilirlik | Eller serbest desktop kontrol | Komut keşfi ve semantik sınırlılık | Yüksek |
| 12 | Apple Voice Control | OS / erişilebilirlik | Apple cihazlarda sistem seviyesi kontrol | Komut ezber yükü | Yüksek |
| 13 | Android Voice Access | OS / erişilebilirlik | Android tam sesli kontrol | Uygulama bazlı tutarlılık her yerde aynı değil | Yüksek |
| 14 | Apple Dictation | OS / erişilebilirlik | Düşük sürtünmeli yerleşik dikte | Uzun biçim düzenleme sınırlı | Yüksek |
| 15 | Dragon Professional | Profesyonel dikte | Güçlü metin diktesi ve komutlar | Pahalı ve ağır kurulum | Yüksek |
| 16 | Talon Voice | Güç kullanıcı ses kontrolü | Kodlama ve ileri kişiselleştirme | Öğrenme eğrisi çok yüksek | Yüksek |
| 17 | Google Cloud Speech-to-Text | STT | Ölçek ve dil kapsamı | Karmaşık yapılandırma | Yüksek |
| 18 | Azure Speech to Text | STT | Kurumsal özelleştirme | Konfigürasyon karmaşıklığı | Yüksek |
| 19 | Amazon Transcribe | STT | AWS ile doğal entegrasyon | Zor aksan/noise senaryolarında eleştiri | Yüksek |
| 20 | Deepgram | STT / Voice AI | Çok düşük gecikme ve voice-agent odak | Sağlayıcıya fazla bağlanma riski | Yüksek |
| 21 | AssemblyAI | STT / speech understanding | Geliştirici deneyimi ve ek analiz özellikleri | Ölçekte maliyet | Yüksek |
| 22 | Speechmatics | STT | Çok dilli ve on-device / on-prem esneklik | Ekosistem görünürlüğü hyperscaler kadar değil | Yüksek |
| 23 | Gladia | STT | Çok dil ve code-switching odağı | Kurumsal penetrasyon daha sınırlı | Yüksek |
| 24 | IBM Watson Speech to Text | STT | Kurumsal deployment seçenekleri | Yeni nesil pazarda daha düşük heyecan | Yüksek |
| 25 | Rev AI | STT | Transkripsiyon kökenli pratik API | Frontier algısı daha düşük | Yüksek |
| 26 | Soniox | STT | Gerçek zamanlı performans ünü | Daha küçük ekosistem | Orta |
| 27 | Whisper | STT / OSS | Kalite, dil algılama, çeviri | Ağır ve yerelde gecikmeli olabilir | Yüksek |
| 28 | whisper.cpp | Local STT | Yerelde Whisper çalıştırma pratikliği | Donanıma göre kalite/hız dengesi zor | Yüksek |
| 29 | Vosk | Local STT | Offline, hafif, streaming | Gürültü/aksan altında kalite dalgalanır | Yüksek |
| 30 | Picovoice Rhino | Local intent/STT katmanı | Edge cihazlarda intent odaklı kullanım | Genel konuşma için dar kapsam | Yüksek |
| 31 | Picovoice Cheetah | Local STT | On-device transkripsiyon | Bulut frontier kaliteye göre sınırlı | Yüksek |
| 32 | ElevenLabs | TTS / voice synthesis | Çok doğal ve etkileyici sesler | Klonlama güvenliği tartışmaları | Yüksek |
| 33 | Cartesia Sonic | TTS | Ultra düşük gecikmeli agent TTS | Daha yeni platform | Yüksek |
| 34 | Hume Octave | TTS | Duygusal/prosodik ifade | Yeni ve deneysel algısı | Yüksek |
| 35 | Amazon Polly | TTS | Güvenilir bulut TTS | Yeni nesil rakiplere göre daha az canlı ses | Yüksek |
| 36 | Azure Neural TTS | TTS | Kurumsal custom voice | Erişim/governance karmaşıklığı | Yüksek |
| 37 | Google Cloud Text-to-Speech | TTS | Dil kapsamı ve ölçek | Konuşma doğallığı bazı rakiplerden geride algılanabilir | Yüksek |
| 38 | PlayHT | TTS | Geniş ses kütüphanesi | Ses tutarlılığı modele göre değişebilir | Yüksek |
| 39 | IBM Text to Speech | TTS | Kurumsal kullanım | Pazar algısı daha zayıf | Yüksek |
| 40 | WellSaid Labs | TTS | Stüdyo kalitesine yakın anlatım | Gerçek zamanlı ajan odağı sınırlı | Yüksek |
| 41 | Resemble AI | TTS / cloning | Güçlü özel ses / klonlama | Güvenlik ve izin endişesi | Yüksek |
| 42 | Edge TTS | TTS | Hızlı, çok dilli, entegrasyonu kolay | Sağlayıcı bağımlılığı / sınırlı kontrol | Yüksek |
| 43 | Piper | Local TTS | Hafif offline konuşma sentezi | En iyi cloud TTS kadar doğal değil | Yüksek |
| 44 | Coqui TTS | Açık kaynak TTS | Açık kaynak esneklik | Üretim kalitesi/tutarlılık kuruluma bağlı | Orta |
| 45 | Vapi | Voice agent platform | Builder velocity ve geniş entegrasyon | Hızlı büyüyen yüzey karmaşa yaratabilir | Yüksek |
| 46 | Retell AI | Voice agent platform | Telefon odaklı insanımsı ajanlar | Masaüstü-geneli ajan için dar | Yüksek |
| 47 | LiveKit Agents | Voice agent platform | Realtime altyapı + geliştirici kontrolü | Mühendislik yükü yüksek | Yüksek |
| 48 | Voiceflow | Voice agent platform | Görsel akış tasarımı ve orkestrasyon | Çok karmaşık mantıkta zorlanabilir | Yüksek |
| 49 | Bland AI | Voice agent platform | Yüksek hacimli telefon otomasyonu | Spam / uyum / marka riski | Orta |
| 50 | Synthflow | Voice agent platform | No-code hızlı kurulum | Düşük seviye kontrol az | Orta |
| 51 | Inworld AI | Realtime character / voice | Karakter ve gerçek zamanlı etkileşim | Kurumsal operasyon fit'i her yerde güçlü değil | Yüksek |
| 52 | Deepgram Voice Agent API | Voice agent platform | Tek API ile STT+TTS+orchestration yaklaşımı | İş akışı katmanı için yine ek mimari gerekir | Yüksek |
| 53 | ElevenLabs Agents | Voice agent platform | Güçlü ses + agent birleşimi | Operasyonel olgunluk yeni | Yüksek |
| 54 | Hume EVI | Voice agent platform | Duygusal ve kesintiye dayanıklı konuşma | Aşırı ifade riski / dikkatli ayar gerekir | Yüksek |
| 55 | Rasa Open Source | Açık kaynak framework | Tam sahiplik ve özelleştirme | Bakım maliyeti ve kurulum yükü | Yüksek |
| 56 | Pipecat | Açık kaynak framework | Modern realtime voice agent çerçevesi | Ekosistem daha genç | Yüksek |
| 57 | Jambonz | Açık kaynak telephony framework | Telephony-native açıklık | Telephony dışı ekipler için dar gelebilir | Yüksek |
| 58 | OpenVoiceOS | Açık kaynak asistan | Mahremiyet ve açık asistan yönü | Topluluk ölçeği sınırlı | Yüksek |
| 59 | Mycroft Core | Açık kaynak asistan | Tarihsel temel ve açık yaklaşım | Ticari/topluluk sürekliliği dalgalı | Orta |
| 60 | Rhasspy | Offline asistan framework | Offline-first ve home automation | Daha dar kullanım alanı | Yüksek |
| 61 | Home Assistant Assist | Local voice assistant | Akıllı evde local-first ses | Genel kurumsal ajan değil | Yüksek |
| 62 | Kaldi | Açık kaynak speech toolkit | Derin özelleştirme ve tarihsel güç | Çok karmaşık ve eski okul | Yüksek |
| 63 | ESPnet | Açık kaynak speech toolkit | Araştırma genişliği | Üretimleştirme zor | Yüksek |
| 64 | SpeechBrain | Açık kaynak speech toolkit | Modern speech araştırma erişilebilirliği | Turnkey ürün değil | Yüksek |
| 65 | Picovoice Platform | On-device voice stack | Wake word + VAD + intent + edge yaklaşımı | Lisans ve kapsam dengesi | Yüksek |
| 66 | openWakeWord | Local wake-word | Yerel wake-word katmanı | Çok dar kapsam | Yüksek |
| 67 | IBM Speech Libraries for Embed | Embedded speech | Ticari embed speech yaklaşımı | Daha kapalı ve erişimi sınırlı | Yüksek |
| 68 | Genesys Cloud AI | Contact center voice AI | Büyük ölçekli CX entegrasyonu | Ağır kurulum ve maliyet | Yüksek |
| 69 | NiCE CXone / Autopilot | Contact center voice AI | Kurumsal AI-first CX derinliği | Kompleks ve pahalı olabilir | Yüksek |
| 70 | Five9 Genius AI | Contact center voice AI | CCaaS ile güçlü birleşim | Tam değer için platform bağımlılığı | Yüksek |
| 71 | Talkdesk AI Agents | Contact center voice AI | Temas merkezi içinde gömülü otomasyon | Sonuçlar kurulum kalitesine çok bağlı | Yüksek |
| 72 | Cognigy | Contact center / orchestration | Enterprise orchestration ve voice | Disiplinli mühendislik ister | Yüksek |
| 73 | Kore.ai XO | Contact center / enterprise AI | Geniş enterprise otomasyon | Deployment döngüsü uzun | Yüksek |
| 74 | Cresta | Contact center AI | Agent assist ve koçlukta güç | Tam otonomi için ek stack gerekir | Yüksek |
| 75 | SoundHound Amelia | Contact center AI | Uzun kurumsal ajan geçmişi | Ürün çizgisi algısı karışabiliyor | Orta |
| 76 | OpenAI Realtime API | Developer voice API | Doğal speech-to-speech ve araç kullanımı | Model/platform bağımlılığı | Yüksek |
| 77 | Twilio Voice / ConversationRelay | Developer telecom API | Küresel telephony altyapısı | Entegrasyon ve maliyet karmaşıklaşabilir | Yüksek |
| 78 | Telnyx Voice AI | Developer telecom API | Telecom-native kontrol | Twilio kadar yaygın değil | Yüksek |
| 79 | Vonage Voice API | Developer telecom API | Programlanabilir ses altyapısı | Voice-AI heyecanı daha düşük görünür | Yüksek |
| 80 | Agora Conversational AI SDK | Realtime media / AI | Realtime media kalitesi | Daha fazla plumbing gerekir | Yüksek |
| 81 | Daily | Realtime media API | AI voice/video için esnek RTC temel | Tek başına ajan çözümü değil | Yüksek |
| 82 | Plivo Voice API | Developer telecom API | Pratik CPaaS alternatifi | Küçük ekosistem | Yüksek |
| 83 | SignalWire | Developer telecom API | Telecom esnekliği | Daha düşük pazar görünürlüğü | Orta |

### 9.1. Sayısal özet

- Geniş tabloda listelenen sistem sayısı: **83**
- En güçlü güven seviyesi `Yüksek` olan sistem sayısı: çoğunluk
- `Orta` güven olarak işaretlenenler: adlandırma / 2026 ürün konumlaması daha akışkan olanlar

## 10. Bu sistemlerin en iyi yaptıkları noktaların birleşik özeti

Bu alanın en iyi taraflarını tek bir üstün sisteme toplamak için şu birleşim alınmalıdır:

### A. Doğal konuşma kalitesi
- Referans: `ChatGPT Voice`, `Gemini Live`, `OpenAI Realtime API`
- Alınacak ders:
  - konuşma akışı kesintisiz olmalı
  - kullanıcı araya girdiğinde sistem anında susmalı
  - sistem cevap verirken aşırı robotik olmamalı

### B. Çok modlu ve bağlamsal anlayış
- Referans: `Gemini Live`, `ChatGPT Voice`
- Alınacak ders:
  - sadece ses değil, aktif pencere, seçili metin, clipboard, ekran bağlamı da kullanılmalı

### C. Sistem seviyesi kontrol
- Referans: `Windows Voice Access`, `Apple Voice Control`, `Talon Voice`
- Alınacak ders:
  - masaüstü kontrolü doğrudan LLM'e bırakılmamalı
  - deterministik komut katmanı olmalı

### D. Yerel çalışma ve mahremiyet
- Referans: `Vosk`, `Picovoice`, `Rhasspy`, `Home Assistant Assist`, `Ollama`
- Alınacak ders:
  - wake-word, VAD, temel komutlar, hassas operasyonlar yerelde çalışmalı

### E. Kaliteli STT
- Referans: `Whisper`, `Deepgram`, `Speechmatics`, `AssemblyAI`
- Alınacak ders:
  - tek STT motoruna bağımlı olunmamalı
  - düşük gecikme ve yüksek kalite için çok katmanlı STT seçimi olmalı

### F. Kaliteli TTS
- Referans: `ElevenLabs`, `Cartesia`, `Azure Neural TTS`, `Hume`
- Alınacak ders:
  - TTS sadece “okuma” yapmamalı; ton, duygu, hız, kesme ve akış desteği vermeli

### G. Kurumsal gözlemlenebilirlik
- Referans: `Voiceflow`, `Cognigy`, `Genesys`, `NiCE`, `Deepgram`
- Alınacak ders:
  - log, trace, replay, evaluation ve failure taxonomy zorunlu olmalı

### H. Telephony ve agent operasyonu
- Referans: `Retell AI`, `Twilio`, `Vapi`, `LiveKit`, `Telnyx`
- Alınacak ders:
  - gerçek zaman, barge-in, turn-taking ve handoff birinci sınıf yetenek olmalı

## 11. Bütün büyük şikayet kümeleri ve kök nedenleri

### 11.1. Kullanıcıların en çok şikayet ettiği alanlar

1. **Gecikme**
	- sistem geç cevap veriyor
	- kullanıcı sözünü bitirmeden veya çok geç tepki veriyor

2. **Yanlış anlama**
	- isimler, rakamlar, özel terimler, aksanlar, gürültülü ortamlar bozuluyor

3. **Erken / yanlış gönderim**
	- yanlış pencereye yazma
	- onaysız mesaj gönderme

4. **Aşırı özgüvenli hata**
	- sistem yanlış ama emin konuşuyor

5. **Bağlam kaybı**
	- birkaç tur sonra ne konuşulduğunu unutuyor
	- uygulama değişince durum bozuluyor

6. **Kesilememe / susmama**
	- kullanıcı araya girince susmuyor
	- barge-in kötü çalışıyor

7. **Duygusal olarak yanlış TTS**
	- çok robotik, çok satışçı, çok yapay veya uygunsuz ton

8. **Gizlilik korkusu**
	- sesin nereye gittiği belirsiz
	- ekran / clipboard / konuşma verisi sürekli dışarı taşınıyor

9. **Maliyet sürprizi**
	- gerçek zamanlı kullanım ölçeklenince ücret patlıyor

10. **Vendor lock-in**
	- STT, TTS, LLM veya telecom katmanını değiştirmek çok zorlaşıyor

11. **İnsan devrine kötü geçiş**
	- agent'tan insana geçince bağlam kayboluyor

12. **Çok dilde karışıklık**
	- giriş dili, hedef dili, okuma dili, UI dili birbirine giriyor

### 11.2. Kök neden özeti

- Tek katmanlı mimari
- Düşük confidence ile aksiyon alma
- Guardrail yokluğu
- Uygulama profili yokluğu
- Deterministik action engine yokluğu
- Test/eval eksikliği
- Telemetry/trace eksikliği
- Yerel fallback eksikliği

## 12. Bizim sistemde baştan olmaması gereken yanlışlar

### Kesin yasaklar
- Onaysız gönderim varsayılanı
- Aktif pencere doğrulanmadan yazma
- Tek `Enter` mantığıyla bütün uygulamalara davranma
- Confidence düşükken aksiyon alma
- Sadece tek STT motoruna yaslanma
- Sadece tek TTS sağlayıcısına yaslanma
- Kullanıcıya görünmeyen arka plan eylemleri

### Başlangıçtan zorunlu doğrular
- `active-window verification`
- `profile-per-app`
- `confirm-before-send`
- `confidence-aware flow`
- `multilingual state machine`
- `local-first command path`
- `cloud-fallback quality path`
- `audit trail`
- `undo / cancel / abort` komutları
- `hard stop / emergency mute`

## 13. Dünya standardını değil, 5-10 yıl sonrasını hedefleyen tasarım kriterleri

### 13.1. 2030+ hedefli ana prensipler

1. **Hybrid local + cloud intelligence**
	- temel güven katmanı cihazda
	- kalite / uzun muhakeme gerektiğinde bulut

2. **Strict latency budgeting**
	- ilk ses yanıtı p95'te de hızlı olmalı
	- “demo hızlı, üretim yavaş” kabul edilmemeli

3. **Vendor-swappable architecture**
	- STT/TTS/LLM/telecom modülleri değiştirilebilir olmalı

4. **Confidence-based action policy**
	- düşük eminlikte: sor, tekrar et, yavaşla, onay iste, insana bırak

5. **Deterministic action engine**
	- yazma, gönderme, silme, tıklama gibi eylemler serbest üretim değil; politika motoru üzerinden geçmeli

6. **Barge-in native design**
	- kullanıcı araya girdiğinde sistem anında susmalı

7. **Source-grounded response model**
	- bilgi dayanaklı cevaplarda kaynak / retrieval / freshness kontrolü olmalı

8. **Conversation memory boundaries**
	- anlık oturum hafızası
	- profil hafızası
	- hassas veri hafızası
	- bunlar birbirine karışmamalı

9. **Human handoff continuity**
	- insana devirde özet, transcript, risk bayrakları gitmeli

10. **Privacy by default**
	- veri minimizasyonu
	- region pinning
	- retention control
	- local option

11. **Continuous eval system**
	- sentetik test
	- adversarial test
	- production replay
	- kullanıcı kalite puanı

12. **Accessibility-first UX**
	- hız, ton, dil, doğrulama seviyesi, görsel destek, altyazı ayarlanabilir olmalı

## 14. Bu projede hedeflenmesi gereken üstün sistem formülü

Hedef formül:

> `ChatGPT Voice doğallığı`
> + `Gemini Live bağlamı`
> + `Windows Voice Access güvenli desktop kontrolü`
> + `Whisper/Deepgram/Speechmatics kalite STT yaklaşımı`
> + `Vosk/Picovoice local güven katmanı`
> + `ElevenLabs/Cartesia düzeyi doğal TTS`
> + `Voiceflow/Cognigy/Genesys gözlemlenebilirliği`
> + `Twilio/LiveKit/Telnyx düzeyi gerçek zamanlı iletişim altyapısı`
> + `tam uygulama profili + onay + policy engine`

## 15. Yolun çıkacağı yer: nihai yön haritası

### Faz 1 — Güvenli temel
- wake-word
- local STT
- confirm-before-send
- profile-per-app
- wrong-window protection

### Faz 2 — Kalite sıçraması
- ikinci STT motoru
- daha doğal TTS
- translation routing
- trace/log/eval paneli

### Faz 3 — Deterministik aksiyon katmanı
- UI Automation
- semantic action schema
- policy engine
- rollback / undo mekanizmaları

### Faz 4 — Çok cihazlı ajan
- desktop + web + mobile + tablet senkronu
- session continuity
- memory segmentation

### Faz 5 — 2030+ seviye sistem
- multimodal personal operating layer
- self-evaluating agent behavior
- compliance-aware orchestration
- local-first sovereign assistant architecture

## 16. Ek doğruluk notu

Bu dosya artık 50+ değil, **80+ sistemlik geniş bir ana envanter** içerir.

Eğer hedefin gerçekten:

- pazarın en küçük oyuncularına kadar gitmek,
- bölgesel / Çin / Japonya / Arap dünyası / Avrupa / OSS niş projeleri ayrı ayrı çıkarmak,
- ve bunu %95+ dış doğrulama ile yapmak ise,

o durumda benden isteyebileceğin en faydalı yardım şunlardan biri olur:

1. geniş web tarama / SERP API erişimi,
2. Crunchbase / G2 / Product Hunt / GitHub toplu liste erişimi,
3. Browserless veya tam crawl yetkisi,
4. kapsama sınırının net tanımı.

Ama mevcut durumda, **çekirdek küresel alan için güçlü ve uygulanabilir liste** hazırlanmıştır.
