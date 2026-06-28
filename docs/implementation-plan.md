# WatchNT Implementation Plan

This plan is derived from `WatchNT_Browser_Architecture_Blueprint.md`, which remains the single source of truth. This document is an execution plan, not a replacement architecture.

## Source Of Truth Rules

- Follow the blueprint exactly.
- Do not replace the selected technologies unless a critical technical blocker is discovered and documented.
- Do not introduce a backend, REST API, Express, FastAPI, Docker, or server tier.
- Do not bypass the storage abstraction.
- Do not call WebLLM, Transformers.js, whisper.cpp, Tesseract.js, or cloud providers directly from pipeline steps. Use the AI provider abstraction.
- Do not hardcode prompt strings inside pipeline steps. Use the Prompt Registry.
- Do not special-case Obsidian outside the exporter layer.
- Do not allow plugins to access storage, network, or DOM APIs except through mediated host capabilities.
- Keep every milestone small enough to verify with unit tests and, where applicable, browser tests.

## Blueprint Mapping

| Blueprint Section                 | Implementation Area                                                                                                        |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Section 1.1 Capability Layers     | UI, Application Layer, Pipeline Engine, AI Provider Layer, Knowledge Engine, Retrieval Engine, Export Layer, Storage Layer |
| Section 1.2 Pipeline Engine       | `packages/pipeline`, `packages/workers`, app pipeline bridge                                                               |
| Section 1.3 Asset Manager         | `packages/assets`                                                                                                          |
| Section 2.1 Content Object Model  | `packages/shared/types`, `packages/ingestion`                                                                              |
| Section 2.2 Event-Driven Pipeline | Pipeline events, event bus, step registry                                                                                  |
| Section 2.3 Concrete Workflow     | Import to export pipeline execution                                                                                        |
| Section 4 Storage Architecture    | IndexedDB settings/cache, OPFS files, SQLite WASM, FTS5                                                                    |
| Section 5 AI Pipeline             | AI provider interface, providers, prompt registry, STT, embeddings, OCR, generation                                        |
| Section 6 User Interaction        | SvelteKit app shell, import, progress, editing, search, export, settings                                                   |
| Section 7 Retrieval Engine        | Keyword, semantic, hybrid, entity, time, speaker, media, graph strategies                                                  |
| Section 8 Knowledge Graph         | Entity extraction, graph edges, backlinks, wikilinks                                                                       |
| Section 9 Export                  | Export manager, Markdown exporter, Obsidian exporter, fallback downloads                                                   |
| Section 10 Plugin System          | Plugin host, SDK, manifests, permission-gated RPC                                                                          |
| Section 11 Project Structure      | `apps/web`, `packages/*`, `docs`, `tests`, `models`, `public`                                                              |
| Section 12 Technology Stack       | SvelteKit, Vite, Tailwind, bits-ui/melt-ui, micromark/remark, wa-sqlite, Vitest, Playwright                                |
| Section 13 Performance            | Streaming, workers, lazy model loading, chunked processing, caching, incremental indexing                                  |
| Section 14 Security               | Worker sandboxing, encrypted BYOK keys, offline default, export leakage scan, complete deletion                            |
| Section 15 Roadmap                | MVP, v1, v2, v3, Future phase grouping                                                                                     |

## Dependency Graph

```text
apps/web
├── packages/ui
├── packages/shared
├── packages/pipeline
├── packages/workers
├── packages/storage
├── packages/assets
├── packages/ai
├── packages/ingestion
├── packages/retrieval
├── packages/graph
├── packages/export
└── packages/plugins

packages/pipeline -> packages/shared, packages/workers
packages/storage -> packages/shared
packages/assets -> packages/shared, packages/storage
packages/ai -> packages/shared, packages/assets, packages/storage, packages/workers
packages/ingestion -> packages/shared, packages/storage, packages/ai
packages/retrieval -> packages/shared, packages/storage
packages/graph -> packages/shared, packages/storage, packages/ai
packages/export -> packages/shared, packages/storage, packages/assets, packages/graph
packages/plugins -> packages/shared only for SDK types; host mediates all privileged access
```

