# WatchNT

A local-first meeting copilot: a Chromium extension, a FastAPI engine, SQLite, and local multilingual Whisper. No required subscription. Ollama keeps text processing local; Groq, OpenAI, Gemini, and OpenRouter remain optional BYOK text providers.

## What works

- Live tab audio with optional microphone capture, 8-second PCM windows, local Silero VAD, CPU int8 Whisper, and a live transcript preview.
- A separate captions mode for Meet, Zoom Web, and Teams Web. Enable the platform's captions first; DOM compatibility needs testing against your platform version.
- Local meeting library, folder filtering, transcript search, structured summaries, decisions, entities, timelines, email drafts, and meeting questions.
- Persistent action completion, including across regenerated AI output when task and owner match.
- English and Spanish UI with independent spoken-language selection. Auto STT detects language per window; manual override supports Whisper language codes.
- Explicit cloud-text consent. Audio has no cloud provider path. Email drafts can be exported; SMTP sending is disabled.

## Start locally

Use Python 3.10+ and Node compatible with Vite 8 (Node 22.12+ recommended).

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
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

If capture or upload fails, go to Settings → Recover partial transcript before starting another recording. The recognized text is retained in extension-local storage; unprocessed buffered audio is not recoverable. Audio is processed in memory and is not archived by the live capture path.

## Existing installations

The first backend startup adds `transcription_language` and `cloud_text_consent` to SQLite settings, idempotently. No meeting-data migration is required. Existing cloud STT settings are forced local. Cloud LLM users must explicitly enable text consent once; their providers and keys are preserved. The API masks keys on read. Keys and data are stored locally, not encrypted at rest.

Keep your existing backend working directory/database location. The default database remains `backend/watchnt.db` when launched there; `DATABASE_URL` and `MEETINGS_DIR` can override storage locations. Stop the backend before backing up the SQLite database and meeting directory.

## Docker

```powershell
docker compose up --build -d
docker compose exec backend python -c "from faster_whisper import WhisperModel; WhisperModel('base', device='cpu', compute_type='int8')"
```

Compose exposes the API only at `127.0.0.1:8000`, persists the database and meetings in the existing volumes, and adds a persistent model cache. For host Ollama, configure `http://host.docker.internal:11434/api/generate` in Settings. That hostname is permitted only with `WATCHNT_ALLOW_DOCKER_HOST=1`, set by Compose. The host Ollama installation must be reachable from the container. Native execution is simplest for fully local Ollama.

## Verification

From the repository root:

```powershell
python -m pip install pytest
python -m pytest backend/tests -q
npm run build --prefix extension
npm run lint --prefix extension
npm audit --prefix extension
```

The tests use temporary databases and meeting directories. For the real Chromium UI smoke test, install Python Playwright and its Chromium runtime, build the extension, ensure port 8000 is free, and run:

```powershell
python -m pip install playwright
python -m playwright install chromium
python scripts/ui_smoke.py
```

The script loads the actual built extension and an isolated local backend. It also checks failed-save rollback, rename dialogs, keyboard tabs, capture UI states, and automated accessibility using the development-only `axe-core` dependency. See [UI design and verification](docs/UI_DESIGN.md) for the shared design system and reload steps. It checks folder creation/move, search, saved action completion, detail/transcript, export, language settings, Spanish persistence, and mobile overflow. Optional real STT integration is described in [architecture and verification notes](docs/ENGINE_UPGRADE.md).

## Limits and next work

Live windows can split words at boundaries and miss rapid language switches within one window. Tab/microphone separation gives **Me / Others**, not identities for multiple remote speakers. Caption speaker names depend on the platform DOM. Multi-hour LLM context management, multilingual accuracy benchmarks on real meeting audio, true multi-speaker diarization, and live-call compatibility testing remain priorities. Successful extraction stages are retained even if another stage fails; the meeting is marked as needing attention and can be retried.

See [architecture decisions](docs/ENGINE_UPGRADE.md) for tradeoffs, privacy boundaries, and the exact verification scope.
