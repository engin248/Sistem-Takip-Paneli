# ============================================================
# NIZAM - WHATSAPP BRIDGE LAUNCHER
# ============================================================
Set-Location -Path "C:\Users\Esisya\Desktop\Sistem-Takip-Paneli\WhatsApp_Bot"

Write-Host "---" -ForegroundColor Gray
Write-Host "NIZAM | WHATSAPP BRIDGE ACTIVATING" -ForegroundColor Cyan
Write-Host "---" -ForegroundColor Gray

if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js not found." -ForegroundColor Red
    Pause
    exit
}

if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "Launching Bot..." -ForegroundColor Green
node whatsapp_agent.js
