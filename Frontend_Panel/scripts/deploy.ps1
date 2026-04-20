# ============================================================
# STP-001 DAĞITIM VE MÜHÜRLEME BETİĞİ (PowerShell)
# ============================================================

Write-Host "🚀 Dağıtım süreci başlatılıyor..." -ForegroundColor Cyan

# 1. Bağımlılık Kontrolü
Write-Host "📦 Bağımlılıklar kontrol ediliyor..."
npm install
if ($LASTEXITCODE -ne 0) { Write-Error "❌ Kritik Hata: npm install başarısız."; exit 1 }

# 2. Üretim Derlemesi (Build)
Write-Host "🏗️ Üretim derlemesi oluşturuluyor (npm run build)..."
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "❌ Kritik Hata: Build başarısız."; exit 1 }

# 3. Sistem Mühürleme (Audit Log)
Write-Host "🔐 Sistem mühürleniyor..."
node scripts/factory_seal.js
if ($LASTEXITCODE -ne 0) { Write-Warning "⚠️ Uyarı: Mühürleme işlemi tamamlanamadı." }

Write-Host "============================================================" -ForegroundColor Green
Write-Host "✅ İŞLEM TAMAMLANDI: SİSTEM FABRİKADAN ÇIKTI!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
