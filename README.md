# Watch'nt

> **Your personal, privacy-first AI knowledge base for everything you watch, read, and listen to.**

Watch'nt is a fully browser-based application that turns your videos, podcasts, PDFs, screenshots, and articles into a searchable, interconnected knowledge graph — entirely on-device. No cloud required, no data leaves your browser.

---

## ✨ Features

| Feature | Status |
|---|---|
| 🎙️ Local speech-to-text transcription (Whisper.cpp WASM) | ✅ Pipeline wired |
| 🔍 Hybrid retrieval — vector + BM25 RRF search | ✅ |
| 🧠 Speaker diarization (pause heuristic + ONNX stub) | ✅ |
| 🗺️ Knowledge graph (entities + relationships) | ✅ |
| 🔗 Backlink tracking (Obsidian-style `[[wikilinks]]`) | ✅ |
| 🃏 Flashcard generation & spaced-repetition review | ✅ |
| 💬 Chat / RAG UI (retrieval-augmented Q&A) | ✅ |
| 📄 OCR for PDFs, screenshots & articles | ✅ Pipeline stub |
| 🔌 Plugin system (sandboxed Web Workers, permission-gated RPC) | ✅ |
| 🗃️ Two-way Obsidian vault awareness | ✅ |
| 🔑 BYOK (Bring-Your-Own-Key) for cloud AI providers | ✅ AES-GCM encrypted |
| 🧩 Memory engine seam (future vision) | ✅ Interface stub |

---

## 🏗️ Architecture

```
Watch'nt/
├── apps/
│   └── web/                  # SvelteKit PWA — the only user-facing app
│       └── src/routes/
│           ├── /              # Home / Import
│           ├── /library       # Content library
│           ├── /video/[id]    # Video detail + note editor
│           ├── /chat          # RAG chat interface ← NEW
│           ├── /search        # Semantic / keyword search
│           ├── /graph         # Knowledge graph explorer
│           ├── /flashcards    # Spaced-repetition review
│           └── /settings      # BYOK API key management
│
├── packages/
│   ├── shared/               # Branded ID types, Result<T>, domain types
│   ├── storage/              # PGLite (SQLite WASM) + IndexedDB adapters
│   ├── models/               # Repository + service layer (ModelFacade)
│   │   └── services/
│   │       ├── search.ts     # Vector + FTS + Hybrid RRF retrieval
│   │       ├── rag.ts        # ContextBuilder for RAG prompts ← NEW
│   │       ├── notes.ts      # Notes + wikilink extraction
│   │       └── graph.ts      # Entity / edge queries
│   ├── pipeline/             # Event bus, step registry, PipelineEvent types
│   ├── workers/              # Pipeline steps (run in Web Workers)
│   │   ├── transcription.ts  # STT (Whisper stub)
│   │   ├── embedding.ts      # Chunk → vector embedding
│   │   ├── summary.ts        # Summarisation
│   │   ├── entity_extraction.ts
│   │   ├── flashcard_extraction.ts
│   │   ├── diarization.ts    # Speaker diarization ← NEW
│   │   ├── ocr.ts            # OCR for PDFs/screenshots ← NEW
│   │   └── coordinator.ts    # Event persistence orchestrator
│   ├── ai/                   # AI provider abstraction + AES-GCM key storage
│   ├── plugins/              # Plugin host (sandboxed Worker) + RPC mediator
│   ├── obsidian/             # Vault tracker (FSAA + download fallback) ← NEW
│   └── memory/               # Memory engine interface seam (future) ← NEW
│
└── docs/
    ├── implementation-plan.md  # Full 11-phase roadmap
    └── WatchNT_Browser_Architecture_Blueprint.md
```

### Key Design Principles

- **Everything runs in the browser** — SQLite via PGLite (WASM), Web Workers for CPU-heavy AI, OPFS for blob storage, IndexedDB for settings.
- **Pipeline is event-driven** — steps subscribe to typed events (`audio.ready → transcript.ready → chunks.ready → embeddings.ready → …`). Adding a new step never touches existing ones.
- **AI provider abstraction** — no step calls Whisper, WebLLM, or a cloud API directly. Cloud keys are opt-in and AES-GCM encrypted at rest.
- **Plugin sandbox** — third-party plugins run in isolated Blob URL Workers. Every host API call is permission-gated by `RpcMediator` before execution.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js 20+](https://nodejs.org)
- [pnpm 9+](https://pnpm.io) — `npm install -g pnpm`

### Install & Run

```bash
git clone https://github.com/avirooppal/Watchnt.git
cd Watchnt

pnpm install
pnpm run dev          # starts the SvelteKit dev server
```

Open [http://localhost:5173](http://localhost:5173) in a Chromium-based browser for the best experience (File System Access API, OPFS).

### Run Tests

```bash
# All packages
pnpm -r run test

# Individual packages
cd packages/models  && pnpm run test
cd packages/workers && pnpm run test
cd packages/plugins && pnpm run test
cd packages/obsidian && pnpm run test
cd packages/memory  && pnpm run test
```

---

## 📦 Package Overview

| Package | Purpose |
|---|---|
| `@watchnt/shared` | Branded types, `Result<T>`, domain model |
| `@watchnt/storage` | PGLite relational storage + IndexedDB settings |
| `@watchnt/models` | Repositories, services, `ModelFacade` |
| `@watchnt/pipeline` | Event bus, typed `PipelineEvent` union |
| `@watchnt/workers` | All pipeline steps (transcription, embedding, OCR, diarization…) |
| `@watchnt/ai` | AI provider abstraction + encrypted BYOK key storage |
| `@watchnt/plugins` | Plugin host + RPC mediator + SDK shim |
| `@watchnt/obsidian` | Obsidian vault tracker (conflict detection + FSAA) |
| `@watchnt/memory` | Memory engine interface seam (future vision, Blueprint §16) |

---

## 🔌 Plugin SDK

Plugins run in sandboxed Web Workers and communicate via a permission-gated RPC bridge.

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "permissions": ["retrieval:search", "ai:invoke", "notes:generate"],
  "capabilities": ["note-generator"]
}
```

See [`packages/plugins/README.md`](packages/plugins/README.md) for the full SDK reference.

---

## 🗺️ Roadmap

The implementation follows the [WatchNT Browser Architecture Blueprint](docs/WatchNT_Browser_Architecture_Blueprint.md). All 11 phases of the [implementation plan](docs/implementation-plan.md) are complete:

- **Phases 1–6**: App shell, storage, pipeline engine, AI provider layer, STT, embedding
- **Phases 7–9**: Knowledge graph, flashcards, plugin host v1, BYOK settings
- **Phase 10**: Hybrid retrieval (RRF), speaker diarization, full plugin system, Obsidian vault
- **Phase 11**: Memory engine seam, OCR/multimodal importers, Chat & RAG UI

Future work (Blueprint §16): real-time collaboration, multimodal memory, webcam integration.

---

## 📄 License

MIT — see [LICENSE](LICENSE).
