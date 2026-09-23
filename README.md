# WatchNT

A local-first meeting copilot: a Chromium extension, a FastAPI engine, SQLite, and local multilingual Whisper. No required subscription. Ollama keeps text processing local; Ollama Cloud, OpenAI, Anthropic (Claude), Gemini, Groq, OpenRouter, DeepSeek, Mistral, Together AI, Fireworks AI, Cerebras, and xAI (Grok) are optional BYOK text providers.

## What works

- Live tab audio with optional microphone capture, 8-second PCM windows, local Silero VAD, CPU int8 Whisper, and a live transcript preview.
- A separate captions mode for Meet, Zoom Web, and Teams Web. Enable the platform's captions first; DOM compatibility needs testing against your platform version.
- Local meeting library, folder filtering, transcript search, structured summaries, decisions, entities, timelines, email drafts, and meeting questions.
- Persistent action completion, including across regenerated AI output when task and owner match.
- English and Spanish UI with independent spoken-language selection. Auto STT detects language per window; manual override supports Whisper language codes.
- Explicit cloud-text consent. Audio has no cloud provider path. Email drafts can be exported; SMTP sending is disabled.

## Start with Docker (recommended)

Install and start Docker Desktop (Linux containers on Windows), then run from this repository:

```powershell
docker compose up
```

Compose builds the Chrome extension into `extension/dist`, starts a private Ollama service, initializes SQLite, downloads missing Whisper and Ollama models, and starts the API at `http://localhost:8000`. No host Python, Node, Ollama, API key, or separate model installation is required. The first run needs internet access and can take several minutes; follow the model progress in the backend logs. Wait for `Application startup complete` before connecting the extension. Later starts reuse cached models. Use `docker compose up -d` for background operation.

**One browser step remains:** open `chrome://extensions`, enable Developer mode, click **Load unpacked**, and select this repository's `extension/dist` folder. Docker cannot install a capture extension into your desktop browser. If it is already installed from this folder, click its Reload button after a rebuild. Pin WatchNT, open a meeting tab, and start capture from the toolbar popup. Grant microphone permission once if you want your own voice included.

Fresh installations use local multilingual Whisper `base` and Ollama `qwen3:1.7b` on CPU. Existing provider choices, model names, API keys, consent, and meetings are preserved. Existing Ollama endpoints on localhost or `host.docker.internal` at the default port are moved to the bundled service, which downloads the saved model if missing. Custom ports and cloud providers remain unchanged. `WATCHNT_DEFAULT_LLM_MODEL` can select a different default before the first startup; it does not overwrite saved settings. Model downloads contain weights only; meeting audio stays local.

Data persists in `data/` and `meetings/`; model caches persist in Docker volumes. Existing Docker data uses the same paths and Whisper volume. Native installations using `backend/watchnt.db` need their database and meeting files copied into those Docker data paths while the native backend is stopped; do not overwrite an existing Docker library. Stop any native backend on port 8000 before starting Compose.

```powershell
docker compose ps                       # Backend and Ollama should become healthy
docker compose logs -f backend          # Setup progress or actionable download errors
docker compose exec backend python tests/docker_smoke.py  # Tests the selected AI provider and local audio transport
docker compose down                     # Stop; keep meeting data and model caches
```

The extension container exiting with code 0 is expected: it exports the build and finishes. Plain `docker compose up` rebuilds changed application files automatically. To retry a failed download, run it again. To install a new model selected later in Settings, restart the backend with `docker compose restart backend`. Keep Docker running during capture and processing.

When local Ollama is selected, its model is loaded before the API starts and stays in memory while Docker is running. Large saved models can take several minutes to load on CPU. This prevents the initial Settings connection test from timing out during model loading. Stop the stack to release that memory.

## Cloud text providers

Run `docker compose up`, reload the extension, then open Settings. Choose a provider, enter a model ID available to your account and its API key, enable cloud text consent, and run **Test connections**. Each provider has a link to its models and setup documentation. Switching providers clears consent and the previous model selection. Saved keys are kept in the local backend and masked in API responses; audio transcription stays local. Selected transcript text is sent to the chosen cloud provider for summaries, chat, and drafts. Provider billing and model availability depend on your account.

