# WatchNT — Browser-First Architecture Blueprint

**A complete, production-oriented engineering reference for a backend-less, offline-first, privacy-first personal knowledge engine.**

*Single source of truth for building WatchNT from idea to production, while staying browser-native, open-source, lightweight, and free.*

---

## Table of Contents

0. Architecture v2 — What Changed and Why
1. Overall Architecture (capability layers + Pipeline Engine + Asset Manager)
2. Complete Workflow (Content Object model + event-driven pipeline)
3. Browser Technologies
4. Storage Architecture
5. AI Pipeline (AI Provider Layer + Prompt Registry)
6. User Interaction
7. Knowledge Retrieval Engine (Search)
8. Knowledge Graph
9. Obsidian Integration (Export Manager)
10. Plugin System
11. Project Structure
12. Technology Stack
13. Performance
14. Security
15. Development Roadmap
16. Future Vision (Memory Engine, AI Chat)
- Final Deliverables (diagrams, tables, estimates, risk analysis)

---

## A Note on Ground Truth (read this before the rest)

Three constraints below directly shape every later decision, so they're worth stating up front rather than discovering halfway through implementation:

1. **OPFS is now effectively universal.** Chrome, Firefox (111+), and Safari (15.2+) all support the Origin Private File System, including the synchronous `FileSystemSyncAccessHandle` API inside Web Workers — which is exactly what lets compiled C/C++ libraries (SQLite, whisper.cpp) treat OPFS like a real file descriptor. This is the foundation the whole storage layer rests on, and it works on mobile too.
2. **The *picker-based* File System Access API is still Chromium-only.** `showOpenFilePicker` / `showSaveFilePicker` / `showDirectoryPicker` — the APIs that let a page get a persistent handle to a folder on the user's real disk (e.g., an Obsidian vault) — work in Chrome/Edge/Opera, but Firefox has publicly rejected implementing them and Safari/iOS doesn't support them either. This means **live, two-way Obsidian vault sync is a Chromium-only feature**, and every other browser needs a download/import fallback. This single fact reshapes Section 9.
3. **WebGPU has crossed the line into "safe to build on."** It shipped by default in Chrome since 2023, Firefox 141+ on Windows since mid-2025, and Safari 26 (macOS Tahoe/iOS/iPadOS) since September 2025 — global coverage is now in the 70–85% range. Linux remains the laggard across every engine, and mobile GPU support is still uneven. WebGPU acceleration should be treated as a **progressive enhancement**, never a requirement.

These aren't side notes — they're load-bearing. Keep them in mind through Sections 3, 4, 9, and the compatibility matrix at the end.

---

## Section 0 — Architecture v2: What Changed and Why

This revision responds to an architecture review of v1. Five structural seams were added because they're cheap now and expensive to retrofit later; two proposed subsystems were deliberately **not** built out yet, with reasoning, so the decision is recorded instead of silently dropped.

**Adopted now:**
- The Worker Pool is no longer addressed directly by the UI. A **Pipeline Engine** sits between them: pipelines are composed of Steps, and each Step decides internally whether it runs on the main thread, a Web Worker, a Shared Worker, or WebGPU. The UI only ever sees "run this pipeline," never "talk to the STT worker." (Section 1.2)
- An **Asset Manager** now owns all download/version/checksum/cache/cleanup logic for models, prompts, templates, and plugin bundles, instead of each subsystem (STT, embeddings, LLM) managing its own downloads independently. (Section 1.3)
- An **AI Provider Layer** formalizes `generate / embed / transcribe / vision / ocr` as an interface, with WebLLM, Transformers.js, and any BYOK cloud service (OpenAI, Anthropic, Gemini, etc.) as interchangeable implementations. Nothing above this layer calls WebLLM directly anymore. (Section 5.1)
- A **Prompt Registry** replaces hardcoded prompt strings with versioned templates + variables — this was already implied by the existing AI-output cache key (`hash(content + prompt-template-version + model-id)`), now made explicit. (Section 5.3)
- A **Content Object model** (`Content` as a base type, with `Video / Audio / Meeting / Podcast / PDF / Article / Screenshot / VoiceMemo / Conversation` as subtypes) replaces the implicitly video-shaped workflow. The pipeline now operates on `Content → Pipeline → KnowledgeObject`, so adding PDFs or screenshots later means implementing one interface, not designing a second pipeline. (Section 2.1)
- The pipeline is now **event-driven** (`job.created → audio.ready → transcript.ready → chunks.ready → embeddings.ready → summary.ready → graph.updated → export.finished`) rather than steps calling each other directly, matching the MessageBus pattern already used elsewhere in this codebase family. (Section 2.2)
- **Export** is no longer a special-cased "Obsidian writer" — it's one `Exporter` implementation behind the same interface the Plugin System already used for third-party exporters (Section 10), so Notion/Logseq/PDF/HTML exporters are additive, not architectural changes. (Section 9)
- Top-level diagrams now name **capabilities** (Pipeline Engine, AI Provider Layer, Knowledge Engine) rather than specific libraries (WebLLM, SQLite); concrete library choices stay one level down, in implementation tables, so swapping a dependency later doesn't mean redrawing the architecture.

**Deliberately deferred, not forgotten:**
- A full **Memory Engine** (short-term / long-term / semantic / entity / relationship / conversation / media memory) is a research-scope undertaking — and notably overlaps with the memory-consolidation work already underway elsewhere in this project family. It's kept as a *named layer with an empty interface* in the Section 1 diagram so the seam exists, but the seven-part taxonomy is not implemented in v1–v2. It belongs in Future Vision (Section 16), built on top of the knowledge graph and vector store that already exist.
- **AI Chat** is not a new subsystem — `Chat → Retriever → Memory → Context Builder → LLM` is retrieval-augmented generation with a chat UI on top, and RAG is already specified in Sections 5 and 7. It's scheduled as a UI feature on top of existing retrieval (v2/v3 in the roadmap), not as new architecture.
- "Search" is reframed as one strategy inside a broader **Knowledge Retrieval Engine** (Section 7) conceptually, but no new retrieval strategies were invented beyond what Section 7 already specified under different names.

---

## Section 1 — Overall Architecture

### 1.1 — Capability Layers

WatchNT has no server tier. The browser tab *is* the application server, database, vector store, and file system. The top-level diagram is intentionally drawn in terms of **capabilities**, not libraries — a library swap (e.g. replacing WebLLM with a future runtime) should never require redrawing this diagram, only updating the implementation table one level down (Section 5.1, Section 12).

```
┌─────────────────────────────────────────────────────────────┐
│                            UI                                 │
└──────────────────────────────┬────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                          │
│           (routing, reactive stores, job intents)             │
└──────────────────────────────┬────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                     PIPELINE ENGINE                            │
│   event-driven steps; each step picks its own execution        │
│   context (main thread / worker / shared worker / WebGPU)      │
└──────────────────────────────┬────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI PROVIDER LAYER                             │
│      generate() · embed() · transcribe() · vision() · ocr()    │
│   (WebLLM / Transformers.js / BYOK cloud — interchangeable)    │
└──────────────────────────────┬────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE ENGINE                            │
│      Content → KnowledgeObject, entity graph, vector index      │
└───────┬─────────────────────────────────────────────┬─────────┘
        ▼                                               ▼
┌──────────────────────┐                    ┌─────────────────────────┐
│   MEMORY ENGINE        │                    │  RETRIEVAL ENGINE        │
│  (interface only for   │                    │  keyword/semantic/hybrid │
│   now — see Sec. 16)   │                    │  /graph (Section 7)      │
└──────────────────────┘                    └─────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  EXPORT & SYNC LAYER                           │
│       Exporter interface — Markdown/Obsidian today,             │
│       Notion/Logseq/PDF/HTML as additive plugins later          │
└──────────────────────────────┬────────────────────────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│              STORAGE LAYER  (SQLite WASM + OPFS)                │
└─────────────────────────────────────────────────────────────┘

         (Asset Manager and Plugin Host run alongside every
          layer above — see 1.3 and Section 10 — rather than
          sitting inside the vertical flow.)
```

