# Global Ses Asistanı — Entegrasyon Mimarisi

## Amaç
Bu belge, global ses asistanının:
- üst projelere,
- alt projelere,
- bağımsız masaüstü uygulamalarına,
- tarayıcı tabanlı panellere,
- tablet ve mobil istemcilere
entegrasyon mantığını tanımlar.

## Temel yaklaşım
Çekirdek ses asistanı tek kalır. Uygulamaya göre sadece adaptör katmanı değişir.

## Katmanlar
1. Ses çekirdeği
2. Dil/STT katmanı
3. Çeviri katmanı
4. Profil motoru
5. Entegrasyon adaptörleri
6. UI/API eylem katmanı
7. Cevap işleme katmanı

## Entegrasyon türleri
### 1. Üst proje entegrasyonu
Kullanım:
- mevcut büyük projeye yardımcı servis olarak bağlanır
- profil dosyaları ile hedef uygulamalar tanımlanır
- yerel olay ve log akışına bağlanır

### 2. Alt proje entegrasyonu
Kullanım:
- her alt modül kendi profilini verir
- ses asistanı ortak servis olur
- diller ve gönderim kuralları alt modül bazlı tanımlanır

### 3. Bağımsız masaüstü uygulaması
Kullanım:
- tek başına çalışır
- pencere odağına göre profil seçer
- Windows başlangıcında çalışır

### 4. Tablet / mobil istemci
Doğru yaklaşım:
- çekirdeği servis mantığıyla tutmak
- istemci tarafında platforma uygun UI oluşturmak
- Android/iOS için ayrı istemci katmanı üretmek
- webview veya yerel uygulama istemcisi ile çekirdeğe bağlamak

## Mobil ve tablet için doğru yol
Doğrudan bu Python arayüzünü mobil uygulamaya taşımak doğru değildir.
Doğru yol:
- ses çekirdeğini servisleştirmek
- istemciyi ayrı üretmek
- profil ve dil kurallarını ortak JSON/manifest dosyalarında tutmak

## Ortak dosyalar
- `global_ses_asistani_profiles.json` → uygulama ve dil profilleri
- `requirements_turkce_ses_asistani.txt` → bağımlılıklar
- `vscode_turkce_ses_asistani.py` → çalışan çekirdek

## Önerilen sonraki adım
1. UI Automation adaptörü
2. Yerel HTTP/IPC servis katmanı
3. Web panel istemcisi
4. Mobil istemci taslağı
