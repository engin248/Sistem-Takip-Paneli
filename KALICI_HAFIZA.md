# KALICI HAFIZA — STP Proje Durumu
> **Son Güncelleme:** 13 Nisan 2026 05:37 (UTC+3)
> **Kaynak:** Canlı sistem verileri

---

## PROJE KİMLİĞİ
| Özellik | Değer |
|---------|-------|
| **Çalışma Dizini** | `C:\Users\Esisya\Desktop\Sistem-Takip-Paneli\02_is_alani` |
| **Git Repo** | `engin248/Sistem-Takip-Paneli` |
| **Son Commit** | `b9a4495` (main) |
| **Canlı** | https://sistem-takip-paneli.vercel.app |
| **Vercel Durumu** | healthy |
| **DB** | Supabase `tesxmqhkegotxenoljzl` |
| **Stack** | Next.js 16.2.2 + TypeScript + TailwindCSS |
| **Auth** | ✅ AÇIK |
| **Test** | Vitest 92/92 ✅ · TypeScript 0 hata ✅ |

---

## DOSYA SAYILARI
| Dizin | Adet |
|-------|------|
| services/ | 24 |
| components/ | 19 |
| lib/ | 15 |
| store/ | 5 |
| API routes | 11 |
| **Toplam src/** | **84** |

---

## KRİTİK KURALLAR
1. `proxy.ts` tekil güvenlik katmanı — `middleware.ts` OLUŞTURMA
2. `audit_logs` eski 6 alan şeması — ŞEMAYI DEĞİŞTİRME
3. `.env.local` gitignore'da — commit'e girmez
4. Hardcoded secret YASAK — GitHub Push Protection aktif
