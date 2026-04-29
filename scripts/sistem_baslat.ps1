# STP Sistem Başlatma — Bilgisayar açılışında çalışır
Start-Sleep -Seconds 10  # Ağın gelmesini bekle

$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

# PM2'yi canlandır (kayıtlı tüm servisleri başlat)
pm2 resurrect
Start-Sleep -Seconds 5

# Durum kontrol
pm2 list