Supported services: Ollama Cloud, OpenAI, Anthropic / Claude, Google Gemini, Groq, OpenRouter, DeepSeek, Mistral AI, Together AI, Fireworks AI, Cerebras, and xAI / Grok. Local Ollama remains the default. New services without a default model require an explicit model ID.

**Ollama Cloud:** create a key in your Ollama account and select **Ollama Cloud** in Settings. The backend calls `https://ollama.com/api/chat` directly. Use an API model ID such as `gemma4:31b`; `:cloud` aliases belong to local Ollama. Saved cloud selections skip local LLM downloading and warming on subsequent Docker starts. Local Whisper and the bundled Ollama service still run. See [Ollama Cloud setup](https://docs.ollama.com/cloud).

## Start locally without Docker

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

## Existing installations

The first backend startup adds missing language, consent, and cloud-provider key columns to SQLite settings, idempotently. No meeting-data migration is required. Existing cloud STT settings are forced local. Cloud LLM users must explicitly enable text consent once; their providers and keys are preserved. The API masks keys on read. Keys and data are stored locally, not encrypted at rest.

Keep your existing backend working directory/database location. The default database remains `backend/watchnt.db` when launched there; `DATABASE_URL` and `MEETINGS_DIR` can override storage locations. Stop the backend before backing up the SQLite database and meeting directory.

## Verification

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

`ui_smoke.py` loads the actual built extension and an isolated local backend. The onboarding and popup scripts use isolated browser storage and mocked backend responses, so Docker can remain running for those checks. It also checks failed-save rollback, rename dialogs, keyboard tabs, capture UI states, and automated accessibility using the development-only `axe-core` dependency. See [UI design and verification](docs/UI_DESIGN.md) for the shared design system and reload steps. It checks folder creation/move, search, saved action completion, detail/transcript, export, language settings, Spanish persistence, and mobile overflow. Optional real STT integration is described in [architecture and verification notes](docs/ENGINE_UPGRADE.md).

## Troubleshooting

### Popup opens as a thin strip or shows an old layout

After `docker compose up` rebuilds the extension, open `chrome://extensions` and click **Reload** on WatchNT. Confirm that its unpacked directory is this checkout's `extension/dist`. Close and reopen the toolbar popup. The popup now has an explicit 400 × 600 initial size, with a scrollable content area and visible header/footer. Reload after every extension rebuild; restarting Docker alone does not reload an installed browser extension.

### Processing failed, but the transcript exists

Open the meeting to read the saved transcript and each AI section's error. Choose the provider and an account-supported model in **Settings**, run **Test connections**, then return to the meeting and click **Retry**. Retrying a failed meeting reuses its transcript and completed AI sections; only unfinished sections are requested again. Retrying a completed meeting regenerates its AI output.

OpenRouter responses stream with a five-minute deadline per generation attempt. Connection failures and timeouts receive one retry; rate limits use bounded backoff. Repeated provider failures stop queued sections from repeating the same failed requests. Results are saved as each section finishes, and timeout errors include recovery instructions. These measures cannot guarantee that a busy or unavailable cloud model will respond. A provider's connection test and the Docker smoke test contact the selected model and may incur provider charges; neither sends meeting content.

If capture itself failed before upload, use **Settings > Recover partial transcript** before starting a new recording. If the error says no speech was captured, check meeting audio, microphone permission, or enabled captions for the selected capture mode.

## Limits and next work

Live windows can split words at boundaries and miss rapid language switches within one window. Tab/microphone separation gives **Me / Others**, not identities for multiple remote speakers. Caption speaker names depend on the platform DOM. Multi-hour LLM context management, multilingual accuracy benchmarks on real meeting audio, true multi-speaker diarization, and live-call compatibility testing remain priorities. Successful extraction stages are retained even if another stage fails; the meeting is marked as needing attention and can be retried.

See [architecture decisions](docs/ENGINE_UPGRADE.md) for tradeoffs, privacy boundaries, and the exact verification scope.
