# Generates a test fixture locally using Windows speech synthesis, without a network request.
Add-Type -AssemblyName System.Speech
$watchntRoot = Split-Path -Parent $PSScriptRoot
$watchntArtifacts = Join-Path $watchntRoot 'artifacts'
New-Item -ItemType Directory -Path $watchntArtifacts -Force | Out-Null
$watchntVoice = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $watchntVoice.SetOutputToWaveFile((Join-Path $watchntArtifacts 'speech-smoke.wav'))
    $watchntVoice.Speak('Welcome to the project meeting. Alex will send the report on Friday. We decided to launch the new website next week.')
} finally {
    $watchntVoice.Dispose()
}
