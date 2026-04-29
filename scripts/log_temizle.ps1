# ============================================================
# LOG TEMİZLEME — 7 günden eski logları sil
# Çalıştırma: Görev Zamanlayıcı ile haftada bir otomatik
# ============================================================

$PROJE_KOKU = "C:\Users\Esisya\Desktop\Sistem-Takip-Paneli"
$SINIR_GUN  = 7
$SINIR_TARİH = (Get-Date).AddDays(-$SINIR_GUN)

$LOG_KLASORLERI = @(
    "$PROJE_KOKU\MASTER_AGENTS_POOL",
    "$PROJE_KOKU\Sistem_Takip_Projesi\logs",
    "$PROJE_KOKU\Planlama_Departmani\audit_logs",
    "$PROJE_KOKU\Planlama_Departmani\kararlar",
    "$PROJE_KOKU\WhatsApp_Bot\arsiv",
    "$PROJE_KOKU\02_is_alani\SISTEM_KASASI_AUDITS",
    "$PROJE_KOKU\03_denetim_kanit"
)

Write-Host "=== LOG TEMİZLEME BAŞLIYOR — $(Get-Date) ==="
Write-Host "Sınır: $SINIR_GUN günden eski dosyalar silinecek"
Write-Host ""

$toplam_silinen = 0
$toplam_boyut  = 0

foreach ($klasor in $LOG_KLASORLERI) {
    if (-not (Test-Path $klasor)) { continue }

    $eskiDosyalar = Get-ChildItem $klasor -Recurse -File |
        Where-Object { $_.LastWriteTime -lt $SINIR_TARİH -and $_.Extension -match "\.log|\.jsonl" }

    foreach ($d in $eskiDosyalar) {
        $toplam_boyut += $d.Length
        $toplam_silinen++
        Write-Host "  SİLİNDİ: $($d.FullName -replace [regex]::Escape($PROJE_KOKU + '\'), '') [$([math]::Round($d.Length/1KB,1)) KB]"
        Remove-Item $d.FullName -Force
    }
}

$boyutMB = [math]::Round($toplam_boyut / 1MB, 2)
Write-Host ""
Write-Host "=== TAMAMLANDI ==="
Write-Host "Silinen dosya: $toplam_silinen"
Write-Host "Kazanılan alan: $boyutMB MB"
Write-Host "Bitiş: $(Get-Date)"
