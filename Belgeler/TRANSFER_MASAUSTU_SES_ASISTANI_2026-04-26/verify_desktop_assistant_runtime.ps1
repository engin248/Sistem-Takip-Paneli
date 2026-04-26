$ErrorActionPreference = 'Stop'

$desktop = [Environment]::GetFolderPath('Desktop')
$installDir = Join-Path $desktop 'Global_Turkce_Ses_Asistani'
$shortcutPath = Join-Path $desktop 'Global Türkçe Ses Asistanı.lnk'
$launcherPath = Join-Path $installDir 'baslat_turkce_sesli_kopru.ps1'
$assistantPath = Join-Path $installDir 'vscode_turkce_ses_asistani.py'

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)

Write-Output ('shortcut_target=' + $shortcut.TargetPath)
Write-Output ('shortcut_arguments=' + $shortcut.Arguments)
Write-Output ('shortcut_workdir=' + $shortcut.WorkingDirectory)

if ($shortcut.WorkingDirectory -ne $installDir) {
    throw 'Shortcut working directory mismatch'
}

if ($shortcut.Arguments -notlike ('*' + $launcherPath + '*')) {
    throw 'Shortcut launcher mismatch'
}

$matching = Get-CimInstance Win32_Process | Where-Object {
    ($_.Name -in @('python.exe', 'pythonw.exe')) -and $_.CommandLine -like ('*' + $assistantPath + '*')
}

if (-not $matching) {
    throw 'Desktop runtime process not found'
}

$matching | Select-Object -First 5 ProcessId, Name, CommandLine | Format-List | Out-String | Write-Output
