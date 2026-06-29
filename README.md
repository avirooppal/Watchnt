# WatchNT: Universal Knowledge Capture & Memory System

## Project Overview

WatchNT is a browser-based, offline-first personal knowledge engine designed to automatically turn everything you watch, listen to, and discuss into organized notes, insights, action items, flashcards, semantic links, and searchable knowledge—without requiring you to manually take notes. 

Operating primarily as a **Chrome Extension (MV3)** acting as a Universal Capture Layer, the application integrates directly into the browser to capture multimedia content on-device. Client-side privacy is guaranteed as all storage, processing pipeline steps, and inference are sandboxed locally via IndexedDB and SQLite WASM.

---

## Architectural Workflow and Event Architecture

The core of WatchNT is an asynchronous, event-driven pipeline coordinated by a decoupled event bus (`packages/pipeline`). Every source of knowledge is wrapped in a `CaptureSession`.

```
[Knowledge Source] (YouTube, Meeting, PDF, Audio)
       │
       ▼
[Capture Session]
       │
       ▼
[Knowledge Assets] ──► (Transcription, OCR, Metadata)
       │
       ▼
[Pipeline Engine] ──► (Summarization, Graph Linking, Embedding)
       │
       ▼
[Storage Engine] ──► (PGLite / Vector Storage / Flashcards)
```

---

## Feature Matrix

| Feature | Status | Implementation Details |
|---|---|---|
| Universal Browser Capture | Complete | Manifest V3 Extension capturing media across all domains (YouTube, HTML5, etc). |
| Local Speech-to-Text | Complete | Quantized Whisper.cpp models running in isolated Web Workers. |
| Hybrid Retrieval | Complete | Reciprocal Rank Fusion (RRF) combining cosine vector similarities with BM25. |
| Temporal Boosting | Complete | Time-decay multiplier prioritizing newer entries: `(1.0 + EXP(-age/30_days))`. |
| Knowledge Graph | Complete | Extraction and mapping of entity relationships in a SQLite schema. |
| Flashcard Generation | Complete | Automated extraction of study candidate cards mapped to spaced-repetition. |
| Grounded Chat (RAG) | Complete | Contextual Q&A builder with hybrid, vector-only, and FTS search modes. |
| Secure BYOK | Complete | Local IndexedDB storage for client-provided API keys (OpenAI). |

---

## Workspace Structure

The project is structured as a monorepo workspace for logical boundaries:

| Package | Workspace Name | Purpose |
|---|---|---|
| `@watchnt/capture` | `packages/capture` | Chrome extension providers for universal knowledge capture. |
| `@watchnt/shared` | `packages/shared` | Branded identity types, Result wrappers, domain objects, and schemas. |
| `@watchnt/storage` | `packages/storage` | PGLite (SQLite WASM) database driver, migration runner, settings store. |
| `@watchnt/models` | `packages/models` | Database repositories and RAG `ContextBuilder` services. |
| `@watchnt/pipeline` | `packages/pipeline` | Core event bus defining the pipeline execution lifecycle and event types. |
| **Web Extension** | `apps/web` | SvelteKit static PWA configured as an MV3 Chrome Extension. |

---

## Installation and Execution

### 1. Prerequisites
- **Node.js**: Version `22.0.0` or higher.
- **PNPM**: Package manager version `10.0.0` or higher. 

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
