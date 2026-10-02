param(
    [Parameter(Mandatory=$true)][ValidatePattern('^[a-p]{32}$')][string]$ExtensionId
)
$ErrorActionPreference = 'Stop'
$companionRoot = $PSScriptRoot
$pythonPath = Join-Path $companionRoot '.venv\Scripts\python.exe'
if (!(Test-Path -LiteralPath $pythonPath)) {
    python -m venv (Join-Path $companionRoot '.venv')
    if ($LASTEXITCODE -ne 0) { throw 'Python 3.10 or newer is required.' }
}
& $pythonPath -m pip install -r (Join-Path $companionRoot 'requirements.txt')
if ($LASTEXITCODE -ne 0) { throw 'Companion dependencies could not be installed.' }
$installPath = Join-Path $env:LOCALAPPDATA 'WatchNT\companion'
New-Item -ItemType Directory -Force -Path $installPath | Out-Null
$launcherPath = Join-Path $installPath 'watchnt-host.cmd'
$hostPath = Join-Path $companionRoot 'host.py'
@"
@echo off
"$pythonPath" "$hostPath" %*
"@ | Set-Content -LiteralPath $launcherPath -Encoding Ascii
$manifestPath = Join-Path $installPath 'com.watchnt.recorder.json'
$origins = @("chrome-extension://$ExtensionId/")
if (Test-Path -LiteralPath $manifestPath) {
    $previous = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    $origins = @($previous.allowed_origins) + $origins | Select-Object -Unique
}
@{name='com.watchnt.recorder';description='WatchNT Windows recorder';path=$launcherPath;type='stdio';allowed_origins=@($origins)} |
    ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding Ascii
foreach ($browser in @('Google\Chrome', 'Microsoft\Edge', 'Chromium')) {
    $registryPath = "HKCU:\Software\$browser\NativeMessagingHosts\com.watchnt.recorder"
    New-Item -Path $registryPath -Force | Out-Null
    Set-Item -Path $registryPath -Value $manifestPath
}
Write-Output 'WatchNT companion installed for this Windows user. Reload the extension once.'
