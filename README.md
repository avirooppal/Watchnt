# Watch'nt

> **Your personal, privacy-first AI knowledge base for everything you watch, read, and listen to.**

Watch'nt is a fully browser-based application that turns your videos, podcasts, PDFs, screenshots, and articles into a searchable, interconnected knowledge graph — entirely on-device. No cloud required, no data leaves your browser.

---

## 🏗️ System Workflow & Event Architecture

Watch'nt operates on an asynchronous, event-driven pipeline where decoupled steps communicate over a shared event bus (`packages/pipeline`). 

```
[Import Content] (Video, Audio, PDF, Screenshot, Article)
       │
       ▼
  content.created
       │
       ├───────────────────────────────┐
       ▼ (if Video/Audio)              ▼ (if PDF/Screenshot/Article)
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

## ✨ Features

| Feature | Status | Technical Details |
|---|---|---|
| **🎙️ Local Speech-to-Text** | ✅ Pipeline wired | Quantized Whisper.cpp models running in Web Workers. |
| **🔍 Hybrid Retrieval** | ✅ Completed | Reciprocal Rank Fusion (RRF) combining cosine vector similarities with BM25 keyword rankings. |
| **⚡ Recency Boost** | ✅ Completed | Automated mathematical decay multiplier boosting newer entries `(1.0 + EXP(-age/30_days))`. |
| **🧠 Speaker Diarization** | ✅ Completed | Heuristic pause/energy speaker segmentation (>1500ms segment gap changes Speaker ID) + ONNX embedding stubs. |
| **🗺️ Knowledge Graph** | ✅ Completed | Extracts entities and maps relationships in a fully queryable graph model inside SQLite. |
| **🔗 Backlinks** | ✅ Completed | Automatically extracts Obsidian-style `[[wikilinks]]` to construct a bidirectional wiki reference network. |
| **🃏 Flashcard Generation** | ✅ Completed | Automated template matching and candidate card extraction for spaced-repetition study. |
| **💬 Chat / RAG UI** | ✅ Completed | Retrieval-augmented Q&A grounding agent with hybrid, vector-only, and keyword-only search modes. |
| **📄 Multimodal OCR** | ✅ Completed | Importer routing pipeline step for processing PDF text layouts, screenshot dimensions, and article URLs. |
| **🔌 Plugin System** | ✅ Completed | Web Worker based Blob sandboxing with a strict, manifest-based permission-gated host RPC bridge. |
| **🗃️ Obsidian Vault Sync** | ✅ Completed | Real-time file changes tracking using the File System Access API with automated SHA-256 conflict detection. |
| **🔑 Secure BYOK** | ✅ Completed | Local encryption of OpenAI, Anthropic, and Gemini API keys using AES-GCM + PBKDF2 Web Crypto. |

---

## 📦 Package Overview

Watch'nt is organized as a monorepo workspace for clean code isolation:

| Package | Path | Purpose |
|---|---|---|
| `@watchnt/shared` | [`packages/shared`](file:///c:/Users/aviroop/Desktop/Watch'nt/packages/shared) | Branded types (`ContentId`, `NoteId`), Result wrappers, utility models. |
| `@watchnt/storage` | [`packages/storage`](file:///c:/Users/aviroop/Desktop/Watch'nt/packages/storage) | PGLite (SQLite WASM) database driver, migration runner, settings store. |
| `@watchnt/models` | [`packages/models`](file:///c:/Users/aviroop/Desktop/Watch'nt/packages/models) | Repositories (Notes, Entities, Edges, Flashcards) and services (`ContextBuilder` for RAG). |
| `@watchnt/pipeline` | [`packages/pipeline`](file:///c:/Users/aviroop/Desktop/Watch'nt/packages/pipeline) | Decoupled event bus orchestrating message passing between pipeline steps. |
| `@watchnt/workers` | [`packages/workers`](file:///c:/Users/aviroop/Desktop/Watch'nt/packages/workers) | Web Worker executables for CPU-heavy tasks: STT, embeddings, summarization, OCR, diarization. |
| `@watchnt/ai` | [`packages/ai`](file:///c:/Users/aviroop/Desktop/Watch'nt/packages/ai) | Model facade interface and client-side PBKDF2/AES-GCM cryptographic utilities. |
| `@watchnt/plugins` | [`packages/plugins`](file:///c:/Users/aviroop/Desktop/Watch'nt/packages/plugins) | Isolated Web Worker sandboxed runtime and permission-gated RPC mediator. |
| `@watchnt/obsidian` | [`packages/obsidian`](file:///c:/Users/aviroop/Desktop/Watch'nt/packages/obsidian) | File system change tracker, vault importer, and conflict resolver. |
| `@watchnt/memory` | [`packages/memory`](file:///c:/Users/aviroop/Desktop/Watch'nt/packages/memory) | Deluxe interface seams for Future Vision taxonomy storage. |
| **Web App** | [`apps/web`](file:///c:/Users/aviroop/Desktop/Watch'nt/apps/web) | SvelteKit front-end web application with rich CSS visualizations. |

---

## 🚀 How to Run the Application

Follow these steps to build, run, and test the entire project locally:

### 1. Prerequisites
- **Node.js**: Version `22.0.0` or higher is recommended.
- **PNPM**: Package manager version `10.0.0` or higher. Install it via:
  ```bash
  npm install -g pnpm
  ```

### 2. Installation
Clone the repository and install the monorepo dependencies:
```bash
git clone https://github.com/avirooppal/Watchnt.git
cd Watchnt
pnpm install
```

### 3. Running the Web Application
Since the root package operates as a monorepo workspace, you run the SvelteKit development server using the workspace filter or by navigating into the app directory:

**Option A: Run from the root workspace**
```bash
pnpm --filter web dev
```

**Option B: Run from the application directory**
```bash
cd apps/web
pnpm run dev
```

The application will build the dev modules and start on **[http://localhost:5173](http://localhost:5173)**. Open this link in any modern Chromium-based browser (Chrome, Edge, Opera) to ensure access to native browser storage interfaces (Origin Private File System, File System Access API).

### 4. Running Unit & Integration Tests
You can run all tests across every workspace package, or run tests inside a specific package.

**To run all package tests from the workspace root:**
```bash
pnpm test
```

**To run tests for a specific package:**
```bash
# Model & Database service tests
pnpm --filter @watchnt/models test

# Pipeline worker & step tests
pnpm --filter @watchnt/workers test

# Plugin sandbox & RPC tests
pnpm --filter @watchnt/plugins test

# Obsidian sync & vault tracker tests
pnpm --filter @watchnt/obsidian test

# Memory interface tests
pnpm --filter @watchnt/memory test
```

---

## 🔌 Plugin SDK Reference

Plugins run in sandboxed Web Workers with no direct access to the DOM or global storage. They must request permissions in their manifest to gain access to corresponding RPC APIs.

### Supported Manifest
```json
{
  "id": "external-summarizer",
  "name": "Custom Summarizer",
  "version": "1.0.0",
  "permissions": ["ai:invoke", "storage:read", "storage:write"],
  "capabilities": ["note-generator"]
}
```

For SDK methods and setup details, see [`packages/plugins/README.md`](packages/plugins/README.md).

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
