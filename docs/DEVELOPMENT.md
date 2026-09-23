# Development guide

[Back to README](../README.md)

## Native setup

Use Python 3.10+ and Node compatible with Vite 8 (Node 22.12+ recommended).

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pip install "uvicorn[standard]" "requests==2.34.2"
```

Install the multilingual base model explicitly once, approximately 150 MB. This downloads model weights, never uploads audio:

```powershell
python -c "from faster_whisper import WhisperModel; WhisperModel('base', device='cpu', compute_type='int8')"
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --ws-max-size 1536000
```

Normal transcription uses cached files only. Missing weights or tokenizer files produce an actionable error instead of downloading automatically. Live PCM does not require a separate FFmpeg executable; file decoding uses PyAV.

In a second terminal, from the repository root:

```powershell
cd extension
npm ci
npm run build
```

In Chromium 116+, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `extension/dist`. Rebuild and reload the extension after source changes.

Open WatchNT Settings:

1. Choose the spoken language or automatic detection, and English or Spanish for the UI.
2. Use the optional microphone permission button if you want your own voice included. Without microphone permission, capture includes only the meeting tab.
3. For Ollama, install/run Ollama and choose an already installed model. Use `http://localhost:11434/api/generate` as the endpoint. WatchNT does not install an LLM automatically.
4. Alternatively choose a BYOK provider, enter its model and key, and explicitly allow cloud text processing. Provider usage charges, if any, are separate from WatchNT.
5. Save and test connections. Diagnostics test the selected model and the cached Whisper weights.

Open a Meet, Zoom Web, or Teams Web call. Start capture from the **extension toolbar popup**; Chromium requires the extension invocation for tab capture. Stop from the popup or floating controller. For captions mode, enable captions in the meeting before starting. The controller shows the source text, recording/processing state, and an ASR score where available. The score is not calibrated word accuracy.

If capture or upload fails, go to Settings > Recover partial transcript before starting another recording. The recognized text is retained in extension-local storage; unprocessed buffered audio is not recoverable. Audio is processed in memory and is not archived by the live capture path.

## Build and test

From the repository root:

```powershell
python -m pip install pytest
python -m pytest backend/tests -q
npm run build --prefix extension
npm run lint --prefix extension
npm audit --prefix extension
```

Backend tests use temporary databases and meeting directories; provider protocol tests use simulated responses. Install Python Playwright and its Chromium runtime after building the extension:

```powershell
python -m pip install playwright
python -m playwright install chromium
python scripts/onboarding_smoke.py       # Mocked provider setup and consent
python scripts/popup_recovery_smoke.py   # Capture states and 25px initial-viewport regression
python scripts/native_popup_smoke.py     # Opens a separate Chromium window; tests real toolbar sizing
python scripts/ui_smoke.py               # Requires port 8000 to be free
```

`ui_smoke.py` loads the actual built extension and an isolated local backend. The onboarding and popup scripts use isolated browser storage and mocked backend responses, so Docker can remain running for those checks. It also checks failed-save rollback, rename dialogs, keyboard tabs, capture UI states, and automated accessibility using the development-only `axe-core` dependency. See [UI design and verification](UI_DESIGN.md) for the shared design system and reload steps. It checks folder creation/move, search, saved action completion, detail/transcript, export, language settings, Spanish persistence, and mobile overflow. Optional real STT integration is described in [architecture and verification notes](ENGINE_UPGRADE.md).

## Contributing

Create a focused branch, include regression coverage for behavior changes, and run the checks relevant to your change. Describe the observed problem, resulting behavior, and validation in your pull request. For UI changes, include screenshots made with sample data. Keep API keys, databases, recordings, transcripts, and generated build output out of commits.

Report reproducible bugs through [GitHub Issues](https://github.com/avirooppal/Watchnt/issues), including your browser, operating system, provider/model, and redacted error details.