The **Memory Engine** box is real in the diagram and empty in the implementation on purpose: it's the seam that lets the elaborate memory taxonomy from Section 16 get built later without moving anything else.

### 1.2 — Pipeline Engine: Execution Detail

The diagram above describes the *contract* ("pipelines are made of steps; steps pick their own execution context"). Today, in practice, that resolves to a worker pool:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          BROWSER TAB — MAIN THREAD                        │
│                                                                            │
│   ┌──────────────┐      ┌────────────────┐      ┌───────────────────┐    │
│   │   UI Layer    │◀───▶│  Pipeline       │◀───▶│  Reactive Stores   │    │
│   │ (SvelteKit +  │      │  Engine (event  │      │ (notes, jobs,      │    │
│   │  PWA shell)   │      │  bus + steps)   │      │  search results)   │    │
│   └──────┬───────┘      └───────┬────────┘      └─────────┬─────────┘    │
│          │                       │                          │            │
│          └───────────────────────┼──────────────────────────┘            │
│                                   │ Comlink (postMessage RPC)             │
└───────────────────────────────────┼───────────────────────────────────────┘
                                     ▼
        ┌─────────────────────────────────────────────────────────────┐
        │            STEP EXECUTORS  (chosen per-step, not fixed)       │
        │  sized to navigator.hardwareConcurrency, recycled per job      │
        │                                                                │
        │ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌─────────────┐ │
        │ │ STT Step    │ │Embed Step   │ │ LLM Step    │ │Graph Step   │ │
        │ │→ Worker:    │ │→ Worker:    │ │→ Worker:    │ │→ Worker:    │ │
        │ │ whisper.cpp │ │ Transformers│ │ AI Provider │ │entity +     │ │
        │ │   (WASM)    │ │.js (ONNX)   │ │ Layer call  │ │backlink     │ │
        │ └────────────┘ └────────────┘ └────────────┘ └─────────────┘ │
        │ ┌────────────┐ ┌────────────┐ ┌────────────────────────────┐ │
        │ │OCR Step     │ │Diarization  │ │  Export Step (→ Exporter   │ │
        │ │→ Tesseract  │ │Step         │ │  interface, Section 9)     │ │
        │ └────────────┘ └────────────┘ └────────────────────────────┘ │
        └────────────────────────────┬──────────────────────────────────┘
                                      ▼
        ┌─────────────────────────────────────────────────────────────┐
        │                         STORAGE LAYER                         │
        │ ┌───────────────┐ ┌────────────────┐ ┌───────────────────┐  │
        │ │     OPFS       │ │   IndexedDB     │ │  SQLite WASM       │  │
        │ │ media blobs,   │ │ key-value cache,│ │ (wa-sqlite, OPFS    │  │
        │ │ model weights, │ │ small metadata, │ │  VFS): notes, FTS5, │  │
        │ │ vector index   │ │ settings        │ │  graph edges        │  │
        │ └───────────────┘ └────────────────┘ └───────────────────┘  │
        └────────────────────────────┬──────────────────────────────────┘
                                      ▼
        ┌─────────────────────────────────────────────────────────────┐
        │  FILE SYSTEM ACCESS API (Chromium only — Obsidian vault)       │
        │  Fallback for Firefox/Safari: zip download / individual writes │
        └─────────────────────────────────────────────────────────────┘

  ┌────────────────────────────┐   ┌───────────────────────────────────┐
  │  SERVICE WORKER              │   │  PLUGIN HOST                       │
  │  PWA shell cache, offline     │   │  sandboxed Worker/iframe + RPC,    │
  │  start-up, model file caching│   │  capability-scoped permissions     │
  └────────────────────────────┘   └───────────────────────────────────┘
```

**Why this shape:** every CPU-heavy step runs off the main thread by construction, but *which* executor a step uses is the step's own decision, made via feature detection (`navigator.gpu`, device-tier checks) at run time — not a hardcoded assignment the UI has to know about. Components never call a worker, or even the Pipeline Engine's internals, directly: they dispatch intents to the Application Layer, which emits the corresponding event onto the pipeline's event bus, and steps subscribe to the events they care about (Section 2.2). Storage is still split by *access pattern*: OPFS for byte-oriented blobs that benefit from worker-side synchronous I/O, SQLite WASM for anything needing relational joins or full-text search, IndexedDB as a thin cache/settings layer.

### 1.3 — Asset Manager

Models, prompt templates, note templates, plugin bundles, and cached AI outputs are all, structurally, the same kind of thing: a versioned blob that was downloaded once and needs to be checked, cached, and eventually cleaned up. Rather than letting STT, embeddings, the LLM provider, and the plugin host each manage their own downloads, a single Asset Manager owns:

- **Downloads** — fetch + Cache API storage, with resumable/streamed download for large model files
- **Versioning** — every asset has a version string; a new prompt-template version or model release doesn't silently overwrite the old one mid-job
- **Checksums** — integrity verification after download, before first use
- **Cleanup** — storage-quota-aware eviction (oldest/least-used assets first) when OPFS/Cache Storage pressure is detected
- **Cache** — a single source of truth for "is this asset already on disk," so the STT step and the LLM step don't independently re-check or re-download the same thing

Every other subsystem (Section 5's AI Provider Layer, Section 10's Plugin Host, Section 9's Exporters) asks the Asset Manager for an asset by `(type, id, version)` rather than managing its own fetch/cache logic.

---

## Section 2 — Complete Workflow

### 2.1 — Content Object Model

Every importable thing — a YouTube video, a local audio file, a meeting recording, a podcast episode, and (later) a PDF, an article, a screenshot, or a voice memo — is a `Content` object first. Source-specific importers (Section 11's `packages/ingestion`) each know how to turn their input into a `Content` instance; everything downstream of that point is source-agnostic:

```
Content (base)
├── Video        (youtube | local file)
├── Audio
├── Meeting
├── Podcast
├── PDF            ← future, no new pipeline needed
├── Article         ← future
├── Screenshot       ← future
├── VoiceMemo
└── Conversation

Content → Pipeline → KnowledgeObject → Memory
```

A `KnowledgeObject` is what a `Content` becomes after the pipeline runs: transcript (if applicable), summary, insights, action items, entities, embeddings, and graph edges, all attached to the same `content_id`. This is the type that Storage, the Knowledge Graph, and the Retrieval Engine actually operate on — none of them need to know whether the original `Content` was a video or a PDF. Adding a new `Content` subtype later means writing one importer and, where relevant, one new pipeline step (e.g., OCR for PDFs/screenshots) — not a parallel architecture.

### 2.2 — Event-Driven Pipeline

Steps don't call each other directly; they publish and subscribe to events on the Pipeline Engine's event bus. The canonical event sequence for any `Content` object:

```
content.created → audio.ready → transcript.ready → chunks.ready
→ embeddings.ready → summary.ready → graph.updated → export.finished
```

A step doesn't need to know what produced the event it's reacting to, or what (if anything) reacts to its own output — which is what lets a future step (e.g., a flashcard generator subscribing to `summary.ready`) be added without touching the steps that already exist. The Application Layer also subscribes to every event purely for UI purposes (progress bars, live transcript updates), without being in the critical path of the pipeline itself.

### 2.3 — Concrete Walkthrough

The event sequence above, instantiated for a `Video` content object — what actually happens when a user drops in a 45-minute YouTube video:

```
1.  IMPORT                                          [emits: content.created]
    User pastes a YouTube URL or drags a local file onto the UI.
    → Application Layer creates a Content + Job record in SQLite WASM.