## Phase 0: Repository Foundation

Status: complete.

### Milestone 0.1: Tooling And Workspace

Implemented:

- pnpm workspace.
- Strict TypeScript.
- ESLint.
- Prettier.
- Vitest.
- Playwright.
- Initial docs.

Required checks:

- `pnpm verify`
- `pnpm test:e2e`

## Phase 1: App Shell And Shared Contracts

Goal: create the SvelteKit browser shell and the stable shared type foundation that all packages depend on.

### Milestone 1.1: SvelteKit Web App Shell

Blueprint sections:

- Section 6 User Interaction.
- Section 11 Project Structure.
- Section 12 Technology Stack.

Scope:

- Create `apps/web`.
- Configure SvelteKit + Vite.
- Configure Tailwind CSS.
- Add base routes: `/`, `/import`, `/library`, `/note/[id]`, `/search`, `/settings`, `/graph`.
- Add app layout shell with offline/privacy-first copy for first-launch surface.
- Add service worker placeholder without full PWA caching yet.
- Add package aliases for future workspace packages.

Unit tests:

- Route smoke tests where practical.
- Basic component rendering tests if Svelte test tooling is introduced in this milestone.

Browser tests:

- App loads in Chromium, Firefox, and WebKit.
- Core routes render without server dependencies.

Docs:

- Update `docs/architecture.md` with app shell notes.

Approval gate:

- Stop after this milestone and request approval before shared domain contracts.

### Milestone 1.2: Shared IDs, Results, And Runtime Utilities

Blueprint sections:

- Section 2.1 Content Object Model.
- Section 11 Project Structure.
- Section 12 Technology Stack.

Scope:

- Create `packages/shared`.
- Add branded IDs: `ContentId`, `JobId`, `NoteId`, `AssetId`, `ProviderId`, `PluginId`.
- Add timestamp and hash types.
- Add typed result/error helpers.
- Add browser-safe utility functions only.

Unit tests:

- ID creation and validation.
- Result helper success/failure behavior.
- No `any` usage in public APIs.

Docs:

- Update `docs/interfaces.md`.

### Milestone 1.3: Content And KnowledgeObject Types

Blueprint sections:

- Section 2.1 Content Object Model.
- Section 2.3 Concrete Workflow.
- Section 4 Storage Architecture.

Scope:

- Add `Content` base type.
- Add `Video`, `Audio`, `Meeting`, `Podcast`, `VoiceMemo`, `Conversation`.
- Include future-safe discriminants for `PDF`, `Article`, `Screenshot`.
- Add `KnowledgeObject`, transcript, chunk, summary, insight, quote, action item, flashcard candidate, entity, and graph edge types.

Unit tests:

- Discriminated union narrowing.
- Serialization-safe shapes.
- Exhaustiveness checks.

Docs:

- Document public content and knowledge object shapes.

### Milestone 1.4: Browser Capability And Device Tier Detection

Blueprint sections:

- Note on Ground Truth.
- Section 3 Browser Technologies.
- Section 13 Performance.

Scope:

- Add `packages/shared/config`.
- Detect OPFS, File System Access API, WebGPU, workers, service workers, IndexedDB, device memory, hardware concurrency.
- Provide device tier recommendations for model sizing without loading models.

Unit tests:

- Feature-detection logic with mocked browser globals.
- Conservative fallback behavior.

Browser tests:

- Capability smoke tests in Chromium, Firefox, and WebKit.

Docs:

- Document compatibility assumptions and fallbacks.

## Phase 2: Worker And Pipeline Foundation

Goal: implement event-driven orchestration before any concrete AI or storage-heavy pipeline steps.

### Milestone 2.1: Worker Pool Foundation

Blueprint sections:

- Section 1.2 Pipeline Engine.
- Section 13 Performance.
- Section 14 Security.

Scope:

- Create `packages/workers`.
- Add typed worker pool.
- Support job dispatch, cancellation, timeout, lifecycle cleanup, and worker recycling.
- Use transferable payload patterns where possible.

Unit tests:

- Queueing.
- Cancellation.
- Timeout behavior.
- Worker lifecycle state transitions.

Browser tests:

- Worker creation and message round-trip.

Docs:

- Document worker pool contract.

### Milestone 2.2: Pipeline Event Model

Blueprint sections:

- Section 2.2 Event-Driven Pipeline.

Scope:

- Create `packages/pipeline`.
- Define canonical events: `content.created`, `audio.ready`, `transcript.ready`, `chunks.ready`, `embeddings.ready`, `summary.ready`, `graph.updated`, `export.finished`.
- Add progress, error, cancellation, and job lifecycle events.

Unit tests:

- Event payload typing.
- Exhaustive event handling.

Docs:

- Document event sequence and payloads.

### Milestone 2.3: Event Bus And Step Registry

Blueprint sections:

- Section 1.2 Pipeline Engine.
- Section 2.2 Event-Driven Pipeline.

Scope:

- Implement typed event bus.
- Implement step interface.
- Implement step registry.
- Allow each step to choose main thread, worker, shared worker, or WebGPU-capable execution context.
- Do not implement concrete AI steps yet.

Unit tests:

- Subscribe/publish.
- Step registration.
- Event ordering.
- Error propagation.

Integration tests:

- In-memory pipeline with fake steps running the canonical sequence.

Docs:

- Document pipeline step authoring.

## Phase 3: Storage Foundation

Goal: implement all browser storage behind abstractions before ingestion, retrieval, graph, or export uses it.

### Milestone 3.1: Storage Interfaces

Blueprint sections:

- Section 4 Storage Architecture.
- Section 14 Security.

Scope:

- Create `packages/storage`.
- Define interfaces for relational storage, blob storage, settings storage, AI output cache, migration runner, health checks, and deletion.
- No direct app use of IndexedDB, OPFS, or SQLite outside this package.

Unit tests:

- Interface-level contract tests with in-memory adapters.

Docs:

- Document storage abstraction rules.

### Milestone 3.2: IndexedDB Settings Store

Blueprint sections:

- Section 4 Storage Architecture.
- Section 14 Security.

Scope:

- Implement IndexedDB key-value storage for settings.
- Store theme, model choice, encrypted BYOK metadata, and vault handle metadata.
- Add versioned store schema.

Unit tests:

- Put/get/delete.
- Version upgrades.
- Missing database fallback.

Browser tests:

- IndexedDB behavior across Chromium, Firefox, WebKit.

Docs:

- Document settings keys and privacy boundaries.

### Milestone 3.3: OPFS File Manager

Blueprint sections:

- Ground Truth note.
- Section 4 Storage Architecture.

Scope:

- Implement OPFS blob manager for media, model files, vector indexes, and cached blobs.
- Address media by content hash.
- Add quota checks and delete operations.

Unit tests:

- Path normalization.
- Hash-addressing behavior using mocked adapters.

Browser tests:

- OPFS write/read/delete in supported browsers.

Docs:

- Document OPFS layout.

### Milestone 3.4: SQLite WASM Worker Bootstrap

Blueprint sections:

- Section 4 Storage Architecture.
- Section 11 Project Structure.
- Section 12 Technology Stack.

Scope:

- Integrate `wa-sqlite` in a worker.
- Use OPFS VFS.
- Add typed RPC boundary.
- Add initialization and shutdown.

Unit tests:

- RPC request/response validation.

Browser tests:

- SQLite worker initializes and executes a basic query.

Docs:

- Document SQLite worker constraints.

### Milestone 3.5: SQLite Schema And Migrations

Blueprint sections:

- Section 2.3 Concrete Workflow.
- Section 4 Storage Architecture.
- Section 7 Retrieval Engine.
- Section 8 Knowledge Graph.

Scope:

- Add migrations for content, jobs, transcripts, chunks, notes, tags, entities, graph edges, backlinks, exports, and FTS5 tables.
- Add migration version table.

Unit tests:

- Migration ordering.
- Idempotency.
- Schema validation.

Browser tests:

- Migrate fresh database in real browser.

Docs:

- Document schema and migration policy.

### Milestone 3.6: Storage Repositories

Blueprint sections:

- Section 4 Storage Architecture.

Scope:

- Implement typed repositories for content, jobs, transcripts, chunks, notes, entities, graph edges, backlinks, and exports.
- Add transaction helpers where SQLite supports them.

Unit tests:

- Repository CRUD.
- Query filters.
- Error mapping.

Integration tests:

- Repository calls against SQLite worker.

Docs:

- Document repository APIs.

### Milestone 3.7: AI Output Cache

Blueprint sections:

- Section 4 Storage Architecture.
- Section 5.3 Prompt Registry.

Scope:

- Implement cached AI outputs keyed by `hash(content + prompt-template-version + model-id)`.
- Support typed payloads for summaries, insights, embeddings, and extracted entities.

Unit tests:

- Stable cache key generation.
- Cache hit/miss behavior.
- Version invalidation.

Docs:

- Document cache key contract.

## Phase 4: Asset Manager And Prompt Registry

Goal: make assets and prompts centrally managed before models, templates, exporters, or plugins use them.

### Milestone 4.1: Asset Manager Interfaces

Blueprint sections:

- Section 1.3 Asset Manager.

Scope:

- Create `packages/assets`.
- Define asset descriptors, asset types, versions, checksums, origin metadata, lifecycle status, and lookup by `(type, id, version)`.

Unit tests:

- Descriptor validation.
- Version selection.
- Checksum metadata behavior.

Docs:

- Document asset descriptor schema.

### Milestone 4.2: Asset Download, Cache, And Cleanup

Blueprint sections:

- Section 1.3 Asset Manager.
- Section 13 Performance.

Scope:

- Implement fetch + Cache API storage.
- Add checksum verification.
- Add resumable or streamed download support where browser APIs allow.
- Add quota-aware eviction policy.

Unit tests:

- Checksum verification.
- Eviction ordering.
- Failed download recovery.

Browser tests:

- Cache API integration.

Docs:

- Document asset lifecycle.

### Milestone 4.3: Prompt Registry

Blueprint sections:

- Section 5.3 Prompt Registry.

Scope:

- Implement prompt templates, variables, versioning, and rendering.
- Add structured-output schema metadata hooks.
- Load prompt assets through Asset Manager.

Unit tests:

- Template rendering.
- Missing variable errors.
- Versioned template selection.

Docs:

- Document prompt template API and examples.

## Phase 5: AI Provider Layer

Goal: create AI abstraction and provider registry before any pipeline step uses AI.

### Milestone 5.1: AIProvider Interface And Registry

Blueprint sections:

- Section 5.1 AI Provider Layer.

Scope:

- Create `packages/ai`.
- Define `AIProvider` interface with `generate`, `embed`, `transcribe`, `vision`, and `ocr`.
- Define prompt, generation, audio chunk, transcript segment, vision, OCR, and capability types.
- Add provider registry and task binding.

Unit tests:

- Provider registration.
- Capability matching.
- Unsupported task errors.

Docs:

- Document public AI provider interface.

### Milestone 5.2: Transformers Provider Wrapper

Blueprint sections:

- Section 5.1 AI Provider Layer.
- Section 5.2 Implementation Choices.

Scope:

- Implement provider wrapper for embeddings, STT fallback, and OCR-capable tasks through the abstraction.
- Resolve model assets through Asset Manager.
- Keep direct runtime details inside provider package.

Unit tests:

- Capability exposure.
- Asset resolution.
- Unsupported task handling.

Integration tests:

- Provider can be configured without model download at app boot.

Docs:

- Document local provider configuration.

### Milestone 5.3: WebLLM Provider Wrapper

