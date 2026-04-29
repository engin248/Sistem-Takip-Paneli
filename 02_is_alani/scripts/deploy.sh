#!/bin/bash

# ============================================================
# STP-001 DAĞITIM VE MÜHÜRLEME BETİĞİ (CI/CD)
# Doktrin: Sadece hatasız build "Fabrikadan Çıktı" sayılır.
# ============================================================

echo "🚀 Dağıtım süreci başlatılıyor..."

# 1. Bağımlılık Kontrolü
echo "📦 Bağımlılıklar kontrol ediliyor..."
npm install || { echo "❌ Kritik Hata: npm install başarısız."; exit 1; }

# 2. Üretim Derlemesi (Build)
echo "🏗️ Üretim derlemesi oluşturuluyor (npm run build)..."
npm run build || { echo "❌ Kritik Hata: Build başarısız. Geri çekiliyor..."; exit 1; }

# 3. Sistem Mühürleme (Audit Log)
echo "🔐 Sistem mühürleniyor..."
node scripts/factory_seal.js || { echo "❌ Uyarı: Mühürleme işlemi tamamlanamadı ancak build başarılı."; }

echo "============================================================"
echo "✅ İŞLEM TAMAMLANDI: SİSTEM FABRİKADAN ÇIKTI!"
echo "============================================================"