2.  SOURCE RESOLUTION
    YouTube: fetch the page's caption track directly (no server) if
    captions exist → skip straight to step 5 (cleaning).
    Local file / no captions: hand the file to the Audio Extraction step.

3.  AUDIO EXTRACTION                                [emits: audio.ready]
    ffmpeg.wasm (in a dedicated worker) demuxes the container and
    resamples audio to 16kHz mono PCM, streamed in ~30s windows so the
    whole file is never held in memory at once.

4.  SPEECH-TO-TEXT                                  [emits: transcript.ready]
    Each window is handed to the STT step (AI Provider Layer → whisper.cpp
    WASM, model size chosen by device-tier detection — see Section 13).
    Partial transcripts stream back to the UI as they complete; the user
    can start reading before the video finishes processing.

5.  CLEANING
    Filler-word stripping, punctuation restoration, and timestamp
    alignment run synchronously after STT (cheap, main-thread safe for
    small transcripts, worker-side for long ones).

6.  CHUNKING                                        [emits: chunks.ready]
    Transcript is split into token-aware, semantically coherent chunks
    (~300–500 tokens, sentence-boundary aware) for embedding and LLM
    context windows.

7.  EMBEDDINGS                                      [emits: embeddings.ready]
    Each chunk → AI Provider Layer's embed() → Transformers.js, quantized
    MiniLM/E5 → float32 vectors written to the OPFS-backed vector index,
    incrementally (not a full rebuild per video).