Blueprint sections:

- Section 5.1 AI Provider Layer.
- Section 5.2 Implementation Choices.

Scope:

- Implement generation provider wrapper.
- Support streaming output.
- Support structured JSON generation hooks.
- Resolve models through Asset Manager.

Unit tests:

- Streaming adapter behavior with fake runtime.
- Structured output validation handoff.

Docs:

- Document WebLLM provider behavior and WebGPU fallback assumptions.

### Milestone 5.4: BYOK Provider Configuration And Encryption

Blueprint sections:

- Section 5.1 AI Provider Layer.
- Section 14 Security.

Scope:

- Implement encrypted BYOK key storage using Web Crypto AES-GCM with passphrase-derived keys.
- Add provider config for OpenAI, Anthropic, Gemini as opt-in providers.
- Do not enable network calls without explicit user configuration.

Unit tests:

- Encrypt/decrypt round trip.
- Wrong passphrase failure.
- Secret redaction in errors.

Browser tests:

- Web Crypto behavior in Chromium, Firefox, WebKit.

Docs:

- Document BYOK privacy model.

## Phase 6: Ingestion And Pipeline MVP

Goal: implement the MVP import-to-note path through the event-driven pipeline.

### Milestone 6.1: Importer Interfaces

Blueprint sections:

- Section 2.1 Content Object Model.
- Section 11 Project Structure.

Scope:

- Create `packages/ingestion`.
- Define importer interface.
- Add source metadata normalization.
- Add importer registry.

Unit tests:

- Importer registration.
- Source metadata validation.

Docs:

- Document importer interface.

### Milestone 6.2: Local File Importer

Blueprint sections:

- Section 2.3 Concrete Workflow.
- Section 4 Storage Architecture.

Scope:

- Import local audio/video files.
- Hash file content.
- Store media in OPFS through storage abstraction.
- Create content and job records.
- Detect duplicates.

Unit tests:

- File metadata normalization.
- Duplicate detection logic.

Browser tests:

- File API import smoke test.

Docs:

- Document local file import flow.

### Milestone 6.3: YouTube Caption Importer

Blueprint sections:

- Section 2.3 Concrete Workflow.
- Section 6 User Interaction.

Scope:

- Accept YouTube URL input.
- Resolve caption tracks where browser-accessible.
- Emit transcript-ready content when captions exist.
- Route no-caption content to audio extraction only if browser constraints allow.

Unit tests:

- URL parsing.
- Caption payload normalization.
- Failure scenarios.

Docs:

- Document browser-only YouTube limitations.

### Milestone 6.4: Audio Extraction Step

Blueprint sections:

- Section 2.3 Concrete Workflow.
- Section 13 Performance.

Scope:

- Implement ffmpeg.wasm worker step.
- Demux and resample to 16kHz mono PCM.
- Process approximately 30 second windows.
- Emit `audio.ready`.

Unit tests:

- Step registration.
- Window metadata calculations.

Browser tests:

- Worker loads and emits expected event for a tiny fixture.

Docs:

- Document audio extraction behavior.

### Milestone 6.5: Speech-To-Text Step

Blueprint sections:

- Section 2.3 Concrete Workflow.
- Section 5 AI Pipeline.

Scope:

- Implement STT through `AIProvider.transcribe`.
- Stream partial transcript segments.
- Persist transcript incrementally.
- Emit `transcript.ready`.

Unit tests:

- Fake provider streaming.
- Partial segment ordering.
- Cancellation handling.

Integration tests:

- Audio event to transcript event with fake provider.

Docs:

- Document STT step contract.

### Milestone 6.6: Transcript Cleaning And Chunking

Blueprint sections:

- Section 2.3 Concrete Workflow.

Scope:

- Implement transcript cleaning.
- Implement token-aware, sentence-boundary-aware chunking.
- Emit `chunks.ready`.

Unit tests:

- Filler cleanup.
- Timestamp preservation.
- Chunk size bounds.
- Sentence boundary behavior.

