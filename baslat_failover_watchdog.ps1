# ============================================================
# OLLAMA FAILOVER WATCHDOG BASLAT
# ============================================================
# Bu script watchdog'u baslatir — Ollama'yi izler, cokerse 
# yerel GGUF failover server'i otomatik devreye sokar.
# ============================================================

Write-Host "============================================"
Write-Host "  OLLAMA FAILOVER WATCHDOG"
Write-Host "  Ollama: http://localhost:11434"
Write-Host "  Failover: http://localhost:11435"
Write-Host "  Kontrol: Her 5 saniye"
Write-Host "============================================"

$watchdogScript = Join-Path $PSScriptRoot "failover_watchdog.py"
if (-not (Test-Path $watchdogScript)) {
    Write-Host "[HATA] failover_watchdog.py bulunamadi: $watchdogScript"
    exit 1
}

# Onceki watchdog varsa durdur
$eski = Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*failover_watchdog*" }
if ($eski) {
    Write-Host "[INFO] Onceki watchdog durduruluyor..."
    $eski | Stop-Process -Force
}

Write-Host "[INFO] Watchdog baslatiliyor..."
python $watchdogScript
