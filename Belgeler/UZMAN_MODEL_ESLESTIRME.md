# UZMAN KADRO — MODEL EŞLEŞTİRME RAPORU
Tarih: 2026-04-25 | Sistem: Sistem Takip Paneli v4

## YÖNETİCİ ÖZETİ

**Mevcut Ollama Modeli Sayısı:** 60 (30 orijinal + 30 klon)
**Atanan Konu Sayısı:** 28
**Üretilen Uzman Ajan Sayısı:** 28 × 10 = **280 birim**
**Pinokio'da Bulunan Ek Model:** llava-1.5-7b-hf, codellama-7b-instruct, phi-3.5-mini (3 adet)

---

## KONU → MODEL EŞLEŞTİRMESİ

| # | Kod | Konu | Atanan Model | Boyut | Durum |
|:--|:---:|:---|:---|:---:|:---:|
| 1 | PY | Python Geliştirme | `deepseek-coder-v2:latest` | 8.9 GB | ✅ |
| 2 | JS | JavaScript / Node.js | `codellama:latest` | 3.8 GB | ✅ |
| 3 | SC | Kaynak Kod Kalitesi | `starcoder2:latest` | 1.7 GB | ✅ |
| 4 | DS | Veritabanı ve SQL | `deepseek-coder-v2:latest` | 8.9 GB | ✅ |
| 5 | LM | LLM ve Prompt Müh. | `phi4:latest` | 9.1 GB | ✅ |
| 6 | RA | RAG ve Embedding | `nomic-embed-text:latest` | 274 MB | ✅ |
| 7 | ML | Makine Öğrenimi | `deepseek-r1:7b` | 4.7 GB | ✅ |
| 8 | NL | Doğal Dil İşleme | `mistral-nemo:latest` | 7.1 GB | ✅ |
| 9 | VI | Görüntü Analizi | `llama3.2-vision:11b` | 7.8 GB | ✅ |
| 10 | MM | Multimodal AI | `minicpm-v:latest` | 5.5 GB | ✅ |
| 11 | TR | Trendyol / Pazaryeri | `qwen2.5-coder:3b` | 1.9 GB | ✅ |
| 12 | FY | Fiyatlandırma | `deepseek-r1:7b` | 4.7 GB | ✅ |
| 13 | MU | Müşteri İlişkileri | `command-r:latest` | 18 GB | ✅ |
| 14 | GV | Siber Güvenlik | `phi4:latest` | 9.1 GB | ✅ |
| 15 | BL | Bulut ve DevOps | `llama3.1:8b` | 4.9 GB | ✅ |
| 16 | AP | API Tasarımı | `qwen2.5:latest` | 4.7 GB | ✅ |
| 17 | MO | Mobil Geliştirme | `gemma3:4b` | 3.3 GB | ✅ |
| 18 | FE | Frontend / UI-UX | `qwen3.5:latest` | 6.6 GB | ✅ |
| 19 | WS | Web Scraping | `deepseek-coder-v2:latest` | 8.9 GB | ✅ |
| 20 | OT | İş Süreci Otomasyonu | `phi3:latest` | 2.2 GB | ✅ |
| 21 | WA | WhatsApp Botları | `llama3.2:1b` | 1.3 GB | ✅ |
| 22 | SS | Ses Tanıma / Sentezi | `llama3.2:1b` | 1.3 GB | ✅ |
| 23 | SE | SEO ve Dijital Paz. | `command-r:latest` | 18 GB | ✅ |
| 24 | IC | İçerik Üretimi | `mistral:latest` | 4.4 GB | ✅ |
| 25 | HK | Hukuk / Sözleşme | `phi4:latest` | 9.1 GB | ✅ |
| 26 | FN | Fintech / Ödeme | `qwen2.5:latest` | 4.7 GB | ✅ |
| 27 | AY | Stratejik Analiz | `gpt-oss:20b` | 13 GB | ✅ |
| 28 | DO | Dokümantasyon | `gemma:7b` | 5.0 GB | ✅ |

> **Not:** Pinokio'daki ek modeller (llava-1.5-7b, codellama-7b-instruct, phi-3.5-mini)
> görsel analiz ve hafif kod görevleri için yedek olarak atandı.

---

## PİNOKİO → OLLAMA BAĞLANTISI

Masaüstündeki `Pinokio.exe` dosyaları kurulum kopyaları.
**Asıl veri:** `C:\pinokio\` — Platform kurulu ve çalışıyor.

Pinokio'daki modeller zaten Ollama'ya klonlanmış:

| Pinokio / Yeni Model | Ollama Karşılığı | Görev |
|:---|:---|:---|
| `llava-1.5-7b-hf-q4_k_m` | `llava:latest` yedek | Görüntü analizi (VI grubu) |
| `codellama-7b-instruct.q4_k_m` | `codellama:latest` yedek | JS, kod review (SC grubu) |
| `phi-3.5-mini-instruct-q4_k_m` | `phi4-mini:latest` yedek | Hafif görevler (OT, WA) |
| `qwen3.5:latest` | Mevcut | Frontend (FE grubu) |

---

## TAMAMLANMASI GEREKEN KONULAR (Ollama Pull)

Tüm konular mevcut modellerle karşılandı.
Opsiyonel iyileştirmeler için:

```powershell
# Türkçe NLP için önerilen
ollama pull aya-expanse:8b

# Daha iyi embedding için
ollama pull mxbai-embed-large

# Hafif ama güçlü genel model
ollama pull phi4-mini:latest  # ZATen mevcut
```

---

## AJAN KURAL (RUL) ÇERÇEVESİ

Her 10 ajanlı takımda görev dağılımı:

| Pozisyon | ID Suffix | Rol | Görev |
|:---:|:---:|:---|:---|
| 1 | -01 | ALFA (Yapıcı) | Görevi birincil olarak çözer |
| 2 | -02 | BRAVO (Denetçi) | Yapıcıyı çürütmeye çalışır |
| 3 | -03 | CHARLIE (Uzman) | Spesifik alt-alan desteği |
| 4-10 | -04..10 | UZMAN | Paralel veya yedek çalışma |

**Kural:** Her ajan SADECE kendi `konu_kodu` kapsamında çalışır.
Kapsam dışı istek → `[UKG-003] KAPSAM_İHLALİ` hatası döner.