Docs:

- Document chunking policy.

### Milestone 6.7: Summarization MVP

Blueprint sections:

- Section 2.3 Concrete Workflow.
- Section 5.3 Prompt Registry.

Scope:

- Add one summarization template.
- Use `AIProvider.generate`.
- Validate structured JSON for summary, insights, quotes, open questions, action items, and flashcard candidates.
- Use AI output cache.
- Emit `summary.ready`.

Unit tests:

- Prompt rendering.
- Structured output validation.
- Cache hit/miss behavior.
- Long transcript map-reduce routing with fake provider.

Integration tests:

- Chunks to summary with fake provider.

Docs:

- Document default summary template.

### Milestone 6.8: MVP Markdown Export

Blueprint sections:

- Section 9 Export.

Scope:

- Implement export interface.
- Implement basic Markdown exporter.
- Render from structured note data.
- Do not persist generated Markdown as canonical data.

Unit tests:

- Frontmatter rendering.
- Markdown body rendering.
- Export destination validation.

Docs:

- Document exporter interface.

### Milestone 6.9: MVP End-To-End Pipeline

Blueprint sections:

- Section 2.3 Concrete Workflow.

Scope:

- Wire import, optional audio extraction, STT, cleaning, chunking, summary, storage, and Markdown export.
- Use fake providers in tests.
- Real model execution can remain behind provider assets and later milestones.

Unit tests:

- Pipeline state transitions.
- Failed step behavior.
- Cancellation behavior.

Integration tests:

- Local file to note using fake provider.
- YouTube captions to note using fixture captions.

Browser tests:

- Import UI triggers pipeline and displays progress.

Docs:

- Document MVP pipeline.

## Phase 7: Retrieval And Library Experience

Goal: make stored knowledge searchable and usable in the app.

### Milestone 7.1: Keyword Retrieval

Blueprint sections:

- Section 4 Storage Architecture.
- Section 7 Retrieval Engine.

Scope:

- Implement SQLite FTS5 query builder.
- Support transcript and note text search.
- Add pagination and filters.

Unit tests:

- Query escaping.
- Ranking shape.
- Empty and malformed queries.

Integration tests:

- FTS5 search against SQLite worker.

Docs:

- Document keyword retrieval strategy.

### Milestone 7.2: App Import, Library, Note, And Search UI

Blueprint sections:

- Section 6 User Interaction.

Scope:

- Implement import UI.
- Implement job progress.
- Implement library list.
- Implement note detail.
- Implement omnibox search UI using keyword retrieval first.

Unit tests:

- Store updates.
- Component state transitions.

Browser tests:

- Import page route.
- Library route.
- Search route.
- No backend calls required.

Docs:

- Document app usage examples.

## Phase 8: v1 Storage, Embeddings, Semantic Search, PWA, Obsidian

Goal: complete the blueprint v1 feature set.

### Milestone 8.1: Embedding Step

Blueprint sections:

- Section 2.3 Concrete Workflow.
- Section 5.2 Implementation Choices.

Scope:

- Use `AIProvider.embed`.
- Persist vector metadata.
- Emit `embeddings.ready`.

Unit tests:

- Batch embedding behavior.
- Fake provider vector shapes.
- Cache behavior.

Docs:

- Document embedding step.

### Milestone 8.2: Flat Vector Index

Blueprint sections:

- Section 4 Storage Architecture.
- Section 7 Retrieval Engine.

Scope:

- Implement OPFS-backed flat vector store.
- Add cosine similarity.
- Add configurable HNSW threshold without implementing HNSW yet.

Unit tests:

- Cosine similarity.
- Vector persistence format.
- Threshold configuration.

Browser tests:

- OPFS vector read/write.

Docs:

- Document vector index format.

### Milestone 8.3: Semantic Retrieval

Blueprint sections:

- Section 7 Retrieval Engine.

Scope:

- Implement semantic retrieval strategy.
- Join vector results to notes/chunks.

Unit tests:

