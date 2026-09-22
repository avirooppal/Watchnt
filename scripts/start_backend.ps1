# Start WatchNT with existing native or Docker-backed local data.
$ErrorActionPreference = 'Stop'
$watchntRoot = Split-Path -Parent $PSScriptRoot
$watchntBackend = Join-Path $watchntRoot 'backend'
$watchntData = Join-Path $watchntRoot 'data/watchnt.db'
$watchntOldDatabase = $env:DATABASE_URL
$watchntOldMeetings = $env:MEETINGS_DIR
try {
    if (-not $env:DATABASE_URL -and (Test-Path -LiteralPath $watchntData) -and -not (Test-Path -LiteralPath (Join-Path $watchntBackend 'watchnt.db'))) {
        $env:DATABASE_URL = 'sqlite:///' + $watchntData.Replace('\', '/')
        if (-not $env:MEETINGS_DIR) { $env:MEETINGS_DIR = Join-Path $watchntRoot 'meetings' }
    }
    Push-Location -LiteralPath $watchntBackend
    try {
        python -m uvicorn main:app --host 127.0.0.1 --port 8000
        if ($LASTEXITCODE -ne 0) { throw "Backend exited with code $LASTEXITCODE" }
    }
    finally { Pop-Location }
} finally {
    $env:DATABASE_URL = $watchntOldDatabase
    $env:MEETINGS_DIR = $watchntOldMeetings
}