8.  SUMMARY + INSIGHTS + ACTION ITEMS                [emits: summary.ready]
    AI Provider Layer's generate() (WebLLM local model, or a BYOK cloud
    provider if configured) receives the full transcript (or a map-reduce
    of chunk summaries if it's too long for the context window) using a
    versioned template from the Prompt Registry, and returns structured
    JSON: summary, key insights, quotes, open questions, action items,
    and flashcard candidates. WebLLM's JSON-mode / xgrammar-backed
    structured generation is used here so the output is schema-valid
    without manual parsing.

9.  KNOWLEDGE GRAPH UPDATE                          [emits: graph.updated]
    The Graph step extracts entities (people, orgs, concepts) from the
    structured output, links them against existing graph nodes (exact
    match + embedding similarity for fuzzy dedup), and writes new
    edges to the SQLite graph tables — producing the `KnowledgeObject`.

10. STORAGE
    Final transcript → SQLite WASM (full text + FTS5 index).
    Media file → OPFS.
    Vectors → OPFS-backed index.
    AI outputs → IndexedDB, keyed by content hash + prompt-template
    version (so re-importing the same video, or re-running after a
    prompt edit, is instant and free when nothing actually changed).

11. SEARCH INDEX UPDATE
    FTS5 and the vector index are updated incrementally as part of
    step 10 — no separate "reindex" pass for normal use.

12. MARKDOWN GENERATION
    The Export step renders the note using the active template
    (frontmatter + body + backlinks) into a Markdown string, via the
    `Exporter` interface (Section 9) rather than a hardcoded writer.

13. OBSIDIAN EXPORT                                 [emits: export.finished]
    Chromium: written directly into the linked vault folder via a
    persisted directory handle.
    Firefox/Safari: queued for one-click download (single file or
    batched zip) since there's no persistent folder handle available.

14. UI UPDATE
    Reactive stores update; the new note appears in the library,
    search index, and graph view without a page reload.
```


---

## Section 3 — Browser Technologies

| API | Role in WatchNT | Notes |
|---|---|---|
| **IndexedDB** | Settings, small key-value cache, AI-output cache keyed by content hash | Cheap to write from the main thread; not used for anything large or relational |
| **OPFS** | Media blobs, model weight files, serialized vector index, SQLite's backing store | Near-universal support now (Chrome/Firefox 111+/Safari 15.2+), including the synchronous worker API that compiled code needs |
| **File System Access API** | User-visible import/export, persistent Obsidian vault folder handle | **Chromium-only.** Firefox has publicly rejected the picker APIs; Safari doesn't implement them. Must have a fallback path everywhere else |
| **Web Workers** | All heavy compute: STT, embeddings, LLM inference, diarization, OCR, graph extraction, export | One worker type per concern, pooled and recycled, never sharing a worker across unrelated jobs |
| **Shared Workers** | Single shared model instance across multiple open tabs of the app, cross-tab job coordination | Avoids loading the same multi-hundred-MB model twice if the user opens WatchNT in two tabs |
| **Service Workers** | PWA installability, app-shell caching for instant offline startup, caching downloaded model weights | Combined with the Cache API; this is what makes "close laptop lid, reopen offline, app still works" possible |
| **WebGPU** | Optional acceleration for embeddings, STT, and LLM inference via ONNX Runtime Web / WebLLM | Progressive enhancement only — detect via `navigator.gpu`, always have a WASM/CPU fallback path |
| **WebAssembly** | whisper.cpp, ffmpeg.wasm, wa-sqlite, ONNX Runtime Web, Tesseract.js | The actual computational substrate of the app — almost nothing here is "pure JS" |
| **Streams API** | Streaming file reads (large media files), streaming token output from the LLM worker, chunked audio processing | Keeps memory flat regardless of source file size and lets the UI show partial output immediately |
| **Cache API** | Model weight caching (avoid re-downloading a 200MB+ model every session), static asset caching | Paired with the Service Worker; checked before any model download is triggered |
| **BroadcastChannel** | Cross-tab notification ("a new note was just created in another tab, refresh your view") | Lightweight pub/sub, no need for a Shared Worker just for this |
| **Background Sync** | Deferred Obsidian export / BYOK sync retries when the tab is backgrounded or network briefly drops | Genuinely optional — WatchNT is offline-first by default, so this mostly matters for cloud BYOK calls |
| **Clipboard API** | One-click "copy as Markdown" for a note or selection | Simple, but a frequently-used escape hatch on browsers without folder access |

---

## Section 4 — Storage Architecture

**Where everything lives, and why:**

- **Transcripts** → SQLite WASM (full text in a table + an FTS5 virtual table for keyword search). Relational storage means a transcript can be joined against its notes, tags, and graph entities without denormalizing everything into IndexedDB.
- **Embeddings** → A serialized vector index (HNSW or flat, depending on corpus size — see below) stored as a single OPFS file, loaded into worker memory on demand and rebuilt incrementally as new chunks arrive.
- **Media files** (audio/video originals) → Raw bytes in OPFS, addressed by content hash so duplicate imports are detected for free.
- **Generated Markdown** → Not persisted as a separate artifact by default; rendered on-demand from the structured note record in SQLite, then either written to OPFS as a cached copy or pushed straight to the Obsidian vault/download. This avoids a "Markdown drifted out of sync with the source data" failure mode.
- **Settings** (theme, model choice, BYOK keys [encrypted], vault folder handle reference) → IndexedDB key-value.
- **Cached AI outputs** (summaries, insights, embeddings) → IndexedDB, keyed by `hash(content + prompt-template-version + model-id)`. This is the single highest-leverage cache in the whole app: re-importing the same video, or regenerating notes after a template tweak, should never recompute work it's already done.

**Why SQLite WASM over raw IndexedDB for the relational data:** IndexedDB is a decent object store but a poor query engine — no joins, no full-text search without hand-rolling an inverted index, no easy "find all notes mentioning entity X created in March." `wa-sqlite` running on the OPFS VFS gives real SQL, FTS5 for keyword search, and a battle-tested storage engine, at the cost of a ~1-2MB WASM binary and a slightly more involved worker setup (writes must happen in a worker due to the synchronous OPFS access handle requirement).

**Vector store sizing strategy:** below roughly 5,000–10,000 chunks, brute-force cosine similarity over the flat embedding array (SIMD-accelerated in WASM) is fast enough that an approximate index isn't worth the complexity. Past that, swap to an HNSW index (a lightweight WASM build such as `hnswlib-wasm`, or a hand-rolled minimal HNSW if the dependency proves too heavy/unmaintained at implementation time) persisted to OPFS and rebuilt incrementally. This threshold-based swap should be a config value, not a hardcoded assumption, since "how many hours of content has this user imported" varies wildly.

---

## Section 5 — AI Pipeline

### 5.1 — AI Provider Layer

Nothing in the pipeline calls WebLLM, Transformers.js, or a cloud API directly. Every AI-capable step calls a shared interface:

```typescript
interface AIProvider {
  generate(prompt: PromptInstance, opts?: GenOpts): AsyncIterable<string>;
  embed(text: string | string[]): Promise<Float32Array[]>;
  transcribe(audio: AudioChunk): AsyncIterable<TranscriptSegment>;
  vision(image: ImageData, task: VisionTask): Promise<VisionResult>;
  ocr(image: ImageData): Promise<string>;
}
```

| Provider | Implements | Notes |
|---|---|---|
| `WebLLMProvider` | `generate`, `embed` (via a loaded embedding model) | Default local LLM provider; JSON-mode/function-calling via `xgrammar` |
| `TransformersProvider` | `embed`, `transcribe`, `ocr` | Default for embeddings/STT/OCR-class tasks |
| `OpenAIProvider` / `AnthropicProvider` / `GeminiProvider` | `generate`, `vision` | BYOK cloud providers — opt-in, keys encrypted at rest (Section 14), never required |
| `OllamaProvider` / `LMStudioProvider` / `JanProvider` | `generate`, `embed` | Calls a local server the user is already running on `localhost`. **Caveat**: this is a genuinely different trust boundary than in-browser inference — it's a real network request, and browsers are increasingly restricting page-to-local-network fetches (Private Network Access). Treat this provider family as "advanced/opt-in," with clear messaging that it requires the user's local server to allow CORS from the WatchNT origin, rather than assuming it Just Works the way the fully-sandboxed providers do |

Swapping or adding a provider means writing one class against this interface — nothing in the Pipeline Engine, Prompt Registry, or Asset Manager needs to change. This is also what makes BYOK a first-class concept instead of a special case: a BYOK key is just configuration for which `AIProvider` implementation a given step is bound to.

### 5.2 — Implementation Choices per Task

For each task: a primary choice, an alternative, and why — i.e., which concrete `AIProvider` implementation backs each step by default today.

| Task | Primary | Alternative | Why the primary wins |
|---|---|---|---|
| **Speech-to-text** | whisper.cpp compiled to WASM (tiny/base/small, quantized) | Transformers.js Whisper (ONNX backend) | whisper.cpp's WASM build is smaller, faster on CPU, and has lower memory overhead — important on 8GB machines. Transformers.js is the fallback when WebGPU is available and a slightly higher-quality ONNX path is worth the extra weight |
| **OCR** | Tesseract.js (WASM) | ONNX Runtime Web running a lightweight OCR model | Tesseract.js is the most mature, actively maintained browser OCR option with no GPU dependency — fits "no GPU required" |
| **Speaker diarization** | Lightweight ONNX speaker-embedding model + simple clustering in JS | Heuristic pause/energy-based segmentation | Real diarization where a model is loaded and the device can afford it; degrade gracefully to heuristic segmentation on weak hardware rather than skipping speaker separation entirely |
| **Embeddings** | Transformers.js with a quantized small embedding model (MiniLM/E5-small class) | WebLLM-hosted embedding model | Dedicated embedding models are smaller and faster than repurposing a chat LLM, and Transformers.js's ONNX backend has the most mature WebGPU + WASM dual path |
| **Summarization** | WebLLM running a small quantized instruct model (1.5B–3B class) | BYOK cloud call (user's own key) | Keeps the default fully offline and free; BYOK is offered as a strict quality upgrade, never a requirement |
| **Structured extraction** (insights, action items, flashcards) | Same local LLM, using WebLLM's JSON-mode / grammar-constrained generation | BYOK cloud with function-calling/structured outputs | Schema-valid output without brittle regex parsing of free text |
| **Knowledge graph extraction** | Local LLM entity/relation extraction (prompted) + co-occurrence heuristics | BYOK cloud for higher-recall entity linking | Co-occurrence is a free, always-available fallback when no model is loaded yet |
| **Semantic search / RAG** | Local vector store + local LLM for answer synthesis | Local retrieval + BYOK cloud LLM for the answer step only | Keeps retrieval (the privacy-sensitive part) always local; only the generation step is ever allowed to leave the device, and only if the user opted in |
| **Question answering** | Same RAG pipeline as semantic search | — | No separate system needed |

**On the underlying runtimes:**
- **Transformers.js** — the most actively maintained browser ML library for embeddings/STT/OCR-class tasks, ONNX-backed, automatic WebGPU/WASM backend selection.
- **ONNX Runtime Web** — the execution engine under Transformers.js; relevant directly if a custom-exported model needs to run outside the Transformers.js pipeline abstractions.
- **WebLLM** — actively maintained (MLC-AI), OpenAI-API-compatible, supports streaming, JSON-mode structured generation (via `xgrammar`), and function calling — exactly the feature set needed for the structured-extraction stage. WebGPU is its primary acceleration path.
- **llama.cpp via WASM** — a viable alternative to WebLLM for CPU-only environments where WebGPU isn't available at all (e.g., Linux desktop today); worth keeping as a fallback inference path rather than the default.
- **whisper.cpp** — the STT backbone; small, fast, no GPU dependency.
- **MediaPipe** — useful if/when WatchNT adds webcam-based features (e.g., live meeting face/gesture cues) in the Future Vision phase; not load-bearing for the MVP pipeline.
- **WebGPU acceleration** — applied wherever the runtime supports it (Transformers.js, WebLLM, onnxruntime-web), always behind a `navigator.gpu` feature check with a working CPU/WASM fallback, never assumed.

### 5.3 — Prompt Registry

Every prompt sent to an `AIProvider.generate()` call comes from the Prompt Registry, not a hardcoded string in the calling step:

```
Prompt Registry
 ├── Templates    (summary, podcast, meeting, lecture, flashcard,
 │                 knowledge-graph-extraction, question-generation, ...)
 ├── Variables    (transcript, prior_context, user_preferences, ...)
 └── Versioning   (each template has a version string)
```

This was already implicitly assumed by the AI-output cache key in Section 4 (`hash(content + prompt-template-version + model-id)`) — the registry just makes the "prompt-template-version" part a real, addressable thing instead of an informal convention. Practically, this means: editing the meeting-notes prompt to phrase action items differently bumps its version, old cached outputs stay valid (they're keyed to the old version), and re-running notes against the new version is a deliberate user action, not something that happens silently because a string in the codebase changed.


---

## Section 6 — User Interaction

**Onboarding.** First launch explains the offline/privacy model in one screen (no account, no sign-up, data stays on this device), then offers a single choice: "use the bundled small model now" or "download a better model" (with size/RAM shown up front). No forced setup wizard beyond that.

**Importing.** Three entry points, all converging on the same Job pipeline: drag-and-drop a file anywhere in the app, paste a URL (YouTube/podcast RSS), or use the file picker. A persistent "drop zone is always active" affordance means there's never a dedicated "import screen" to navigate to.

**Progress.** Each import shows a per-stage progress bar (extracting → transcribing → embedding → generating insights → indexing) with a cancel button that actually tears down the worker job, not just hides the UI. Long imports can be backgrounded — the user can keep using the app while a video processes.

**Transcript editing.** The raw transcript is shown inline, time-stamped, and directly editable; edits re-trigger only the downstream stages that depend on text (re-chunk → re-embed the changed chunks → optionally regenerate AI outputs), never a full reprocess.

**AI generation.** A single "Generate notes" action streams results into the UI section by section as they complete (summary appears first, then insights, then action items) rather than blocking on the whole structured-output call.

**Search.** A single omnibox-style search bar that runs hybrid search by default, with inline filters (by speaker, by date range, by source type) rather than a separate advanced-search page.

**Linking notes.** `[[wiki-link]]` autocomplete while editing, plus automatic "related notes" suggestions surfaced from the embedding similarity index.

**Exporting.** Per-note "export as Markdown" (single file) and a global "sync to Obsidian vault" toggle once a vault folder is linked.

**Obsidian sync.** On Chromium: link a vault folder once, and every new note writes there automatically, with a small status indicator. On Firefox/Safari: a "download to import into your vault" flow (zip of new/changed notes) since persistent folder access isn't available — the user is told this plainly rather than the feature silently degrading.

---

## Section 7 — Knowledge Retrieval Engine (Search)

"Search" is one retrieval strategy, not the whole capability — the modes below are all strategies a single Knowledge Retrieval Engine can route between or combine, which matters once a future AI Chat feature (Section 16) needs the same retrieval logic behind a different UI:

| Strategy | How it works |
|---|---|
| **Keyword** | SQLite FTS5 over transcript + note text |
| **Semantic** | Cosine similarity against the OPFS-backed vector index (brute-force or HNSW depending on corpus size) |
| **Hybrid** | Keyword and semantic result lists fused with Reciprocal Rank Fusion (RRF), so a result that ranks well on either axis surfaces near the top without needing a tuned weighted blend |
| **Entity** | Direct lookup against the knowledge-graph node table, returning every note that references the entity |
| **Time** | Range filter on transcript/note timestamps, composable with any other strategy |
| **Speaker** | Filter by diarized speaker label, composable with keyword/semantic queries |
| **Media** | Filter by source type, filename, duration — metadata-only, no content scan needed |
| **Graph** | Traversal from a starting note outward N hops, surfacing connected notes even without shared keywords |

**Ranking** combines RRF-fused relevance with a recency boost and a small boost for user-pinned notes; these are simple linear adjustments on top of the fused score, not a separate learned ranker — there's no training signal to justify one in a single-user local app.

**Vector search at scale**: flat brute-force cosine (WASM SIMD) handles small-to-medium corpora (roughly under 5–10k chunks) without an index at all. Past that, an HNSW index persisted to OPFS and updated incrementally avoids the linear-scan cost growing with the user's whole history.

**On "Retrieval Engine" vs. inventing new strategies**: the renaming is deliberate (search-bar search and a future chat-style query are the same retrieval call with a different UI on top), but every strategy above already existed under the original "Search" framing — nothing new was added just to fill out the rename. A future AI Chat feature (Section 16) is built by adding a `Context Builder` step on top of these same strategies, not a second retrieval system.

---

## Section 8 — Knowledge Graph

**Entity extraction** happens two ways simultaneously: the local LLM extracts named entities (people, organizations, concepts, topics) as part of the structured-output step in the main pipeline, and a cheap co-occurrence pass (shared capitalized terms, shared tags) runs as an always-available fallback when no model is loaded.

**Connecting notes** happens through three signals: explicit `[[wiki-links]]` the user writes, shared entities/tags extracted automatically, and "semantically similar" edges created when two chunks' embeddings exceed a similarity threshold. Each edge type is tagged in storage so the UI (and Obsidian's own graph view) can distinguish "I linked this on purpose" from "the system thinks these are related."

**Backlinks** are generated by reverse-indexing link targets in a SQLite table (`note_id`, `linked_from_note_id`, `link_type`) rather than scanning Markdown at render time — this keeps backlink lookups O(1)-ish regardless of vault size.

**Obsidian graph benefit**: because every exported note uses native `[[wikilink]]` syntax and YAML frontmatter tags, Obsidian's built-in graph view inherits WatchNT's structure automatically — no Obsidian plugin required on the Obsidian side. WatchNT's own in-app graph view is a bonus, not a dependency.

---

## Section 9 — Obsidian Integration

### 9.1 — Export Manager

Obsidian export is not a special-cased writer — it's one implementation of the same `Exporter` interface the Plugin System (Section 10) already exposes to third parties:

```typescript
interface Exporter {
  export(note: KnowledgeObject, dest: ExportDestination): Promise<void>;
}
```

| Exporter | Status |
|---|---|
| `MarkdownExporter` | Built-in, v1 |
| `ObsidianExporter` | Built-in, v1 (extends `MarkdownExporter` with vault-aware paths/frontmatter) |
| `NotionExporter`, `LogseqExporter`, `CapacitiesExporter`, `AnyTypeExporter` | Additive plugins, not roadmap items requiring core changes |
| `JSONExporter`, `PDFExporter`, `HTMLExporter` | Additive plugins |

Because the built-in exporters use the same interface as third-party ones, "export to Notion" later is a plugin someone (possibly not even the core maintainer) writes against a stable interface — not a reason to touch the Pipeline Engine or Storage Layer.

### 9.2 — Obsidian Export Detail

**Markdown generation.** Each note renders from a template with YAML frontmatter:

```yaml
---
title: "Q2 Planning Sync"
date: 2026-06-12
source: meeting
duration: "00:42:15"
tags: [planning, q2, product]
type: watchnt-note
---
```

**Folder structure** (configurable, sensible default):

```
WatchNT/
├── Videos/2026/06/
├── Podcasts/2026/06/
├── Meetings/2026/06/
├── Flashcards/
└── _attachments/
```

**Tags** are derived automatically from extracted topics/entities, written as native Obsidian frontmatter tags (`#tag` compatible).

**Backlinks** use standard `[[Note Title]]` syntax so Obsidian's link resolution and graph view work without any plugin.

**Attachments/images** (e.g., a frame grab referenced by a note) live in `_attachments/`, linked with standard `![](...)` Markdown.

**Templates** are user-editable Markdown templates with placeholder tokens (`{{summary}}`, `{{action_items}}`, etc.), sourced from the same Asset Manager (Section 1.3) that manages every other versioned asset, not hardcoded.

**Daily Notes compatibility** — optional setting to append a one-line backlink to the current Daily Note when a new note is created, matching Obsidian's Daily Notes plugin convention.

**The hard constraint, restated**: this entire "write straight into a live vault folder" experience only works in Chromium browsers, because only they implement the persistent directory-handle picker. Firefox and Safari users get the same Markdown, frontmatter, and folder structure, just delivered as a download (single file or batched zip) for manual drop into their vault. This should be communicated in the UI, not discovered as a bug.

---

## Section 10 — Plugin System

Plugins run in an isolated **Worker** (or a sandboxed iframe for anything needing DOM access, e.g., a custom note-rendering plugin), communicating with the host exclusively through a mediated `postMessage`/Comlink-style RPC layer. There is no path for plugin code to touch IndexedDB, OPFS, or the network directly.

**Plugin manifest** declares capabilities up front:
```json
{
  "name": "notion-exporter",
  "permissions": ["storage:read:notes", "network:user-approved-only"],
  "type": "exporter"
}
```

**Supported plugin types**: AI providers (implement the `AIProvider` interface from Section 5.1), exporters (implement the `Exporter` interface from Section 9.1), importers (new `Content` subtypes/sources beyond video/audio/YouTube — Section 2.1), prompt templates (registered into the Prompt Registry, Section 5.3), retrieval strategies (Section 7), and note generators (custom structured-output shapes). Every plugin type extends an interface that already exists for a built-in implementation — there is no plugin category that requires inventing a new core abstraction just to support it.

**Privacy is preserved structurally, not by trust**: a plugin that doesn't declare `network` permission cannot make a network call — the host's RPC layer simply doesn't expose `fetch` to plugins that haven't been granted it, and even granted network access is per-plugin and revocable, not a blanket app-wide setting.

---

## Section 11 — Project Structure

```
watchnt/
├── apps/
│   └── web/                          # SvelteKit PWA shell
│       ├── src/
│       │   ├── routes/                # /import /library /note/[id] /search /settings /graph
│       │   ├── lib/
│       │   │   ├── stores/            # reactive app state (jobs, notes, search results)
│       │   │   ├── components/        # UI components
│       │   │   └── pipeline-bridge/   # Comlink wrappers around the Pipeline Engine
│       │   └── service-worker.ts
│       ├── static/
│       └── vite.config.ts
│
├── packages/
│   ├── ui/                           # shared design-system components
│   ├── pipeline/                     # Pipeline Engine: event bus, step registry,
│   │   │                             #   per-step execution-context resolution
│   │   ├── events.ts                 # content.created / audio.ready / transcript.ready / ...
│   │   └── steps/                    # step definitions (import/extract/stt/chunk/embed/
│   │                                 #   summarize/graph/export), each step picks its executor
│   ├── assets/                       # Asset Manager: downloads, versioning, checksums,
│   │                                 #   cleanup, cache — for models/prompts/templates/plugins
│   ├── ai/
│   │   ├── providers/                # AIProvider interface + implementations:
│   │   │                             #   webllm.ts, transformers.ts, openai.ts, anthropic.ts,
│   │   │                             #   gemini.ts, ollama.ts, lmstudio.ts, jan.ts
│   │   ├── prompts/                  # Prompt Registry: templates, variables, versioning
│   │   ├── stt/                      # whisper.cpp wasm wrapper (consumes providers/)
│   │   ├── embeddings/               # embedding pipeline (consumes providers/)
│   │   ├── diarization/              # speaker clustering
│   │   └── ocr/                      # tesseract.js wrapper
│   ├── storage/
│   │   ├── opfs/                     # OPFS file manager (media, model weights, vector index)
│   │   ├── sqlite/                   # wa-sqlite schema, migrations, FTS5 setup
│   │   └── cache/                    # content-hash + prompt-version AI-output cache
│   ├── retrieval/                    # Knowledge Retrieval Engine (formerly "search")
│   │   ├── keyword/                  # FTS5 query builder
│   │   ├── vector/                   # HNSW/flat index manager
│   │   └── hybrid/                   # RRF fusion ranker
│   ├── ingestion/                    # Content importers — one per Content subtype
│   │   ├── youtube/                  # caption/transcript extraction
│   │   ├── file/                     # local file import (File System Access API)
│   │   └── audio-extract/            # ffmpeg.wasm audio extraction
│   ├── graph/
│   │   ├── entities/                 # entity extraction
│   │   └── backlinks/                # backlink indexer
│   ├── export/                       # Export Manager
│   │   ├── exporter-interface.ts     # Exporter interface (Section 9.1)
│   │   ├── markdown/                 # MarkdownExporter, ObsidianExporter
│   │   └── templates/                # note templates (managed via packages/assets)
│   ├── plugins/
│   │   ├── host/                     # sandbox + RPC host
│   │   └── sdk/                      # plugin developer SDK + types (Provider/Exporter/
│   │                                 #   Importer/PromptTemplate/RetrievalStrategy interfaces)
│   ├── workers/
│   │   └── pool.ts                   # worker pool manager (used by packages/pipeline)
│   └── shared/
│       ├── types/                    # Content, KnowledgeObject, and other shared types
│       └── config/
│
├── public/
├── models/                           # bundled small default models (tiny STT, small embedder)
├── docs/
└── tests/
    ├── unit/                         # Vitest
    └── e2e/                          # Playwright (real-browser OPFS/Worker behavior)
```


---

## Section 12 — Technology Stack

**Single recommended stack:**

| Layer | Choice | Why it wins (per the Decision Rules) |
|---|---|---|
| Framework | **SvelteKit + Vite** | Smaller runtime, no virtual-DOM diffing overhead, built-in reactive stores — directly serves the "low RAM/low CPU" priority over React's larger baseline footprint |
| State management | Native Svelte stores | Zero extra dependency; stores compose cleanly with worker-streamed partial results |
| UI library | Tailwind CSS + headless primitives (bits-ui/melt-ui) | Unstyled, accessible, minimal bundle weight vs. a full component library |
| Markdown renderer | micromark + remark plugins | Small, AST-based, easy to extend with custom remark plugins for wikilinks/frontmatter |
| AI runtime | Transformers.js + WebLLM + ONNX Runtime Web (underlying engine) | Covered in Section 5 |
| Storage | wa-sqlite (OPFS VFS) + raw OPFS for blobs | Real SQL/FTS5 without a server, near-universal OPFS support |
| Vector DB | hnswlib-wasm (or hand-rolled flat/HNSW) on OPFS | Lightweight, no server, scales via the threshold strategy in Section 4 |
| Search | SQLite FTS5 + vector index + RRF fusion | Hybrid relevance without a learned ranker |
| Build tool | Vite | Fast, first-class Worker/WASM asset handling |
| PWA framework | vite-plugin-pwa (Workbox under the hood) | Mature, well-maintained, handles app-shell + model-weight caching |
| Testing | Vitest (unit) + Playwright (e2e) | Worker/OPFS behavior genuinely needs a real browser context, which Playwright provides and jsdom doesn't |

**Why SvelteKit over React+Vite specifically**: most browser-ML example code (Transformers.js, WebLLM) ships framework-agnostic JS, so there's no ecosystem lock-in either way — the deciding factor is the framework's own runtime cost on an 8GB target machine, where Svelte's compiled-away reactivity has a real, measurable edge over a virtual-DOM diff cycle running alongside multiple active workers.

---

## Section 13 — Performance

- **Streaming inference**: STT and LLM output both stream token-by-token/chunk-by-chunk into the UI rather than blocking until the full result is ready.
- **Lazy model loading**: nothing downloads until the feature is first used — STT model loads on first import, LLM loads on first "generate notes" click, never both at app boot.
- **Chunked processing**: audio is processed in ~30s windows, never loaded whole into memory, so a 3-hour podcast costs the same peak memory as a 3-minute clip.
- **Background workers**: every heavy task is off the main thread by construction, not by convention.
- **Caching**: content-hash-keyed AI output cache (Section 4) means re-processing identical content is a cache hit, not a recomputation.
- **Incremental indexing**: FTS5 and the vector index update per-chunk as content arrives, never a full rebuild on each import.
- **Memory optimization**: quantized (int4/int8) models throughout, streamed file reads, and workers are terminated/recycled after each job rather than left holding memory indefinitely.
- **Parallel execution**: STT and embedding can pipeline per-chunk (embed chunk N while transcribing chunk N+1); diarization can run concurrently with STT given separate workers.
- **Model switching**: device-tier detection (`navigator.deviceMemory`, `navigator.hardwareConcurrency`, `navigator.gpu` presence) picks tiny/base/small model variants automatically, with a manual override in settings.
- **Cold start optimization**: the app shell is service-worker-precached so the UI appears instantly even offline; only the in-progress job's specific model needs a network round-trip, and only once (cached after).

---

## Section 14 — Security

- **Sandboxing**: every heavy-compute task runs in its own Worker with no DOM access; plugins run in an additionally restricted Worker/iframe with a capability-gated RPC surface (Section 10).
- **Plugin isolation**: manifest-declared permissions, no implicit `fetch`/storage access, no `eval` of plugin code outside its own isolated context.
- **Encrypted API keys**: BYOK keys are encrypted at rest using the Web Crypto API (AES-GCM) with a key derived from a user passphrase, or — when wrapped in Tauri/Electron — handed off to the OS-level credential store instead of browser storage. Keys are sent directly from the browser to the provider's own endpoint and never touch any WatchNT-controlled server, because there isn't one.
- **Permission model**: File System Access API directory handles require an explicit, per-origin user grant, re-confirmed according to each browser's own permission-persistence rules — WatchNT can't silently regain folder access after the browser revokes it.
- **Offline mode** is the default state, not a fallback — no network call happens unless the user explicitly triggers a model download or a BYOK cloud request.
- **Secure local storage**: OPFS and IndexedDB are both strictly origin-scoped — no other site, and no other app, can read WatchNT's data.
- **Export security**: exported Markdown is scanned for accidental secret leakage (e.g., a pasted API key inside a transcript) before write, with a warning rather than a silent export.
- **Deletion**: a single "erase all my data" action clears IndexedDB, OPFS, and Cache Storage for the origin — genuinely complete, not a soft-delete flag.
- **Data ownership**: everything that exists, exists as files the user can inspect, export, or delete at any time, on their own machine — there is no server-side copy to ever worry about, because none exists.

---

## Section 15 — Development Roadmap

| Milestone | Scope | Rough complexity (solo dev) |
|---|---|---|
| **MVP** | Single-source import (YouTube captions + local file), whisper.cpp WASM STT, basic chunking, one summarization template, IndexedDB + basic SQLite storage, keyword search, Markdown export | Medium–High, ~3–5 weeks |
| **v1** | Multi-source import (audio/video files, podcast URLs), embeddings + semantic search, full OPFS migration for media, SQLite WASM + FTS5, Obsidian export with frontmatter/folder structure (Chromium), basic PWA installability | High, ~4–6 weeks |
| **v2** | Knowledge graph (entity extraction + backlinks), flashcard generation, plugin system v1 (importers/exporters only), WebGPU acceleration toggle, BYOK cloud fallback | High, ~5–7 weeks |
| **v3** | Full plugin system (model providers, search providers, custom note generators), speaker diarization, hybrid search with RRF, two-way Obsidian vault awareness, optional Electron/Tauri wrapper for non-Chromium folder access | Very High, ~6–8 weeks |
| **Future** | Live meeting assistant, multimodal memory (PDFs/images via OCR/screen recordings), local AI agents, voice interface, optional cross-device sync | Research-grade, open-ended |

These are planning-level estimates for a single experienced developer working roughly full-time on each milestone, not a guarantee — the LLM-integration and storage-layer milestones (v1, v2) are where solo timelines most often slip, since they involve the most genuinely new (to most web devs) WASM/Worker plumbing.

---

## Section 16 — Future Vision

- **Continuous knowledge graph**: background entity linking runs across the *whole* note history, not just newly imported content, so older notes retroactively gain connections as the graph grows.
- **Multimodal memory**: PDFs and images (via OCR) and screen recordings feed the same pipeline as video/audio, becoming one unified, searchable memory rather than separate silos.
- **Live meeting assistant**: real-time transcription and live insight surfacing during calls, using `getDisplayMedia`/tab-capture instead of post-hoc file import.
- **Browser extension companion**: capture context from any site the user is on, not just a dedicated import flow inside the WatchNT tab.
- **Cross-device sync (strictly optional)**: end-to-end-encrypted sync against a backend the *user* supplies (their own WebDAV/S3/etc.) — never a WatchNT-run service, preserving the "no vendor lock-in" principle even as a multi-device story matures.
- **Local AI agents**: an on-device agent that can query the knowledge graph and take local actions (draft a follow-up note, set a reminder) — still entirely on-device, no new privacy surface.
- **Voice interface**: hands-free recall ("what did I learn about X last month?") via Web Speech API or the same local STT stack already in place.
- **Contextual recall**: proactively surfacing relevant past notes based on the user's current activity — a lightweight "memory palace" overlay rather than a separate search step.
- **Lifelong memory**: the long-term destination — a permanent, fully local, exportable-forever personal knowledge graph that spans years and stays entirely under the user's control.


---

## Final Deliverables

### 1. Complete Browser Architecture Diagram

See **Section 1** for the full diagram (UI → Orchestrator → Worker Pool → Storage Layer → File System Access/Service Worker/Plugin Host). It is the canonical reference; every other diagram below is a different cross-section of the same system.

### 2. Sequence Diagram — Import to Export

```
User        UI          Orchestrator   STT Worker   Embed Worker   LLM Worker   Storage      Export
 │           │                │              │             │             │           │           │
 │  drop file│                │              │             │             │           │           │
 │──────────▶│                │              │             │             │           │           │
 │           │ create job     │              │             │             │           │           │
 │           │───────────────▶│              │             │             │           │           │
 │           │                │  extract+STT │             │             │           │           │
 │           │                │─────────────▶│             │             │           │           │
 │           │                │◀ ─ ─ partial transcripts (streamed) ─ ─ ─ │           │           │
 │           │◀── live update │              │             │             │           │           │
 │           │                │   chunks     │             │             │           │           │
 │           │                │─────────────────────────────────────────▶│           │           │
 │           │                │              │             │  embed each │           │           │
 │           │                │              │             │  chunk      │           │           │
 │           │                │◀ ─ ─ ─ ─ ─ ─ vectors ─ ─ ─ ─│             │           │           │
 │           │                │  transcript + structured-output request   │           │           │
 │           │                │───────────────────────────────────────────────────────▶│           │
 │           │                │◀ ─ ─ ─ summary / insights / action items (streamed) ─ ─│           │
 │           │◀── live update │              │             │             │           │           │
 │           │                │  write note + vectors + media                          │           │
 │           │                │────────────────────────────────────────────────────────────────────▶│
 │           │                │  render markdown + write to vault / queue download                  │
 │           │                │─────────────────────────────────────────────────────────────────────────────────▶│
 │           │◀── note appears in library / search / graph ───────────────────────────────────────────────────────│
```

### 3. Browser API Interaction Diagram

```
                    ┌──────────────────────────────────────────────┐
                    │                 UI / Orchestrator              │
                    └───────┬─────────────────┬──────────────┬──────┘
                            │                  │              │
                 postMessage│       BroadcastChannel│  Service Worker (precache, offline)
                            ▼                  ▼              ▼
                  ┌──────────────┐   ┌──────────────────┐  ┌────────────────┐
                  │ Web Workers   │   │ Other open tabs   │  │  App shell      │
                  │ (STT/Embed/   │   │ of the same origin│  │  cached for     │
                  │  LLM/Graph)   │   └──────────────────┘  │  offline boot   │
                  └──────┬───────┘                          └────────────────┘
                         │
        ┌────────────────┼─────────────────────┐
        ▼                ▼                      ▼
 ┌─────────────┐  ┌──────────────┐     ┌──────────────────────┐
 │ OPFS Sync    │  │ WebGPU /      │     │  IndexedDB             │
 │ Access Handle│  │ WASM inference│     │  (settings, cache)     │
 │ (media,model,│  │ (Transformers │     └──────────────────────┘
 │  vector idx, │  │  .js, WebLLM, │
 │  SQLite file)│  │  ONNX Runtime)│
 └─────────────┘  └──────────────┘

 Main thread only, user-gesture-gated:
 ┌─────────────────────────────────────────────┐
 │ File System Access API (showDirectoryPicker)  │
 │ → persistent vault folder handle (Chromium)    │
 └─────────────────────────────────────────────┘
```

### 4. Folder Structure

See **Section 11** for the full monorepo layout.

### 5. Dependency Graph (packages)

```
apps/web
 ├─▶ packages/ui
 ├─▶ packages/ai            (stt, embeddings, llm, diarization, ocr)
 ├─▶ packages/storage       (opfs, sqlite, cache)
 ├─▶ packages/search        (keyword, vector, hybrid)
 ├─▶ packages/ingestion      (youtube, file, audio-extract)
 ├─▶ packages/graph
 ├─▶ packages/markdown
 ├─▶ packages/plugins
 ├─▶ packages/workers
 └─▶ packages/shared

packages/ai          ─▶ packages/storage, packages/workers, packages/shared
packages/search       ─▶ packages/storage, packages/shared
packages/markdown     ─▶ packages/graph, packages/storage, packages/shared
packages/graph        ─▶ packages/storage, packages/ai (entity extraction), packages/shared
packages/ingestion    ─▶ packages/storage, packages/ai (stt), packages/shared
packages/plugins      ─▶ packages/shared only (deliberately minimal — plugins must not reach into storage/ai directly)
```

### 6. Technology Comparison Table (primary vs. alternative, condensed from Section 5)

| Task | Primary | Alternative | Trade-off |
|---|---|---|---|
| STT | whisper.cpp WASM | Transformers.js Whisper | Lower memory vs. slightly better WebGPU path |
| Embeddings | Transformers.js (MiniLM/E5) | WebLLM-hosted embedder | Dedicated small model vs. reusing an already-loaded LLM |
| Summarization/extraction | WebLLM (local) | BYOK cloud | Free + offline vs. higher quality, requires network + key |
| LLM inference (no WebGPU) | llama.cpp WASM | WebLLM (CPU path) | Both viable; llama.cpp WASM often lighter on pure CPU |
| Vector index | Flat brute-force (small corpus) | HNSW WASM (large corpus) | Simplicity vs. scale past ~5–10k chunks |
| Vault export | File System Access API (Chromium) | Zip/file download (Firefox/Safari) | Live sync vs. manual import, unavoidable given current browser support |

### 7. Performance Estimates (8GB / 16GB / 32GB) — rough planning numbers, not measured benchmarks

| Stage | 8GB, CPU only | 16GB, CPU only | 16GB+ with WebGPU | 32GB+ with WebGPU |
|---|---|---|---|---|
| STT (whisper tiny/base) | ~1× realtime | ~1.5–2× realtime | ~3–4× realtime | ~5×+ realtime |
| Embeddings (per 100 chunks) | ~3–5s | ~2–3s | <1s | <1s |
| Summarization (1.5B–3B model, ~1k output tokens) | 15–30 tok/s | 25–40 tok/s | 60–100 tok/s | 100+ tok/s |
| Cold model load (4-bit, ~1.5B params) | 8–15s | 5–10s | 5–8s | 3–5s |

These numbers are directional planning estimates based on known throughput characteristics of comparably-sized quantized models on consumer hardware — treat them as a starting point for capacity planning, and replace with real measurements from device-tier testing once the pipeline is implemented.

### 8. Browser Compatibility Matrix

| Feature | Chrome/Edge | Firefox | Safari (macOS/iOS) | Notes |
|---|---|---|---|---|
| OPFS (incl. worker SyncAccessHandle) | Full | Full (111+) | Full (15.2+) | Near-universal; this is why the storage layer can assume it everywhere |
| File System Access API (pickers) | Full | **Not supported** (Mozilla considers it harmful) | **Not supported** | Obsidian live vault sync is Chromium-only; everyone else gets download/import |
| WebGPU | Full (since v113) | Windows-only by default (141+); other platforms partial/flagged | Full since Safari 26 (Sept 2025) on macOS Tahoe/iOS/iPadOS | Linux lags on every engine; mobile coverage still uneven |
| SharedArrayBuffer | Full (needs COOP/COEP headers) | Full (needs COOP/COEP) | Full (needs COOP/COEP) | Required for some WASM threading paths |
| Web Workers / Service Workers | Full | Full | Full | No gaps here |
| PWA installability | Full | Partial (varies by OS) | Partial (iOS has historically lagged on PWA feature parity) | Treat as enhancement, not a requirement |

### 9. Risk Analysis

- **Browser API fragmentation**: the File System Access API gap is structural, not a bug to wait out — Firefox has stated a position against implementing it, so the download/import fallback is permanent product surface, not a temporary workaround.
- **Model-size vs. quality trade-off**: small quantized local models will visibly underperform a frontier cloud model on nuanced summarization; this needs to be communicated honestly in-product rather than oversold.
- **WebGPU immaturity on Linux/mobile**: a meaningful slice of users will be CPU-only for the foreseeable future; the CPU path must be a first-class experience, not an afterthought.
- **OPFS storage quota pressure**: browsers can evict origin storage under disk pressure; long-time users with large media libraries need a clear "what's using my space" view and an explicit pruning/export flow before that happens, not a silent data loss.
- **Worker memory limits on mobile**: mobile Safari/Chrome impose tighter per-tab and per-worker memory ceilings than desktop; the largest model tier should never be offered on detected mobile devices.

### 10. Potential Bottlenecks

- Main-thread jank from large `postMessage` payloads between workers — mitigated by using Transferable objects (and SharedArrayBuffer where threading model allows) instead of structured-cloning large transcript/audio buffers.
- Model download size/time on first use — mitigated by aggressive Cache API storage and offering the smallest viable model as the true default.
- IndexedDB write throughput for very large transcripts — mitigated by keeping transcripts in SQLite WASM (not IndexedDB) precisely because of this.
- Vector search latency as a user's library grows into the tens of thousands of chunks without ever crossing the HNSW threshold — mitigated by making that threshold a monitored, adjustable config value rather than a one-time decision.

### 11. Future Scalability Plan

- Migrate the vector index to a more sophisticated ANN structure (or a more mature WASM vector library, if one overtakes `hnswlib-wasm` in maintenance/performance) as individual users' corpora grow well past the tens-of-thousands-of-chunks range.
- Offer an optional native companion shell (Tauri/Electron) specifically to give Firefox/Safari-preferring users real folder access for Obsidian sync, without forcing the entire app into a heavier native wrapper by default.
- Treat WebNN (an emerging browser ML API) as a future evaluation target once its browser support reaches the maturity WebGPU has now — not a current-day dependency.
- Re-evaluate the device-tier model-selection thresholds periodically as quantized model quality-per-parameter continues to improve, so "the default model" keeps getting better without any architecture change.

---

*This document is the working architectural reference for WatchNT's browser-first edition. Treat Sections 1–11 (and the diagrams above) as the source of truth for implementation decisions; Sections 12–16 and the roadmap are intentionally more provisional and worth revisiting as the underlying browser APIs and model ecosystem keep moving.*