- Score normalization.
- Empty vector index.
- Missing chunks.

Integration tests:

- Semantic query with fake embeddings.

Docs:

- Document semantic search.

### Milestone 8.4: Obsidian Exporter

Blueprint sections:

- Section 9 Obsidian Integration.

Scope:

- Implement Obsidian exporter extending Markdown exporter behavior.
- Add YAML frontmatter.
- Add default folder structure.
- Add Chromium vault folder writing through File System Access API.
- Add Firefox/Safari download fallback.

Unit tests:

- Path selection.
- Frontmatter tags.
- Fallback destination behavior.

Browser tests:

- Chromium capability path.
- Firefox/WebKit fallback messaging.

Docs:

- Document Obsidian export behavior.

### Milestone 8.5: Basic PWA Installability

Blueprint sections:

- Section 12 Technology Stack.
- Section 13 Performance.

Scope:

- Add `vite-plugin-pwa`.
- Precache app shell.
- Keep model downloads lazy.
- Add offline boot behavior.

Unit tests:

- PWA config validation.

Browser tests:

- Offline app shell loads after first visit.

Docs:

- Document offline behavior.

## Phase 9: v2 Knowledge Graph, Flashcards, Plugin v1, BYOK UI

Goal: implement graph intelligence and initial extensibility.

### Milestone 9.1: Graph Entity Extraction

Blueprint sections:

- Section 8 Knowledge Graph.

Scope:

- Extract entities through local LLM prompt.
- Add co-occurrence fallback.
- Store graph nodes and edges.

Unit tests:

- Entity normalization.
- Fallback extraction.
- Edge type tagging.

Docs:

- Document entity extraction.

### Milestone 9.2: Backlinks And Wikilinks

Blueprint sections:

- Section 8 Knowledge Graph.
- Section 9.2 Obsidian Export Detail.

Scope:

- Parse `[[wikilinks]]`.
- Reverse-index backlinks in SQLite.
- Add related notes suggestions from graph and embeddings.

Unit tests:

- Wikilink parser.
- Backlink indexing.
- No render-time full scan.

Docs:

- Document backlink model.

### Milestone 9.3: Flashcard Generation

Blueprint sections:

- Section 2.3 Structured Output.
- Section 5.3 Prompt Registry.

Scope:

- Promote flashcard candidates from structured output.
- Add template support and storage.

Unit tests:

- Flashcard schema validation.
- Prompt version cache behavior.

Docs:

- Document flashcard output.

### Milestone 9.4: Plugin Host v1

Blueprint sections:

- Section 10 Plugin System.

Scope:

- Implement isolated Worker plugin host.
- Parse plugin manifests.
- Implement permission-gated mediated RPC.
- Support importer and exporter plugin types only.

Unit tests:

- Manifest validation.
- Permission denial.
- RPC mediation.

Browser tests:

- Worker plugin sandbox smoke test.

Docs:

- Document plugin v1 SDK.

### Milestone 9.5: BYOK Settings UI

Blueprint sections:

- Section 5.1 AI Provider Layer.
- Section 14 Security.

Scope:

- Add BYOK setup UI.
- Encrypt and store provider keys.
- Make cloud providers opt-in only.

Unit tests:

- Store integration.
- Redacted display behavior.

Browser tests:

- Web Crypto setup flow.

Docs:

- Document BYOK usage.

## Phase 10: v3 Hybrid Retrieval, Diarization, Full Plugins, Vault Awareness

Goal: implement the advanced v3 roadmap items without changing architecture.

### Milestone 10.1: Hybrid Retrieval With RRF

Blueprint sections:

- Section 7 Retrieval Engine.

Scope:

- Implement RRF fusion.
- Add recency boost.
- Add pinned note boost.

Unit tests:

- RRF scoring.
- Stable ordering.
- Missing strategy results.

Docs:

- Document hybrid ranking.

### Milestone 10.2: Speaker Diarization

Blueprint sections:

