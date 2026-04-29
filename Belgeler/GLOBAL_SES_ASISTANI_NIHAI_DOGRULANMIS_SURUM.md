# Global Ses Asistanı — Nihai Doğrulanmış Sürüm

## 1. Belgenin amacı
Bu belge;
- mevcut AR-GE sonuçlarını,
- dış pazar araştırmasını,
- kurumsal güvenlik gereksinimlerini,
- insan yararını,
- gelecek 5-10 yıl hedefini
tek bir doğrulanmış yürütme çerçevesinde birleştirir.

Bu sürümün ilkesi şudur:

> Her adım uygulanır, test edilir, doğrulanır; yalnızca doğruysa sonraki adıma geçilir.

## 2. Nihai ürün tanımı
Hedef ürün:
- çok dilli,
- local-first,
- profile-aware,
- confirm-before-send,
- vendor-swappable,
- audit edilebilir,
- insan merkezli,
- deterministik aksiyon motoruna sahip
bir bilişsel operasyon asistanıdır.

Bu ürün bir chatbot değildir.
Bu ürün bir sesli yazıcı da değildir.
Bu ürün, güvenli aksiyon katmanı olan bir operasyon sistemidir.

## 3. Değişmez 12 ana ilke
1. İnsan onayı kritik aksiyonların üstündedir.
2. Düşük güven puanında sistem durur ve sorar.
3. Yanlış pencereye yazma riski sıfıra yaklaştırılır.
4. API varsa önce API kullanılır.
5. UI Automation ikinci katmandır.
6. Clipboard/keyboard yalnızca kontrollü fallback'tir.
7. OCR son çaredir.
8. STT tek motora bağımlı olmaz.
9. TTS tek sağlayıcıya bağımlı olmaz.
10. Her aksiyon loglanır ve yeniden izlenebilir olur.
11. Yerel güven çekirdeği olmadan sistem tamamlanmış sayılmaz.
12. Faz geçişi test ve doğrulama kapısından geçmeden yapılamaz.

## 4. Bilimsel / teknolojik / matematiksel / teorik temel

### Bilimsel temel
- insan-hata azaltımı
- bilişsel yük minimizasyonu
- erişilebilirlik
- güvenli insan-makine etkileşimi

### Teknolojik temel
- multi-engine STT
- low-latency TTS
- deterministic action routing
- structured telemetry
- replayable audit pipeline

### Matematiksel temel
- confidence scoring
- weighted model arbitration
- latency budgeting
- false positive / false negative ölçümü
- phase-gate kabul eşikleri

### Teorik temel
- human-in-the-loop systems
- fail-safe automation
- layered fallback architecture
- policy-governed action execution
- privacy-by-default system design

## 5. En iyi doğruların birleşimi
Birleşik nihai yapı şu güçlü tarafları alır:
- doğal konuşma: ChatGPT Voice / Gemini Live seviyesi
- güçlü STT: Whisper / Deepgram / Speechmatics / Vosk hibrit mantığı
- güçlü TTS: ElevenLabs / Cartesia / Edge TTS yaklaşımı
- güvenli masaüstü kontrol: Windows Voice Access + UIA disiplini
- local-first güven: Vosk / Picovoice / Rhasspy mantığı
- kurumsal gözlemlenebilirlik: Voiceflow / Cognigy / Genesys mantığı
- telephony/realtime disiplin: Twilio / LiveKit / Telnyx / Retell yaklaşımı

## 6. Yasaklı hatalar
Aşağıdaki davranışlar sistem hatası sayılır:
- yanlış pencereye yazmak
- onaysız kritik gönderim yapmak
- düşük confidence ile aksiyon almak
- sistemin kendi sesini komut sanması
- sistemin kendi clipboard çıktısını yeni cevap sanması
- logsuz işlem yapmak
- tek sağlayıcıya tam kilitlenmek
- araya giren kullanıcıya rağmen konuşmaya devam etmek
- çok dilli akışta dil durumunu karıştırmak

## 7. Kök çözümler
Bu hataların köklü çözümleri:
- `active-window verification`
- `confirm-before-send`
- `confidence policy engine`
- `multilingual state machine`
- `deterministic action engine`
- `structured audit logging`
- `provider adapters`
- `hard stop / mute / abort`
- `own-output suppression`
- `response freshness detection`

