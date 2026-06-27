# ARCHITECTURE.md — Watchn't V2 (Frozen Architecture v1.0)

> **Document Type**: System Architecture Reference  
> **Status**: Frozen  
> **Version**: 2.0.0 (Local-First Engine)  

---

## Immutable Architectural Rules

These rules are strictly enforced. All development MUST adhere to them.

1. **Apps never contain business logic.**
2. **Business logic never depends on UI.**
3. **Storage is accessed only through the storage package.**
4. **Providers expose capabilities, not provider-specific APIs.**
5. **Every package exposes a single public API (`index.ts`).**
   - Cross-package imports must ONLY go through the root `index.ts`.
   - No package may import another package's internal files.
6. **Cross-package communication happens through `core` and the event bus.**
7. **The extension is a client, not the application.**
8. **The backend is optional and must never become a runtime dependency for the local-first experience.**
9. **Every feature must work with both BYOK cloud providers and local models whenever technically feasible.**
10. **No new top-level packages without a compelling architectural reason.**

---

## Monorepo Structure

The repository is divided into `apps`, `packages`, and `optional`.

```text
watchnt/

apps/
│
├── extension/          # Main product (UI + Capture layer)
├── web/                # Optional local viewer
└── desktop/            # Future Tauri app

packages/
│
├── core/               # Application engine orchestrator
├── contracts/          # Centralized interfaces & types
├── config/             # Centralized settings
├── shared/             # Shared utilities and constants
├── audio/              # Recording, VAD, streaming
├── transcription/      # Whisper pipeline, chunker
├── diarization/        # Speaker detection
├── intelligence/       # Logic for summary, actions, timeline
├── prompts/            # Versionable prompt assets
├── meeting/            # Meeting lifecycle & domain models
├── memory/             # Versioned memory graph, retrieval
├── embeddings/         # Embedding generation & indexing
├── search/             # Semantic search & RAG
├── providers/          # Capability-based models (streaming, tools)
├── storage/            # IndexedDB, SQLite (OPFS), filesystem
├── export/             # Markdown, JSON, Obsidian, Notion
├── workflows/          # Independent pipelines
├── plugins/            # Google Meet, Zoom, Teams, Discord
├── events/             # Event bus and event definitions
├── features/           # Feature flags
├── telemetry/          # Developer diagnostics
└── ui/                 # Shared UI components

optional/
│
└── backend/            # Legacy backend infrastructure
    ├── fastapi/
    ├── postgres/
    ├── redis/
    └── celery/

docs/
tests/
```

---

## Package Responsibilities

Each package has exactly one responsibility.

| Package | Owns | Does NOT own |
|---|---|---|
| `apps/*` | UI rendering, client-side state, capturing inputs. | Business logic, intelligence, data orchestration. |
| `packages/core` | Driving the end-to-end pipeline, coordinating subsystems. | Implementing domain logic, defining UIs. |
| `packages/contracts` | TypeScript interfaces and types. | Implementation details. |
| `packages/providers` | Capability-based mapping (streaming, tools, JSON mode) to LLMs. | Domain-specific prompts. |
| `packages/prompts` | Versioned text templates and evaluation assets. | Application logic. |
| `packages/intelligence` | Logic for when and how to extract tasks. | The prompt text itself. |
| `packages/events` | Defining the global event bus. | Reacting to events. |
| `packages/storage` | Interacting with OPFS, IndexedDB, Filesystem. | Reasoning about data. |
| `packages/memory` | Entities, timeline, vector indexing logic. | Low-level storage implementation. |

---

## The Event-Driven Pipeline

Subsystems are loosely coupled via `packages/events`.

Example Flow:
`AudioCaptured` → `TranscriptionCompleted` → `SpeakerDetected` → `SummaryGenerated` → `ActionsExtracted` → `MemoryUpdated` → `MeetingCompleted`

---

## Migration & Execution Strategy

1. **Scaffold**: Build the `packages/` directory structure.
2. **Build Alongside**: Develop new core packages while keeping the existing implementation.
3. **Migrate**: Transition features to the new local-first architecture.
4. **Parity**: Verify exact feature parity with the legacy backend.
5. **Archive**: Move the legacy backend to `optional/backend` once the new architecture is fully operational.
