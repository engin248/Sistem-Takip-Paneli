$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktop = [Environment]::GetFolderPath('Desktop')
$installDir = Join-Path $desktop 'Global_Turkce_Ses_Asistani'

New-Item -ItemType Directory -Force -Path $installDir | Out-Null

$filesToCopy = @(
    'vscode_turkce_ses_asistani.py',
    'requirements_turkce_ses_asistani.txt',
    'global_ses_asistani_profiles.json',
    'baslat_turkce_sesli_kopru.ps1'
)

foreach ($file in $filesToCopy) {
    Copy-Item (Join-Path $root $file) $installDir -Force
}

$modelSource = Join-Path $root 'models'
if (Test-Path $modelSource) {
    Copy-Item $modelSource $installDir -Recurse -Force
}

$target = 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'
$launcher = Join-Path $installDir 'baslat_turkce_sesli_kopru.ps1'
$shortcutPath = Join-Path $desktop 'Global Türkçe Ses Asistanı.lnk'

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $target
$shortcut.Arguments = "-ExecutionPolicy Bypass -File `"$launcher`""
$shortcut.WorkingDirectory = $installDir
$shortcut.IconLocation = 'C:\Windows\System32\SHELL32.dll,220'
$shortcut.Save()

Write-Output "INSTALL_DIR=$installDir"
Write-Output "SHORTCUT=$shortcutPath"
