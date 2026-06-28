# Watch'nt

## Project Overview

Watch'nt is a browser-based, offline-first personal knowledge engine designed to ingest, process, and query multimedia content entirely on-device. The application operates client-side to build a local semantic database and knowledge graph from videos, podcasts, PDFs, screenshots, and web articles. Client-side privacy is guaranteed as all storage, processing pipeline steps, and inference are sandboxed locally.

---

## Architectural Workflow and Event Architecture

The core of Watch'nt is an asynchronous, event-driven pipeline coordinated by a decoupled event bus (`packages/pipeline`). Each step registers interest in specific event schemas and processes them inside Web Worker contexts to keep the main thread unblocked.

```
[Import Layer] (Video, Audio, PDF, Screenshot, Article)
       │
       ▼
  content.created
       │
       ├───────────────────────────────┐
       ▼ (Video/Audio)                 ▼ (PDF/Screenshot/Article)
  audio.ready                      OcrStep
       │                               │
       ▼                               ▼
  TranscriptionStep               chunks.ready
       │                               │
       ▼                               ▼
  transcript.ready                 EmbeddingStep
       │                               │
       ▼                               ▼
  DiarizationStep                  embeddings.ready
       │                               │
       └──────────────┬────────────────┘
                      ▼
               [Storage Engine] (PGLite / IndexedDB)
                      │
                      ├───────────────────────────────┐
                      ▼                               ▼
              SummarizationStep               EntityExtractionStep
                      │                               │
                      ▼                               ▼
                summary.ready                   graph.updated
                      │
                      ▼
           FlashcardExtractionStep ──► flashcards.ready
```

---

## Feature Matrix

| Feature | Status | Implementation Details |
|---|---|---|
| Local Speech-to-Text | Complete | Quantized Whisper.cpp models running in isolated Web Workers. |
| Hybrid Retrieval | Complete | Reciprocal Rank Fusion (RRF) combining cosine vector similarities with BM25 keyword rankings. |
| Temporal Boosting | Complete | Time-decay multiplier prioritizing newer entries: `(1.0 + EXP(-age/30_days))`. |
| Speaker Diarization | Complete | Heuristic pause speaker segmentation (>1500ms gap detection) with ONNX embedding hooks. |
| Knowledge Graph | Complete | Extraction and mapping of entity relationships in a SQLite schema. |
| Bidirectional Linking | Complete | Obsidian-style `[[wikilink]]` extraction to map related documents. |
| Flashcard Generation | Complete | Automated extraction of study candidate cards mapped to spaced-repetition schedules. |
| Grounded Chat (RAG) | Complete | Contextual Q&A builder with hybrid, vector-only, and FTS search modes. |
| Multimodal OCR | Complete | Processing routes for PDF layouts, screenshots, and article markup. |
| Plugin System | Complete | Sandboxed Web Worker plugin host with manifest-declared, permission-gated RPC bridge. |
| Obsidian Vault Sync | Complete | Bidirectional sync with File System Access API and SHA-256 conflict detection. |
| Secure BYOK | Complete | PBKDF2/AES-GCM encryption for client-provided API keys. |

---

## Workspace Structure

The project is structured as a monorepo workspace for logical boundaries:

| Package | Workspace Name | Purpose |
|---|---|---|
| `@watchnt/shared` | `packages/shared` | Branded identity types, Result wrappers, domain objects, and schemas. |
| `@watchnt/storage` | `packages/storage` | PGLite (SQLite WASM) database driver, migration runner, settings store. |
| `@watchnt/models` | `packages/models` | Database repositories and RAG `ContextBuilder` services. |
| `@watchnt/pipeline` | `packages/pipeline` | Core event bus defining the pipeline execution lifecycle and event types. |
| `@watchnt/workers` | `packages/workers` | Processing step definitions (Transcription, Embedding, Summarization, OCR, Diarization). |
| `@watchnt/ai` | `packages/ai` | Interface layer for models and client-side encryption utilities. |
| `@watchnt/plugins` | `packages/plugins` | Isolated Web Worker sandboxing and permission-gated RPC mediator. |
| `@watchnt/obsidian` | `packages/obsidian` | Obsidian vault tracking, File System Access API watcher, and conflict resolution. |
| `@watchnt/memory` | `packages/memory` | Interface seams for future episodic and semantic memory engines. |
| **Web Client** | `apps/web` | SvelteKit progressive web application (PWA). |

---

## Installation and Execution

### 1. Prerequisites
- **Node.js**: Version `22.0.0` or higher.
- **PNPM**: Package manager version `10.0.0` or higher. Install internationally:
  ```bash
  npm install -g pnpm
  ```

### 2. Dependency Resolution
Clone the codebase and install dependencies across the workspace:
```bash
git clone https://github.com/avirooppal/Watchnt.git
cd Watchnt
pnpm install
```

### 3. Running the Dev Server
Vite handles compilation and hot module reloading. You can start the development server from the root directory:

**Option A (Workspace Target)**
```bash
pnpm --filter web dev
```

**Option B (Directory Execution)**
```bash
cd apps/web
pnpm run dev
```

The application is served at **[http://localhost:5173](http://localhost:5173)**. A Chromium-based browser is recommended to support advanced storage APIs.

### 4. Running the Test Suites
To run all tests across all monorepo packages sequentially:
```bash
pnpm test
```

To run tests in isolation for a single package:
```bash
# Models package
pnpm --filter @watchnt/models test

# Pipeline workers package
pnpm --filter @watchnt/workers test

# Sandbox and plugin host package
pnpm --filter @watchnt/plugins test

# Obsidian sync package
pnpm --filter @watchnt/obsidian test

# Memory package
pnpm --filter @watchnt/memory test
```

---

## Plugin SDK Integration

Plugins run in sandboxed Web Worker contexts with no direct access to Svelte DOM structures or global storage. They must state their permissions explicitly in their manifest to gain access to RPC-gated capabilities.

### Manifest Configuration Example
```json
{
  "id": "my-custom-plugin",
  "name": "Custom Analyzer",
  "version": "1.0.0",
  "permissions": ["ai:invoke", "storage:read", "storage:write"],
  "capabilities": ["note-generator"]
}
```

For SDK methods and setup details, refer to the [`packages/plugins/README.md`](packages/plugins/README.md) documentation.

---

## License
Licensed under the MIT License. Refer to the LICENSE file for details.