## 8. Nihai mimari
1. Ses alma katmanı
2. Wake-word ve VAD katmanı
3. Multi-STT arbitration
4. Dil algılama katmanı
5. Niyet / anlam doğrulama katmanı
6. Çeviri katmanı
7. App/profile routing katmanı
8. Deterministic action engine
9. Response capture katmanı
10. TTS routing katmanı
11. Audit / replay / trace katmanı
12. Güvenlik / politika katmanı

## 9. Uygulama ve doğrulama sırası

### Faz 0 — Kapsam kilidi
Test:
- gereksinim listesi var mı
- yasaklı hatalar tanımlı mı
- başarı kriterleri tanımlı mı
Geçiş:
- evet ise Faz 1

### Faz 1 — Güvenli çekirdek
İşler:
- ses alma
- wake-word
- local STT
- active window tracking
- app profiles
- confirm-before-send
Test:
- py_compile geçiyor mu
- yanlış pencereye yazma kontrolü var mı
- abort komutu çalışıyor mu
Geçiş:
- tümü geçtiyse Faz 2

### Faz 2 — Kalite katmanı
İşler:
- ikinci STT motoru
- dil algılama
- translation routing
- daha güçlü TTS
Test:
- Türkçe/Arapça/İngilizce akışları doğrulanıyor mu
- düşük confidence doğru işaretleniyor mu
Geçiş:
- tümü geçtiyse Faz 3

### Faz 3 — Deterministik aksiyon
İşler:
- UI Automation
- action schema
- policy engine
- undo/rollback
Test:
- profile dışı aksiyon engelleniyor mu
- kritik aksiyon onaysız gitmiyor mu
Geçiş:
- tümü geçtiyse Faz 4

### Faz 4 — Denetim ve kalite güvencesi
İşler:
- structured logs
- replay
- adversarial tests
- regression pack
Test:
- her hata yeniden izlenebilir mi
- kök neden çıkarılabiliyor mu
Geçiş:
- tümü geçtiyse Faz 5

### Faz 5 — Operasyonel ölçekleme
İşler:
- service layer
- device continuity
- memory segmentation
- cost governance
Test:
- maliyet sınırları korunuyor mu
- session continuity güvenli mi
Geçiş:
- tümü geçtiyse üretim kabulü

## 10. 5 açıdan zorunlu analiz
1. Fonksiyonel doğruluk
2. Güvenlik ve mahremiyet
3. Dayanıklılık ve hata toleransı
4. İnsan faydası ve UX
5. Gelecek uyumu ve ölçeklenebilirlik

Her faz bu 5 açıdan ayrı onay alır.

## 11. İşlem kontrol noktaları
- giriş doğrulama
- pencere doğrulama
- profil doğrulama
- dil doğrulama
- confidence doğrulama
- gönderim doğrulama
- cevap doğrulama
- log doğrulama
- fallback doğrulama

## 12. İşlem test doğrulama kriterleri
Bir adım ancak şu durumda tamam kabul edilir:
- `No syntax error`
- `No runtime-critical error`
- `Manual validation passed`
- `Logs created`
- `Fallback validated`
- `Wrong-action risk acceptable`

## 13. Operasyon planı
- her açılışta sağlık kontrolü
- her oturumda log başlangıcı
- her kritik aksiyonda onay
- her hata sonrası sınıflandırma
- her güncelleme sonrası regresyon testi
- her yeni sağlayıcı sonrası adaptör testi

## 14. Mevcut doğrulama durumu
Şu anki çalışma alanında doğrulanan durum:
- ana Python uygulaması derleniyor
- ana Python dosyasında editör hatası görünmüyor
- strateji ve AR-GE belgeleri oluşturuldu
- test/doğrulama paketinin çekirdeği hazırlandı

## 15. Nihai hüküm
Doğru sistem şu ilkede kurulmalıdır:

> Local-first güven çekirdeği + çok motorlu kalite katmanı + insan onayı + uygulama profili + deterministik aksiyon motoru + tam log/trace + faz kapılı doğrulama.

Bunun altındaki her yaklaşım, kısa vadede çalışsa bile uzun vadede kırılgan kalır.