- Section 5.2 Implementation Choices.
- Section 7 Retrieval Engine.

Scope:

- Implement diarization provider path with lightweight ONNX speaker embedding model.
- Add heuristic pause/energy fallback.
- Store speaker labels.

Unit tests:

- Speaker segment merging.
- Fallback logic.
- Speaker filter compatibility.

Docs:

- Document diarization behavior.

### Milestone 10.3: Full Plugin System

Blueprint sections:

- Section 10 Plugin System.

Scope:

- Extend plugins to AI providers, retrieval strategies, prompt templates, and note generators.
- Keep all access mediated.

Unit tests:

- Capability-specific permission enforcement.
- Plugin registration and revocation.

Browser tests:

- Sandboxed plugin behavior.

Docs:

- Expand plugin SDK docs.

### Milestone 10.4: Two-Way Obsidian Vault Awareness

Blueprint sections:

- Section 9 Obsidian Integration.
- Section 15 Roadmap v3.

Scope:

- Track exported files.
- Detect changed notes where File System Access API is available.
- Keep non-Chromium fallback as download/import.

Unit tests:

- Change tracking.
- Conflict metadata.

Browser tests:

- Chromium vault capability path.

Docs:

- Document vault sync limitations.

## Phase 11: Future Vision Readiness

Goal: preserve the blueprint seams for future features without prematurely implementing research-scope systems.

### Milestone 11.1: Memory Engine Empty Interface

Blueprint sections:

- Section 1.1 Capability Layers.
- Section 16 Future Vision.

Scope:

- Add explicit empty memory interface seam.
- Do not implement memory taxonomy yet.

Unit tests:

- Interface exports only.

Docs:

- Document deliberate deferral.

### Milestone 11.2: OCR And Multimodal Importers

Blueprint sections:

- Section 2.1 Content Object Model.
- Section 5.2 OCR.
- Section 16 Future Vision.

Scope:

- Add PDF, screenshot, article, and voice memo import support incrementally.
- Use OCR through provider abstraction.

Unit tests:

- OCR task routing.
- Content subtype compatibility.

Docs:

- Document multimodal pipeline extensions.

### Milestone 11.3: Chat And RAG UI

Blueprint sections:

- Section 7 Retrieval Engine.
- Section 16 Future Vision.

Scope:

- Build chat as UI on top of retrieval and context building.
- Do not create a second retrieval system.

Unit tests:

- Context builder.
- Retrieval strategy selection.

Docs:

- Document RAG flow.

## Cross-Cutting Test Policy

Every milestone must include:

- Unit tests for public APIs and edge cases.
- Integration tests when crossing package boundaries.
- Browser tests for OPFS, IndexedDB, Workers, File System Access API, Web Crypto, PWA behavior, or browser feature detection.
- Failure tests for unsupported APIs, cancellation, storage quota, malformed AI output, missing assets, and provider unavailability.

Required commands before milestone completion:

```bash
pnpm verify
pnpm test:e2e
```

Additional commands may be added per package as implementation grows.

## Cross-Cutting Documentation Policy

Every milestone must update one or more of:

- `docs/architecture.md`
- `docs/interfaces.md`
- `docs/testing.md`
- Package-level README files when public APIs are introduced.

Documentation must identify:

- Blueprint sections implemented.
- Public interfaces.
- Storage boundaries.
- Browser compatibility considerations.
- Manual verification steps.

## Approval Gates

Implementation stops after each milestone unless the user explicitly approves the next milestone.

Each milestone report must include:

- Goal.
- Blueprint sections used.
- Dependencies.
- Files created.
- Files modified.
- Folder tree.
- Implementation summary.
- Explanation.
- Edge cases.
- Tests.
- Manual verification.
- Remaining work.
- Next milestone.

## Immediate Next Milestone

Next planned milestone:

```text
Milestone 1.1: SvelteKit Web App Shell
```

This milestone creates the browser app shell only. It must not implement storage, AI, ingestion, retrieval, graph, export, or plugin subsystems.
