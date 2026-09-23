# Operations and troubleshooting

[Back to README](../README.md)

## Service lifecycle

Run these commands from the repository root. On Windows, start Docker Desktop in Linux-container mode first.

```sh
docker compose up -d
docker compose ps
docker compose logs -f backend
docker compose down
```

The extension service builds `extension/dist` and exits successfully. The backend waits for that build and a healthy Ollama service. First startup downloads missing Whisper and local Ollama weights; later starts reuse cached models. Wait for `Application startup complete` in the backend log. Keep Docker running during capture and processing.

Plain `docker compose up` rebuilds application changes. Reload the installed extension after a rebuild. To install a local model selected later in Settings, run `docker compose restart backend`. A saved cloud selection skips local LLM downloading and warming; local Whisper and the bundled Ollama service remain available.

Local Ollama models are warmed before the API starts and remain in memory. Large models can take several minutes to load on CPU. Stop the stack to release that memory.

## Storage and configuration

| Setting or path | Purpose |
| --- | --- |
| `data/watchnt.db` | SQLite settings and meeting metadata in Docker |
| `meetings/` | Saved transcripts and generated artifacts in Docker |
| `whisper-cache` volume | Cached Whisper weights |
| `ollama-models` volume | Cached Ollama weights |
| `WATCHNT_DEFAULT_LLM_MODEL` | Initial local model for fresh Docker settings; default `qwen3:1.7b` |
| `DATABASE_URL` | Database location; Compose sets `sqlite:////app/data/watchnt.db` |
| `MEETINGS_DIR` | Artifact directory; Compose sets `/app/meetings` |

`docker compose down` keeps meeting data and model volumes. Adding `--volumes` discards model caches. Stop the backend before copying the database and meeting directory for backup.

## Existing installations

The first backend startup adds missing language, consent, and cloud-provider key columns to SQLite settings, idempotently. No meeting-data migration is required. Existing cloud STT settings are forced local. Cloud LLM users must explicitly enable text consent once; their providers and keys are preserved. The API masks keys on read. Keys and data are stored locally, not encrypted at rest.

Keep your existing backend working directory/database location. The default database remains `backend/watchnt.db` when launched there; `DATABASE_URL` and `MEETINGS_DIR` can override storage locations. Stop the backend before backing up the SQLite database and meeting directory.

Docker reuses the existing `data/`, `meetings/`, and named model volumes. To migrate a native installation, stop its backend and copy its SQLite database and meeting directory into the Docker paths above. Do not overwrite an existing Docker library. Stop any native service on port 8000 before starting Compose.

Existing provider choices, models, keys, consent, and meetings are retained. Saved default-port localhost Ollama endpoints are redirected to the bundled Ollama service. Custom ports are unchanged. `WATCHNT_DEFAULT_LLM_MODEL` applies only to fresh settings.

## Diagnostics

```sh
curl http://localhost:8000/health
docker compose exec backend python tests/docker_smoke.py
```

The smoke test checks HTTP health, local Whisper, the selected AI provider, and stereo PCM WebSocket transport. It does not change meetings or settings. Its model request contains a synthetic connection-test prompt and may incur provider charges.

## Troubleshooting

### Popup opens as a thin strip or shows an old layout

After `docker compose up` rebuilds the extension, open `chrome://extensions` and click **Reload** on WatchNT. Confirm that its unpacked directory is this checkout's `extension/dist`. Close and reopen the toolbar popup. The popup now has an explicit 400 × 600 initial size, with a scrollable content area and visible header/footer. Reload after every extension rebuild; restarting Docker alone does not reload an installed browser extension.

### Processing failed, but the transcript exists

Open the meeting to read the saved transcript and each AI section's error. Choose the provider and an account-supported model in **Settings**, run **Test connections**, then return to the meeting and click **Retry**. Retrying a failed meeting reuses its transcript and completed AI sections; only unfinished sections are requested again. Retrying a completed meeting regenerates its AI output.

OpenRouter responses stream with a five-minute deadline per generation attempt. Connection failures and timeouts receive one retry; rate limits use bounded backoff. Repeated provider failures stop queued sections from repeating the same failed requests. Results are saved as each section finishes, and timeout errors include recovery instructions. These measures cannot guarantee that a busy or unavailable cloud model will respond. A provider's connection test and the Docker smoke test contact the selected model and may incur provider charges; neither sends meeting content.

If capture itself failed before upload, use **Settings > Recover partial transcript** before starting a new recording. If the error says no speech was captured, check meeting audio, microphone permission, or enabled captions for the selected capture mode.
