# WatchNT upgrade decisions

## Audit findings and resulting architecture

The original recording action only toggled caption-observer storage state. The offscreen recorder was disconnected and posted audio to a missing upload route. Its WebSocket receiver tried to decode independent MediaRecorder fragments, synchronously, while recreating Whisper providers. Only Google Meet had a detector. Cloud STT adapters violated the requested audio boundary. The legacy summary/actions routes referenced missing service methods. The library's insights URL was wrong, action completion was transient, retry assumed an audio file, and several preference controls had no effect.

Keep the browser + FastAPI + SQLite hybrid. Native CPU inference is predictable without depending on WebGPU support or duplicating model caches in every browser context. SQLite and existing meeting artifacts remain compatible. The migration adds only settings columns; it does not copy or replace meeting data.

## Capture and inference

The toolbar action obtains a tab stream ID. A Manifest V3 offscreen document captures tab audio and optionally microphone audio; an AudioWorklet emits independently decodable 16 kHz float32 PCM. Two channels mean tab and microphone explicitly; generic uploaded stereo files are no longer mislabeled as separate speakers. Tab audio is routed back to the audio output so capturing does not mute the call. The worker brokers storage because [offscreen documents support only the runtime extension API](https://developer.chrome.com/docs/extensions/reference/api/offscreen). [Tab capture requires extension invocation](https://developer.chrome.com/docs/extensions/reference/api/tabCapture).

Windows are 8 seconds with a final-tail flush. The socket protocol validates rate, channel count, packet alignment, finiteness, origin, and a maximum 12-second payload. One in-flight request and at most 15 queued windows bound browser audio memory; overflow stops capture with a visible recovery message rather than silently losing time alignment. CPU work runs outside the FastAPI event loop and under a process-wide inference lock. A one-model cache avoids repeated model loads. A digital-silence gate precedes Silero VAD. Multi-worker backend deployment is not recommended for this laptop-oriented configuration.

Whisper **base multilingual**, CPU int8, is retained to avoid increasing the existing model footprint. Beam size 3 balances CPU work with decoding quality. [faster-whisper supports CPU quantization and integrated VAD](https://github.com/SYSTRAN/faster-whisper). This is a practical default, not a claim that base is the most accurate model on all languages. Larger multilingual weights can improve accuracy but cost more memory/download size and need explicit installation. [distil-large-v3 is an English-series checkpoint](https://huggingface.co/distil-whisper/distil-large-v3); it is not the multilingual default. Browser-native Whisper would add a second inference/runtime integration without demonstrated gains here. No GPU is required.

Auto detection runs independently per window and does not lock a whole multilingual meeting to its opening language. `task=transcribe` retains source language and `condition_on_previous_text=False` reduces propagated hallucinations. Language changes inside a window and speech cut at window boundaries remain limitations. Microphone echo cancellation is requested; headphones improve source separation. No embedding-based diarization model or biometric speaker identification is installed. Captions mode retains platform speaker labels when available.

## Text extraction and privacy

All five LLM adapters implement the formal `AIProvider` contract, with the original `LLMProvider` name retained as an alias. The provider factory rejects unknown providers and gates every cloud request on explicit saved consent. Ollama is restricted to loopback, with an explicit Docker-host exception. Audio has no cloud implementation; legacy cloud STT settings are forced local. Whisper loads cached model/tokenizer files only. There is no SMTP path: follow-up emails are local drafts/exports.

The pipeline extracts directly from multilingual source text and includes available timestamps. Prompts retain native names and evidence while asking for prose in the dominant meeting language and stable schema keys/enums. It does not translate and then extract. `TypeAdapter` validates both object and list contracts, including confidence/priority enums. Fenced JSON and prose surrounding a complete JSON value are accepted; truncated or schema-invalid output is retried up to twice with validation feedback against the original evidence. Invalid blocks remain explicit failures, while successful blocks and the transcript remain accessible. Transport retries are bounded and provider calls have deadlines.

The backend is a single-user local service, not a public multi-tenant server. Bind to loopback. Cloud extraction and meeting Q&A transmit text only after consent. No mandatory paid service is introduced. UI language preferences stay in extension storage. Keys are masked in API responses but stored unencrypted locally. File-system protection and encrypted disks remain the user's environment responsibility.

## UI decisions

The new UI uses shared Tailwind v4 tokens and layout/component rules: a 4-pixel spacing scale, restrained teal accents, clear surface contrast, generous reading space, focus-visible states, responsive navigation, and reduced-motion support. A quiet library, readable meeting sections, and visible next actions follow useful interaction principles of meeting-note tools without reproducing any vendor layout. Shadow DOM isolates the in-call controller from meeting-page styles.

English/Spanish resource dictionaries and react-i18next cover the new screens; spoken language is independent of UI language. No RTL interface language is shipped, but transcript and generated prose use automatic text direction, and most structural spacing uses logical properties. Errors from providers/backends are retained verbatim for diagnosis. Action-review decisions have a separate local file so regeneration does not erase completion for matching task/owner pairs.

## Verification performed

- 29 backend tests: existing routes, cloud STT rejection/legacy routing, explicit cloud consent, loopback enforcement, secret masking, malformed JSON/schema retries, failed-stage retention, invalid transcript uploads, stereo offsets/labels, socket origin/rate checks, action persistence, old SQLite settings migration, language validation, and disabled SMTP.
- TypeScript + Vite production build and oxlint pass. npm audit reports no vulnerabilities after compatible dependency updates.
- Real Chromium loaded the built extension against an isolated FastAPI process: folder create/move, title search, action completion across reloads, meeting details/transcript, JSON export, language override save, Spanish UI persistence, and 390-pixel layout without horizontal overflow.
- Locally synthesized English speech was transcribed on CPU, including the task owner, Friday deadline, and website decision. Silence produced no segments. The same sample passed **real Chromium AudioWorklet → PCM WebSocket → local Whisper** integration. This is a functional smoke test, not an accuracy benchmark.
- UI screenshots are in `artifacts/`. Run `scripts/ui_smoke.py` to regenerate them. To exercise real audio integration, supply `artifacts/speech-smoke.wav` with the documented English test sentence and set `WATCHNT_TEST_STT=1`. The base weights must already be cached. No test invokes a cloud LLM.

Not verified: a signed-in live Meet/Zoom/Teams call, Chrome toolbar tabCapture permission flow during an actual call, each provider's live API credentials/model, Docker execution on this host, and a real multilingual/code-switching corpus. These are the highest-priority acceptance checks. Heavy diarization and semantic chunk/reduce extraction for multi-hour meetings are follow-ups because they need memory/accuracy evaluation and careful evidence preservation.
