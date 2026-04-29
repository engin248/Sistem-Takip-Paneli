$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = 'python'
$requirements = Join-Path $root 'requirements_turkce_ses_asistani.txt'
$script = Join-Path $root 'vscode_turkce_ses_asistani.py'
$pythonExe = (Get-Command python).Source
$pythonw = Join-Path (Split-Path $pythonExe -Parent) 'pythonw.exe'

Set-Location $root

$existing = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
	($_.Name -in @('python.exe', 'pythonw.exe')) -and
	$_.CommandLine -and
	$_.CommandLine -match 'vscode_turkce_ses_asistani\.py'
}

foreach ($process in $existing) {
	try {
		Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
	} catch {}
}

& $python -m pip install -r $requirements
if (Test-Path $pythonw) {
	Start-Process -FilePath $pythonw -ArgumentList @($script) -WorkingDirectory $root -WindowStyle Hidden
} else {
	Start-Process -FilePath $python -ArgumentList @($script) -WorkingDirectory $root -WindowStyle Hidden
}

Write-Output 'Global Türkçe Ses Asistanı başlatıldı.'
