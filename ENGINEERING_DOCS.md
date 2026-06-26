# Watchn't V2 — Engineering Reference Library

> **Document Type**: Expanded Engineering Documentation Set
> **Status**: Approved — derived from `PROJECT.md`, `SPEC.md`, and `ARCHITECTURE.md` (single source of truth)
> **Version**: 2.0.0
> **Last Updated**: June 26, 2026
> **Audience**: Coding AIs and human engineers implementing Watchn't V2

---

## How to Read This Document

This file consolidates twelve repository-level documents into one reference. Each top-level section below corresponds to a document that would normally live at the repository root (`DECISIONS.md`, `ROADMAP.md`, `CODING_STANDARDS.md`, etc.). They are combined here for review purposes; when committed to the repository, each `#`-level section should be split into its own file at the path implied by its heading.

**This document does not introduce new architecture.** Every claim here is either:

1. A direct expansion of a decision already recorded in `PROJECT.md`, `SPEC.md`, or `ARCHITECTURE.md`, with added context on *why* it exists and what it costs, or
2. An explicit, clearly-labeled **implementation note** — a detail needed to actually build what those three documents specify (for example, how Manifest V3's lack of DOM access in service workers is reconciled with the documented audio-capture flow), which does not alter any interface, schema, dependency direction, or technology choice already decided.

Where the three source documents are silent on a topic this template requests (such as UX philosophy or contributor workflow), this document proposes a position **consistent with** the stated design principles, tech stack, and non-goals, rather than inventing new constraints that would conflict with them. Wherever it does so, it says so explicitly.

**Table of Contents**

1. [DECISIONS.md](#decisionsmd)
2. [ROADMAP.md](#roadmapmd)
3. [CODING_STANDARDS.md](#coding_standardsmd)
4. [TESTING.md](#testingmd)
5. [SECURITY.md](#securitymd)
6. [AI_PROVIDER_SPEC.md](#ai_provider_specmd)
7. [MEMORY_ENGINE.md](#memory_enginemd)
8. [EXTENSION_ARCHITECTURE.md](#extension_architecturemd)
9. [STORAGE.md](#storagemd)
10. [UX_GUIDELINES.md](#ux_guidelinesmd)
11. [CONTRIBUTING.md](#contributingmd)
12. [IMPLEMENTATION_GUIDE.md](#implementation_guidemd)

---

# DECISIONS.md

> Architecture Decision Records (ADRs) for Watchn't V2. Each record documents a decision that is already final per `PROJECT.md` / `SPEC.md` / `ARCHITECTURE.md`. Nothing here reopens a decision — it explains the reasoning so that future engineers (human or AI) do not accidentally undo it while "improving" something nearby.

## ADR Index

| # | Decision | Status |
|---|---|---|
| 1 | Server-Side Intelligence over Local-First / Client-Only Processing | Final |
| 2 | Python Backend, TypeScript Frontend (Split, Not Shared) | Final |
| 3 | Schema-First API Design via Pydantic | Final |
| 4 | PostgreSQL as System of Record (over SQLite / MySQL / MongoDB) | Final |
| 5 | pgvector In-Database Vector Search (over Pinecone / Qdrant / Weaviate) | Final |
| 6 | Redis as Unified Cache, Queue Broker, and PubSub | Final |
| 7 | Celery for Background Task Orchestration | Final |
| 8 | Extension-First Capture over Bot-Based Capture | Final |
| 9 | Chrome Extension as a Thin, AI-Free Capture Client | Final |
| 10 | litellm Provider Abstraction (Cloud, Local, and BYOK) | Final |
| 11 | Versioned, File-per-Prompt Architecture | Final |
| 12 | Parallel-Then-Sequential Intelligence Pipeline | Final |
| 13 | Three-Layer Memory Model (Raw → Structured → Semantic) | Final |
| 14 | Relational Knowledge Graph in V2, Deferred Graph Database in V3 | Final |
| 15 | Recency-Weighted RAG Retrieval with Context-Window Truncation | Final |
| 16 | Multi-Format Export with Size-Based Sync/Async Generation | Final |
| 17 | Monorepo with Enforced Package Boundaries | Final |
| 18 | Dual Authentication Model: JWT Cookies (Web) + API Keys (Extension) | Final |

---

### ADR-1: Server-Side Intelligence over Local-First / Client-Only Processing

**Decision**: All AI processing — transcription, diarization, summarization, embedding — runs on the server (the user's own self-hosted server, or a future managed deployment). The browser extension and web app never run models locally and never see raw model weights.

**Context**: Meeting-copilot products can be built two ways: (a) push intelligence into the browser/device, keeping the server as a thin sync layer, or (b) push intelligence into the server, keeping the client as a thin capture/render layer. Watchn't's earlier exploratory direction leaned toward a browser-native, locally-processed model. V2 deliberately reverses that emphasis.

**Alternatives Considered**:
- **Fully local processing** (in-browser Whisper via WASM, in-browser embeddings, local-only LLM via WebGPU or a paired local runtime). Rejected for V2: browser resource limits, tab/service-worker lifecycle constraints, and Manifest V3 background-page restrictions would cap model size and reliability well below what `faster-whisper large-v3` and `pyannote.audio 3.x` deliver server-side.
- **Hybrid (light local pre-processing, heavy server post-processing)**. Rejected as premature complexity: it introduces two transcription code paths to maintain and reconcile before V2 has proven the simpler single-path server pipeline.

**Why Chosen**: The browser is not a reliable compute environment for sustained, accuracy-critical ML inference across a 30–90 minute meeting. Server-side processing removes browser resource ceilings and tab/extension sandboxing from the critical path of output quality, per the "Server-Side Intelligence" principle in `PROJECT.md` §3. It also lets every AI capability (new providers, new extraction prompts, model upgrades) ship as a server deploy with zero extension re-publication or Chrome Web Store review cycle.

**Trade-offs**: Privacy is now a function of *who controls the server*, not "data never leaves the device." The mission statement compensates for this directly: the system must be self-hostable, must never route data through Watchn't-operated infrastructure, and must let the user supply their own LLM/embedding credentials. Server-side processing also means a meeting cannot be processed if the server is unreachable — there is no offline degraded mode in V2.

**Long-Term Consequences**: This decision is the reason a "Local-only mode" is listed as a V4+ aspiration in `PROJECT.md` §11 rather than a V2 feature — going fully local later is additive (new provider/runtime targets behind the existing `litellm` abstraction and a local Whisper/embedding swap), not a rewrite. Any future proposal to move transcription or embedding into the browser must be evaluated as a new ADR, not folded silently into extension work, because it would reintroduce exactly the reliability variable this decision was written to avoid.

---

### ADR-2: Python Backend, TypeScript Frontend (Split, Not Shared)

**Decision**: The backend is 100% Python (FastAPI, Celery, SQLAlchemy). The web app and extension are 100% TypeScript. No shared package, no code generation bridge, no Python running client-side, no Node.js running server-side.

**Context**: The AI/ML ecosystem (Whisper variants, pyannote, litellm, embedding clients, NLP tokenizers) is overwhelmingly Python-native. The frontend ecosystem (React, Next.js, shadcn/ui) is overwhelmingly TypeScript-native.

**Alternatives Considered**: A Node.js backend (as an earlier iteration of this project used, evidenced by the `shared/llm.js` if/else provider chain referenced in `SPEC.md` §3.2) calling out to Python microservices for ML workloads. Rejected because it reintroduces a cross-language IPC boundary (HTTP or gRPC between Node and Python) purely to wrap libraries that already have first-class Python APIs — the original reason this rewrite exists.

**Why Chosen**: One process boundary is strictly fewer failure modes than two. A single Python backend can call `faster-whisper`, `pyannote.audio`, and `litellm` in the same process/event loop as the API and the Celery workers, with no serialization tax at the AI boundary. TypeScript stays where its type system earns its keep: UI state, form validation, API client contracts.

**Trade-offs**: Engineers need fluency in two languages and two dependency ecosystems (`pyproject.toml` + `package.json`) instead of one. There is no shared validation/type layer between server and client — the OpenAPI schema generated by FastAPI's Pydantic models is the *only* contract, and any drift between it and the hand-written TypeScript API client is a runtime bug, not a compile-time one, until codegen is introduced.

**Long-Term Consequences**: Because there is no shared types package, every new field added to a Pydantic response model must be manually mirrored in the corresponding TypeScript type. This is an accepted, bounded cost (see `CODING_STANDARDS.md` Import Rules) rather than a gap to "fix" by introducing a shared package — a shared package would couple `apps/web` and `server/`'s release cadence, which the package boundary rules in `ARCHITECTURE.md` §3 explicitly forbid.

---

### ADR-3: Schema-First API Design via Pydantic

**Decision**: Every request and response body is a Pydantic v2 model, defined before the endpoint that uses it is implemented.

**Context**: Without an enforced contract, API shapes drift implicitly — fields get added in the handler body, optional became required without anyone noticing, and the frontend learns about breaking changes from a 422 in production.

**Alternatives Considered**: Implicit dict-based responses (`return {"id": meeting.id, ...}`) validated only by convention. Rejected outright by the "Explicit Over Implicit" principle in `PROJECT.md` §3 — there is no way to audit an implicit response shape without reading every call site.

**Why Chosen**: Pydantic models double as the OpenAPI schema source, the request validator, and (via `response_model=`) the response serializer/filter — one artifact does three jobs. This is the cheapest way to get "always documented, always typed, always enforced" without a separate schema language (e.g., maintaining `.proto` or JSON Schema files by hand).

**Trade-offs**: Every new field requires touching the model file in `server/app/models/` *before* touching the handler — this is friction by design (see `IMPLEMENTATION_GUIDE.md`, Build Order Philosophy). Pydantic v2's stricter validation also means malformed but "close enough" client payloads (e.g., a stringified int where an int is expected, without coercion configured) fail loudly rather than being silently coerced, which is intentional per "Fail Loud, Recover Gracefully."

**Long-Term Consequences**: This decision is what makes the forbidden-import rule "`api` must never import from `db` directly" enforceable in practice — because the API layer only ever speaks in Pydantic models, there is no shape of code in which an API handler could accidentally leak a SQLAlchemy row object to a client, because SQLAlchemy rows are never the response type.

---

### ADR-4: PostgreSQL as System of Record (over SQLite, MySQL, MongoDB)

**Decision**: PostgreSQL 16 is the single primary datastore for all durable application data: users, meetings, segments, speakers, action items, decisions, tags, and embeddings.

**Context**: `SPEC.md` §3.1 lists SQLite, MySQL, and MongoDB as alternatives considered for the primary database role.

**Alternatives Considered**:
- **SQLite** — attractive for a zero-infrastructure, single-binary deployment story, but it has no native vector type, weak concurrent-write characteristics under a multi-worker Celery setup, and no first-class full-text search comparable to PostgreSQL's `tsvector`/GIN indexes. A SQLite-based design would force embeddings and search into a *second* datastore anyway, which defeats the simplicity it offers.
- **MySQL** — viable relationally, but lacks an in-database vector extension as mature as `pgvector` at the time of this decision, which would again force a second datastore for semantic search.
- **MongoDB** — flexible schema is not a benefit here: the domain (meetings, segments, action items, decisions) is highly relational with real foreign-key integrity needs (cascading deletes when a meeting is deleted, for example), which is exactly what a document store is weakest at enforcing.

**Why Chosen**: PostgreSQL is the only option in the comparison set that satisfies ACID guarantees, relational integrity, full-text search, *and* vector search in one engine, which directly supports the "No Mandatory [external service sprawl]" spirit of `PROJECT.md`'s self-hosting goal (G6): `docker compose up` only needs to start one database container to get transactional storage, FTS, and ANN vector search.

**Trade-offs**: PostgreSQL is a heavier single dependency than SQLite for hobbyist/local-only deployments — there is no "just a file on disk" mode in V2. This is accepted because G6 only requires Docker Compose, not zero dependencies.

**Long-Term Consequences**: Because embeddings live in the *same* database as the rows they describe, every semantic search query can `JOIN` directly against `meetings`, `speakers`, and `action_items` in a single round trip (see `STORAGE.md` §11.1, `ARCHITECTURE.md` §15.2). Migrating away from Postgres later would mean re-deriving this join capability in application code — a strong reason this decision should not be revisited without a corresponding ADR superseding this one.

---

### ADR-5: pgvector In-Database Vector Search (over Pinecone, Qdrant, Weaviate, Milvus)

**Decision**: Semantic search uses `pgvector`'s HNSW index inside PostgreSQL rather than a dedicated vector database.

**Alternatives Considered**: Pinecone (managed, paid, violates the self-hosting goal outright), Qdrant, Weaviate, Milvus (all self-hostable, all require their own container, their own backup strategy, and their own consistency model relative to Postgres).

**Why Chosen**: `pgvector` eliminates an entire class of dual-write consistency bugs — "insert the meeting row but the embedding write to the vector DB failed" is a problem that simply does not exist when both writes are part of the same Postgres transaction. For the scale V2 targets (single user or small team, not yet multi-tenant SaaS), HNSW recall and latency inside Postgres are sufficient.

**Trade-offs**: `pgvector` does not scale as gracefully past roughly ten million vectors as a purpose-built vector engine. `SPEC.md` §3.1 names this explicitly: *"Migrate to Qdrant if >10M vectors."*

**Long-Term Consequences**: This decision is conditionally reversible and the condition is already written down. Any future migration to Qdrant should be triggered by the stated 10M-vector threshold, not by a desire for marginal latency improvement at small scale — introducing a second datastore before that threshold reintroduces the dual-write consistency problem this ADR exists to avoid.

---

### ADR-6: Redis as Unified Cache, Queue Broker, and PubSub

**Decision**: A single Redis 7 instance serves four distinct roles: Celery broker, embedding cache, rate-limit counters, and real-time PubSub for WebSocket fan-out.

**Alternatives Considered**: RabbitMQ or Kafka for the queue role specifically (more purpose-built, but Redis is "good enough" at V2's task volume and adds zero additional infrastructure); Memcached for the cache role specifically (simpler, but lacks PubSub and the data-structure flexibility used for the live-meeting transcript buffer in `STORAGE.md` §11.2).

**Why Chosen**: One piece of infrastructure performing four jobs is fewer moving parts to operate, monitor, and back up than four specialized pieces of infrastructure, which is consistent with the "Reliability over features" design principle in `PROJECT.md` §4.

**Trade-offs**: Redis-as-everything means a single point of contention: if the rate limiter and the PubSub fan-out and the Celery broker are all hammering the same instance under load, they compete for the same connection pool and CPU. This is an accepted V2-scale trade; `IMPLEMENTATION_GUIDE.md`'s "Things That Must Never Change" section flags Redis-role-separation (e.g., a dedicated Redis instance per role) as the correct *next* step, not a V2 requirement.

**Long-Term Consequences**: Every new feature that wants to "just cache something in Redis" must use a key pattern that includes `user_id` or `meeting_id` (see `ARCHITECTURE.md` §16.5, Data Isolation) — because Redis has no concept of row-level security the way Postgres queries do, key-naming discipline is the *only* thing preventing cross-user data leakage through the cache layer.

---

### ADR-7: Celery for Background Task Orchestration

**Decision**: All asynchronous, multi-step, or long-running work (transcription, diarization, the intelligence pipeline, embedding, notification, export) runs as Celery tasks, never inline in an API request handler.

**Alternatives Considered**: BullMQ (Node-native, irrelevant given ADR-2), Dramatiq (simpler API, smaller ecosystem), Huey (lighter-weight, fewer monitoring tools).

**Why Chosen**: Celery is the most mature Python task queue with the best operational tooling (Flower for monitoring, well-understood retry/backoff semantics, task chaining and grouping primitives that directly express the documented pipeline: `group()` for the three parallel intelligence extractions, chained `.delay()` calls for the sequential transcription → diarization → intelligence flow).

**Trade-offs**: Celery's configuration surface is large, and its failure modes (worker memory growth, task result backend bloat, "zombie" tasks after a worker crash) require active operational attention that a simpler queue would not. `SPEC.md` §3.1 names this explicitly as "complex but battle-tested," with Dramatiq flagged as the fallback if this trade-off proves wrong in practice.

**Long-Term Consequences**: Because every AI-pipeline step is already a discrete Celery task with a defined input/output contract (see `AI_PROVIDER_SPEC.md`), adding a new pipeline step (e.g., a future PII-redaction pass) is additive: a new task plus a new edge in the task chain, not a restructuring of the request-handling code path.

---

### ADR-8: Extension-First Capture over Bot-Based Capture

**Decision**: V2 captures meeting audio exclusively via the Chrome extension reading the user's own browser tab. No bot joins calls as a participant.

**Context**: `PROJECT.md` §6 (Non-Goals) explicitly defers "Zoom / Teams bot integration" to V3, citing platform-approval and bot-management complexity.

**Alternatives Considered**: A server-side bot that joins Zoom/Teams/Meet calls as a visible (or "invisible") participant. This is the dominant pattern among commercial AI meeting-note competitors.

**Why Chosen**: Bot-based capture requires per-platform API approval, ongoing maintenance against platform UI/API changes, and raises a distinct consent/visibility question (a bot is a separate "attendee" other participants see). Extension-first capture only requires the *host user's own browser* to cooperate, which is a strictly smaller integration surface and aligns with "no bots joining video calls" stated as a mission constraint in `PROJECT.md` §2.

**Trade-offs**: Extension-first capture only works for meetings the user is *hosting in their own browser tab* — it cannot capture a meeting the user merely dials into by phone, and it cannot capture meetings where the user is not the one with the extension installed and tab open. This is the direct cause of Non-Goal "Mobile native app" (a phone has no extension surface) and explains why "Zoom/Teams bot integration" is explicitly the V3 mechanism for expanding capture to calls the user doesn't host.

**Long-Term Consequences**: Any V3 bot-capture work must be additive to, not a replacement for, the extension path — per `PROJECT.md` §11, bot capture "expands capture to calls where the user is not the one hosting the tab," implying both capture mechanisms coexist rather than one superseding the other.

---

### ADR-9: Chrome Extension as a Thin, AI-Free Capture Client

**Decision**: The extension contains zero AI logic. It does not run Whisper, does not call any LLM, does not store LLM provider credentials, and holds no state beyond the active capture session.

**Context**: `PROJECT.md` §6 lists "Chrome extension AI processing" as Out of Scope "by design" — not deferred, not a maturity gap, a permanent architectural boundary.

**Why Chosen**: This is the client-side enforcement of ADR-1. If the extension were permitted to hold even one LLM call, every future "should this run client-side or server-side" question would require re-litigating ADR-1 case by case. Drawing the line at "the extension captures and uploads bytes; it does not interpret them" makes the boundary mechanically checkable (no API keys for OpenAI/Anthropic ever appear in `apps/extension/`) rather than a matter of judgment.

**Alternatives Considered**: A "smart" extension that does lightweight local pre-filtering (e.g., voice-activity detection to skip uploading silence). Rejected for V2 — even this modest amount of client-side intelligence was judged not worth the precedent it sets; `SPEC.md` §10.1 enumerates this boundary as a non-negotiable list of what the extension does *not* do.

**Trade-offs**: Every 10-second chunk is uploaded regardless of whether it contains speech or silence, which is bandwidth-inefficient compared to a VAD-filtered approach. This is accepted because Opus-encoded silence is small (see `EXTENSION_ARCHITECTURE.md` §"Audio Capture"), and the simplicity of "always upload, let the server decide" was judged more valuable than the bandwidth savings.

**Long-Term Consequences**: This is the architectural reason the extension can ship to the Chrome Web Store far more often and with far less review risk than the server: a thin client with no model weights, no provider keys, and no AI behavior is a much smaller trust surface for both Google's review process and the end user evaluating extension permissions.

---

### ADR-10: litellm Provider Abstraction (Cloud, Local, and BYOK)

**Decision**: Every LLM call goes through a single `complete()` function (`server/app/ai/llm.py`) wrapping `litellm.completion()`. Provider selection is entirely a `model` string prefix (`anthropic/`, `openai/`, `gemini/`, `openrouter/`, `ollama/`) — no provider-specific code paths exist anywhere else in the codebase.

**Context**: `SPEC.md` §3.2 documents the alternative this replaces: a 100-line if/else provider-routing chain in a legacy `shared/llm.js` file.

**Alternatives Considered**: Manual provider switching (the legacy approach — rejected, it is the problem being solved); LangChain's model abstraction (rejected as heavier than needed — Watchn't does not need LangChain's chain/agent constructs, only unified `completion()`/embedding calls).

**Why Chosen**: `litellm` supports over a hundred providers behind one function signature, including `ollama/` for fully local models. This single decision is what makes three separate product requirements true simultaneously: **BYOK** (the user supplies their own `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` via environment configuration — see `server/app/core/config.py`'s `llm_api_key: str | None`), **local LLM support** (the `ollama/llama3.1` model string requires zero code changes to use), and **provider abstraction** (switching from Claude to GPT-4.1 to a local Llama is a one-line config change, never a deploy).

**Trade-offs**: `litellm` is a dependency the whole AI subsystem trusts to correctly normalize behavior (tool calling, structured outputs, streaming, token counting) across genuinely different provider APIs. Edge-case bugs in `litellm`'s provider-specific translation layer become Watchn't's bugs by inheritance, and are harder to work around than a hand-rolled client for a single provider would be.

**Long-Term Consequences**: "Future Provider Support" (per `SPEC.md` §16) is, by construction, never a backend engineering task — it is a configuration change. This decision is the reason `AI_PROVIDER_SPEC.md` can specify model routing, fallback, and retry strategy entirely in terms of model strings rather than per-provider client code.

---

### ADR-11: Versioned, File-per-Prompt Architecture

**Decision**: Every distinct extraction task (summary, action items, decisions, context synthesis) is its own Python module under `server/app/ai/prompts/`, each exporting a `VERSION` string, a `SYSTEM_PROMPT` constant, a Pydantic output model, and a `build_user_prompt()` function.

**Why Chosen**: A prompt change that degrades output quality needs to be attributable to *exactly* the meetings processed under that prompt version, not guessed at retroactively. Storing `VERSION` alongside every generated artifact (implicitly, via the prompt module that produced it) is what makes "which prompt version produced which output" answerable, per `ARCHITECTURE.md` §7.2.

**Alternatives Considered**: Prompts as free-floating string constants or, worse, inline f-strings inside the worker function that calls the LLM. Rejected — this makes the "Explicit Over Implicit" principle impossible to honor for the single highest-variance part of the system (LLM output quality depends entirely on prompt wording, which is exactly the part least safe to leave undocumented).

**Trade-offs**: This pattern produces more files and more ceremony per prompt than a "just write the prompt where you use it" approach. The ceremony is the point — it forces a Pydantic output schema to exist *before* the prompt is written, which front-loads structured-output design instead of bolting it on after the fact.

**Long-Term Consequences**: A/B testing or staged rollout of a new prompt version is structurally trivial under this pattern (run both modules, compare `SummaryOutput` quality), which is named directly as the versioning rationale in `ARCHITECTURE.md` §7.2. Any engineer tempted to "simplify" a prompt module by inlining it should treat that temptation as a signal they have not yet needed to debug a regression across prompt versions.

---

### ADR-12: Parallel-Then-Sequential Intelligence Pipeline

**Decision**: After a meeting ends, `summary_task`, `action_items_task`, and `decisions_task` run concurrently via `asyncio.gather()`; only after all three complete does the sequential `context_task` run to merge and deduplicate their outputs.

**Why Chosen**: The three extraction tasks are independent reads of the same transcript with no data dependency on each other — there is no reason for `decisions_task` to wait on `summary_task`. Running them concurrently is what gets total pipeline latency from roughly 30 seconds (sequential) to roughly 10 seconds (parallel), directly serving the Success Metric of sub-30-second intelligence-phase latency (`PROJECT.md` §9).

**Alternatives Considered**: A single mega-prompt asking one LLM call to produce summary, action items, and decisions all at once. Rejected: a single call conflates three different output schemas into one JSON blob, makes per-task retry impossible (a malformed `action_items` array would force re-running the whole call, including the perfectly good summary), and makes independent prompt versioning per ADR-11 impossible.

**Trade-offs**: Three concurrent LLM calls instead of one means three times the request overhead and three separate points of failure to handle (a transient timeout on `decisions_task` alone must not fail the entire pipeline). The sequential `context_task` is a single point of serialization at the end of an otherwise-parallel pipeline — it cannot start until the slowest of the three parallel calls finishes.

**Long-Term Consequences**: Any future fourth extraction task (e.g., a sentiment-trend task) should join the parallel group, not be appended sequentially after `context_task` — sequential placement should be reserved for tasks that genuinely depend on the merged output, exactly as `context_task` does.

---

### ADR-13: Three-Layer Memory Model (Raw → Structured → Semantic)

**Decision**: Meeting knowledge is stored in three distinct layers: raw storage (audio + segments + speakers), structured intelligence (summaries, action items, decisions, topics), and semantic memory (embeddings + full-text index). See `MEMORY_ENGINE.md` for the full lifecycle.

**Why Chosen**: Each layer has a different retention policy, a different consumer, and a different failure tolerance, and conflating them would force one retention/consistency policy onto all three. Raw audio is the most expensive to store and the least necessary to keep forever (a transcript is a sufficient permanent record of *what was said*; the audio is mainly useful briefly, for QA or playback). Structured intelligence is the primary user-facing asset and must be permanent. Semantic memory is *derived* from structured intelligence and is therefore regenerable — losing the embeddings table is a re-embedding job, not data loss, as long as the transcript (Layer 1) survives.

**Alternatives Considered**: A flat model where audio, transcript, and embeddings share one retention policy. Rejected — it would force keeping 90 days of audio forever just because the transcript needs to live forever, which directly contradicts the 90-day audio retention decision in `ARCHITECTURE.md` §8.4 and bloats object storage for no benefit.

**Trade-offs**: Three layers means three places a "memory" concept can live, and any engineer adding a new kind of meeting knowledge must correctly classify which layer it belongs to (see `MEMORY_ENGINE.md`'s Memory Lifecycle section) rather than bolting it onto whichever layer is closest at hand.

**Long-Term Consequences**: This layering is what makes audio's 90-day expiry (a cost-control measure) safe to enforce without any loss of search, chat, or summary capability — every capability the product actually exposes to users is built on Layers 2 and 3, which are permanent by design.

---

### ADR-14: Relational Knowledge Graph in V2, Deferred Graph Database in V3

**Decision**: V2's "knowledge graph" is a set of relational joins across `meetings`, `tags`/`meeting_tags`, `speakers`, `action_items`, and `decisions` in PostgreSQL — not a graph database. Neo4j with explicit entity extraction is named as a V3 target in `PROJECT.md` §11 and `ARCHITECTURE.md` §14.3.

**Why Chosen**: The cross-meeting queries V2 actually needs to answer ("all open action items for this user across all meetings," "meetings sharing a tag," "speaker participation stats") are expressible as straightforward SQL joins, as demonstrated directly in `ARCHITECTURE.md` §14.2. Standing up a graph database to answer queries that SQL already answers correctly would be infrastructure added for its own sake, violating "Reliability over features."

**Alternatives Considered**: Adopting Neo4j (or another graph database) in V2 directly. Rejected as premature — the relationship types V2 actually models (meeting-has-tag, meeting-has-speaker, meeting-has-action-item) are shallow, one-hop relationships with no need for graph traversal algorithms (shortest path, centrality, multi-hop pattern matching) that would justify a dedicated graph engine.

**Trade-offs**: The relational model cannot answer genuinely graph-shaped questions — `ARCHITECTURE.md` §14.3's example, *"all decisions connected to Person X across meetings that referenced Project Y,"* requires a multi-hop traversal that is awkward (though not impossible) to express as nested SQL joins, and gets more awkward as more entity types are added.

**Long-Term Consequences**: V3's Neo4j migration is explicitly scoped as a *replacement* of the "simplified tag-based graph" (`PROJECT.md` §11), not an addition alongside it — meaning the relational tables (`tags`, `meeting_tags`) should be treated as a *deprecation candidate* once true entity extraction and a graph database exist, not as a permanent parallel system.

---

### ADR-15: Recency-Weighted RAG Retrieval with Context-Window Truncation

**Decision**: RAG chat retrieval re-ranks the top-K vector search results using `score = 0.7 × similarity + 0.3 × recency_score`, then truncates the oldest chunks first if the assembled context would exceed 80% of the target model's context window.

**Why Chosen**: Pure cosine-similarity ranking treats a highly relevant meeting from fourteen months ago identically to one from yesterday, but for an "organizational memory" product, recent context is disproportionately likely to reflect current decisions and supersede older ones. The 70/30 weighting is a deliberate bias toward recency without discarding relevance entirely. Truncating the *oldest* chunks first (rather than, say, the least similar) when the context window is tight is the same recency bias applied at the truncation boundary — it preserves the chunks most likely to reflect the current state of a decision.

**Alternatives Considered**: Pure similarity ranking with no recency term. Rejected because it would surface stale, superseded context with the same confidence as current context, with no signal to the LLM (or the user) that it's reading something old.

**Trade-offs**: The 70/30 weighting and `1 / (1 + days_since_meeting)` recency decay (per `ARCHITECTURE.md` §15.2) are fixed constants, not learned or tunable per-user. A user who genuinely wants to ask about something from a year ago will see that result ranked lower than a less-relevant recent one, with no current mechanism to override the recency bias for a single query.

**Long-Term Consequences**: If user feedback in V2 shows the recency bias actively hurts answer quality for long-history users, the fix should be a tunable weighting (e.g., a query-time toggle) rather than removing the recency term outright — the term exists for a stated product reason (organizational memory should reflect *current* truth), not as an arbitrary default.

---

### ADR-16: Multi-Format Export with Size-Based Sync/Async Generation

**Decision**: Exports support Markdown, JSON, and PDF, generated synchronously for meetings under 50 segments and asynchronously via Celery (with a presigned MinIO URL) for meetings at or above that threshold.

**Why Chosen**: Markdown and JSON are nearly free to generate (template rendering / direct serialization) even for long meetings. PDF generation via WeasyPrint (HTML→PDF rendering) is comparatively expensive and scales with transcript length; forcing a user to wait on a synchronous HTTP request for a PDF of a two-hour meeting would violate the sub-200ms p95 API response target (`PROJECT.md` §9) for an operation that has no business being that fast in the first place.

**Alternatives Considered**: Always-synchronous export. Rejected for the reason above. Always-asynchronous export (even for a five-minute meeting). Rejected as unnecessary latency and complexity for the common case — most exports are small enough to return immediately.

**Trade-offs**: The 50-segment threshold is a heuristic, not a measured boundary tied to an actual generation-time SLA — a meeting with 49 unusually long segments could still be slow to export synchronously. This is an accepted approximation pending real production telemetry.

**Long-Term Consequences**: New export formats (per the Future Extension Points table in `SPEC.md` §16, "new template in `export_service.py`") should be evaluated against this same size/cost split before defaulting to synchronous generation — a format more expensive than PDF should *lower* the synchronous threshold, not reuse 50 segments unexamined.

---

### ADR-17: Monorepo with Enforced Package Boundaries

**Decision**: One repository (`watchnt/`) holds `apps/web`, `apps/extension`, and `server/`, each independently buildable, with import-linting in CI enforcing the dependency directions documented in `ARCHITECTURE.md` §3.

**Why Chosen**: A monorepo keeps cross-cutting changes (e.g., an API contract change that touches both `server/app/models/meeting.py` and the TypeScript client in `apps/web/lib/`) in one PR and one CI run, which matters more than the alternative's benefit (independent versioning/release of each app) at Watchn't's current team size and release cadence.

**Alternatives Considered**: Polyrepo (separate repositories for web, extension, and server). Rejected — V2 is a single coordinated product release, not three independently-versioned products; the coordination overhead of a polyrepo (synchronizing API contract changes across repo boundaries, three separate CI pipelines, three separate versioning schemes) outweighs its benefits at this stage.

**Trade-offs**: A monorepo without shared packages (per ADR-2) gets some of polyrepo's coordination cost back — `apps/web` and `server/` still drift independently in practice, just within one repository instead of two, because there is no shared types package forcing them to stay in lockstep (see ADR-2's trade-off).

**Long-Term Consequences**: The "forbidden dependencies" list in `ARCHITECTURE.md` §3 (e.g., `apps/web` must never import from `apps/extension`) is only enforceable *because* this is a monorepo with CI-level import linting — a polyrepo would have made the same rule unenforceable by construction (there'd be no import path to even attempt). Splitting into a polyrepo later would require replacing this enforcement mechanism with something else (contract tests, versioned published packages) before the boundary discipline could survive the split.

---

### ADR-18: Dual Authentication Model — JWT Cookies (Web) + API Keys (Extension)

**Decision**: The web app authenticates via a short-lived (15-minute) JWT access token plus a long-lived (7-day) `httpOnly` refresh cookie. The extension authenticates via a long-lived, user-generated, revocable API key sent as `X-API-Key`.

**Why Chosen**: These are different trust models for different clients. The web app is a browser tab that can use `httpOnly` cookies (inaccessible to JS, mitigating XSS token theft) and benefits from short-lived access tokens because a human is actively present to re-authenticate. The extension is a background service worker with no cookie jar shared with the web app's origin (cross-origin by nature) and needs a credential that survives indefinitely without requiring the user to "log in" a machine client — an API key that the user can see, name, and revoke from the web app settings page is the right shape for that.

**Alternatives Considered**: Using JWTs for the extension too. Rejected — per `ARCHITECTURE.md` §16.1's rationale, extensions cannot use `httpOnly` cookies across origins, and a long-lived session token stored in `chrome.storage.local` would functionally *be* an API key anyway, just without the explicit revocation UX a named API key provides.

**Trade-offs**: Two authentication code paths (`core/security.py`'s JWT logic and the separate API-key-hash lookup) must both be kept correct and both audited for the same classes of bugs (timing attacks on comparison, proper hashing) independently, since they don't share an implementation.

**Long-Term Consequences**: Any third client added later (a future mobile app, a future CLI) must consciously choose which of these two trust models it matches, rather than inventing a third pattern — `IMPLEMENTATION_GUIDE.md`'s guardrails treat this as a closed set of two patterns, not an open one.


---

# ROADMAP.md

> **Versioning note**: To avoid colliding with Watchn't's own product-version labels (`PROJECT.md` calls the current build target "V2 MVP," and its own future plans "V3" and "V4+"), this roadmap's four sections map as follows: **MVP** = V2 MVP (this build). **Version 2** (of this roadmap) = the product's documented **V3** targets. **Version 3** (of this roadmap) = the product's documented **V4+** Long-Term Vision items. **Long-Term Vision** (of this roadmap) = an aspirational extrapolation beyond anything currently committed in the source documents, explicitly labeled as such.

## MVP (maps to product "V2 MVP")

### Deliverables

| Deliverable | Source |
|---|---|
| Chrome extension: tab audio capture, chunked upload | `PROJECT.md` §10, `ARCHITECTURE.md` §12 |
| FastAPI backend: meetings, transcripts, search, chat, export, auth, webhooks | `ARCHITECTURE.md` §2 |
| Real-time transcript + intelligence push via WebSocket | `ARCHITECTURE.md` §6 |
| Transcription (`faster-whisper`) + diarization (`pyannote.audio`) | `ARCHITECTURE.md` §8 |
| Post-meeting intelligence pipeline (summary, action items, decisions) | `ARCHITECTURE.md` §7.3 |
| Semantic search (pgvector) + full-text search | `ARCHITECTURE.md` §15 |
| RAG chat with source citations | `ARCHITECTURE.md` §15 |
| Email reports (SendGrid/Resend) | `PROJECT.md` §10 |
| Export to Markdown, JSON, PDF | `ARCHITECTURE.md` §10 |
| Self-hosted deployment via `docker compose up` | `PROJECT.md` G6 |
| Email + password auth, JWT, personal API key for extension | `ARCHITECTURE.md` §16.1 |
| Configurable LLM provider via `litellm` | `ARCHITECTURE.md` §13 |

### Milestones (Build Order — from `SPEC.md` Part B §3)

| Phase | Milestone | Depends On |
|---|---|---|
| 1 — Foundation | Docker Compose, PostgreSQL + Alembic, Redis, MinIO, FastAPI scaffold | None |
| 2 — Core Backend | Users + registration, JWT middleware, Meeting/Segment/Speaker models + CRUD | Phase 1 |
| 3 — AI Pipeline | `litellm` wrapper, embedding service, Celery config, transcription/diarization/intelligence workers | Phase 2 |
| 4 — Frontend | Next.js scaffold, auth pages, meeting list/detail, search | Phase 2 (parallel with Phase 3) |
| 5 — Extension | Manifest + scaffold, audio capture, upload to server | Phase 2 |
| 6 — Integration | WebSocket server, live transcript, semantic search, email reports | Phases 3 + 4 |

The recommended literal ticket sequence for the first working slice is documented in `SPEC.md`'s "Recommended Implementation Order" (20 tickets, `INFRA-001` → `AI-007`), which yields a system where meetings can be created, audio uploaded, transcribed, and viewed before any intelligence, search, or chat capability exists. Build that slice first; everything else layers on top of a working transcript pipeline.

### Dependencies (Critical Path)

```
INFRA (Docker/Postgres/Redis/MinIO/FastAPI)
        │
        ▼
AUTH (Users, JWT) ──► DB (Meeting/Segment/Speaker models)
        │                       │
        │                       ▼
        │                AI (litellm, embeddings, Celery, transcription, diarization, intelligence)
        │                       │
        ├───────────────────────┼──────────────► WEB (Next.js, auth pages, meeting list/detail, search)
        │                       │
        ▼                       ▼
EXT (extension scaffold,   RT (WebSocket, live transcript) + SEARCH (semantic search) + INT (email)
     audio capture,
     upload)
```

Independent subsystems that can be built in any order relative to each other once their single upstream dependency exists: **Search** (needs only embeddings), **Export** (needs only meetings), **Notifications** (needs only meetings), **Knowledge Graph / RAG Chat** (needs only embeddings) — per `SPEC.md` Part B §4.

Deferrable-without-blocking-V2-ship subsystems: **Calendar integration** (OAuth + webhook complexity, high value but optional), **Slack integration** (independent, nice-to-have), and notably **the Chrome extension itself** is deferrable relative to the rest of the system — `SPEC.md` Part B §5 notes the web app can accept manual audio upload as a fallback, with the extension adding convenience rather than unlocking core functionality. This is a useful sequencing fact for an implementing AI under time pressure: a backend-and-web-only MVP is a coherent intermediate milestone.

### Success Criteria (from `PROJECT.md` §9)

| Category | Metric | Target |
|---|---|---|
| Reliability | Meeting processing success rate | ≥ 99% |
| Reliability | Transcription accuracy (WER) | ≤ 10% |
| Reliability | End-to-end processing latency after meeting end | ≤ 60s |
| Reliability | Audio capture dropout rate | ≤ 1% of chunks |
| Performance | API response time (p95) | < 200ms |
| Performance | Search latency (p95) | < 500ms |
| Performance | 10s chunk transcription time | < 5s |
| Performance | Full intelligence pipeline | < 30s total |
| Performance | Web app initial load (LCP) | < 2s |
| Performance | WebSocket message delay | < 100ms |
| UX Quality | Action item extraction precision | ≥ 85% (vs. human-labeled set) |
| UX Quality | Summary relevance score | ≥ 4/5 (user survey) |
| UX Quality | Search result relevance (NDCG@5) | ≥ 0.75 (offline eval) |

A feature is not "done" for MVP purposes if it ships without a way to measure its contribution to these numbers — see `TESTING.md`'s AI Evaluation section and `CODING_STANDARDS.md`'s testing expectations.

---

## Version 2 (maps to product "V3" — post-MVP expansion)

These items are explicitly deferred *to* V3 by `PROJECT.md` §6 (Non-Goals) and named as V3 targets in §11. They should not be started before MVP success criteria above are met and stable in production.

**Features**
- **Bot-based capture** (Zoom/Teams): join calls as a participant, expanding capture beyond browser-tab-hosted meetings (ADR-8's stated complement, not a replacement, to extension capture).
- **Organization accounts**: multi-user teams with shared meeting history, role-based access, admin controls.
- **Custom prompt templates per organization**: org-level overrides of the summary/action-item/decision prompt structure and terminology, read from an `org_settings` table per the Future Extension Points pattern in `SPEC.md` §16.
- **Webhook ecosystem**: publish `meeting.ended`, `action_item.created`, and similar events to user-configured endpoints for Zapier/n8n/custom integrations.
- **Mobile-responsive parity push**: full feature parity on the existing responsive Next.js layout (no native app — that remains out of scope until V4+ at the earliest).

**Improvements**
- **Knowledge graph migration to Neo4j** (ADR-14): true graph traversal for relationship queries the relational model in V2 cannot answer cleanly.
- **Compliance mode**: SOC2/HIPAA-adjacent audit logging, data retention policy enforcement, access controls — note `SEC-004` (audit logging for data access) ships in MVP as a foundation this can build on.
- **Multi-language transcription**: moving beyond the V2 English-only baseline (real-time multi-language translation remains a V3+/long-term item, distinct from single-language transcription in another tongue).

**Architecture Evolution**
- Introduce an admin-facing panel (V2 relies on direct database access for operators — acceptable at V2 scale, not at multi-tenant org scale).
- Evaluate Redis role-separation (see ADR-6's long-term consequences) once organization accounts increase concurrent load on the single Redis instance.
- Revisit the `pgvector` 10M-vector threshold from ADR-5 as organization accounts multiply total embedding volume across tenants.

---

## Version 3 (maps to product "V4+" — Long-Term Vision)

Per `PROJECT.md` §11, "Long-Term Vision (V4+)":

- **Proactive intelligence**: surface relevant past decisions before a meeting begins, based on agenda and attendee list.
- **Cross-meeting analytics**: trend analysis — which topics consume the most time, which action items recur unresolved, which decisions get revisited.
- **Autonomous follow-up**: one-click-approved draft follow-up emails and Jira tickets generated from meeting output.
- **Local-only mode**: full offline capability — local Whisper, local embedding model, local LLM, zero external API calls. This is the point at which ADR-1's "alternatives considered" (fully local processing) becomes a first-class supported mode rather than a rejected V2 alternative; it should be built as a new provider/runtime target behind the existing `litellm` and embedding abstractions (ADR-10), not as a parallel pipeline.
- **Multi-language support**: real-time transcription and summarization in the user's own language, beyond the V3 multi-language *transcription* improvement above — this tier implies multi-language *summarization and chat*, not just capture.
- **Plugin SDK**: third-party Watchn't plugins that respond to meeting events and extend the intelligence pipeline, building on V2's webhook ecosystem (Version 2 above) as the event-distribution foundation.

---

## Long-Term Vision (3–5 Year Horizon)

> Everything in this subsection is explicitly **aspirational extrapolation**, not a commitment recorded in `PROJECT.md`, `SPEC.md`, or `ARCHITECTURE.md`. It is included because the prompt for this document requests a long-term vision section, and it is written to be directionally consistent with — and never contradictory to — the mission statement's closing aspiration: *"an indispensable institutional memory layer for any team... automatically captured from the conversations that created it."*

Read literally, that aspiration implies a multi-year trajectory along three axes that are already visible in the V2→V3→V4+ progression above, simply extended further:

1. **Capture breadth**: from one browser tab (V2) → bot-based capture across major platforms (V3) → potentially capture-agnostic ingestion (any audio/transcript source a team already has, including phone calls and recorded video) as the addressable "meeting surface" keeps expanding.
2. **Intelligence depth**: from per-meeting extraction (V2) → cross-meeting analytics and proactive surfacing (V4+) → org-wide institutional pattern recognition (e.g., detecting when a team is about to re-debate a decision it already made), which would be a natural superset of the "Cross-meeting analytics" V4+ item rather than a new direction.
3. **Vendor independence as a durable identity, not a launch feature**: the BYOK/local-LLM/self-hosting posture (ADR-1, ADR-10) is what differentiates Watchn't from SaaS competitors today; sustaining that identity as the product adds organization accounts and compliance features (V3) is the central long-term risk to manage — every future feature should be evaluated against whether it quietly reintroduces a vendor or infrastructure dependency the mission statement explicitly rejects.

This section should be revisited and rewritten with real product data once V2 ships and V3 work begins — long-term roadmaps written before a single user-facing meeting has been processed are, by nature, the part of this document most likely to be wrong in its specifics even where it is right in its direction.


---

# CODING_STANDARDS.md

> These standards expand `SPEC.md` §2.2 and `ARCHITECTURE.md` §4 into enforceable, day-to-day engineering rules. They apply repository-wide unless a section states otherwise.

## TypeScript Conventions

- **Strict mode is non-negotiable**: `tsconfig.json` must have `"strict": true` in both `apps/web` and `apps/extension`. A PR that loosens this setting to work around a type error should be rejected — fix the type, not the compiler flag.
- **No `any`, ever.** Use `unknown` and narrow it with a type guard. If a third-party library has no types, write a minimal `.d.ts` ambient declaration rather than reaching for `any`.
- **Named exports only** — no `export default`. This keeps import statements self-documenting at the call site (`import { MeetingCard } from "./meeting-card"` vs. an anonymous default import that could be named anything) and avoids the well-known refactor hazard where a renamed default export silently breaks nothing at compile time.
- **React: functional components with Hooks only.** No class components anywhere in `apps/web` or `apps/extension`. This is a hard line, not a preference — it keeps state-management patterns (Zustand, TanStack Query) consistent across the entire frontend surface.
- Component props are always fully typed via an explicit `interface` or `type`, never inferred implicitly from usage at the call site.

## React Conventions

- One component per file. The file's named export must match the component name exactly (`meeting-card.tsx` exports `MeetingCard`).
- Co-locate component-specific styles and sub-components in the same folder when a component grows beyond a single file; do not create a parallel "styles" tree that mirrors the component tree.
- Server state (anything that round-trips through the API — meetings, search results, action items) is owned by **TanStack Query**, never duplicated into Zustand. Zustand owns only client-only UI state (sidebar open/closed, active tab, capture-status badge). If a piece of state can be derived from a TanStack Query cache entry, derive it — do not copy it into a store "for convenience."
- Real-time data (live transcript segments arriving over WebSocket) is merged into local state via Zustand, per `ARCHITECTURE.md` §6/`SPEC.md` §6.2 — this is the one case where Zustand legitimately holds server-originated data, because it is push-driven rather than query-driven.

## Folder & Naming Conventions

| Context | Convention | Example |
|---|---|---|
| Python files | `snake_case.py` | `meeting_service.py` |
| Python classes | `PascalCase` | `MeetingService` |
| Python functions | `snake_case` | `get_meeting_by_id` |
| Python constants | `UPPER_SNAKE_CASE` | `MAX_CHUNK_SIZE_MB` |
| TypeScript components (files) | `kebab-case.tsx` | `meeting-card.tsx` |
| TypeScript utilities (files) | `camelCase.ts` | `formatDuration.ts` |
| TypeScript components (symbols) | `PascalCase` | `MeetingCard` |
| TypeScript constants | `UPPER_SNAKE_CASE` | `API_BASE_URL` |
| Database tables | `snake_case`, plural | `meeting_embeddings` |
| Database columns | `snake_case` | `started_at` |
| API routes | `kebab-case` | `/api/v1/action-items` |
| Environment variables | `UPPER_SNAKE_CASE` | `DATABASE_URL` |

These are not aesthetic preferences — they are the literal naming contract `ARCHITECTURE.md` §4 specifies, and CI linting should treat violations as build failures, not style-review comments.

## Package Boundaries & Import Rules

The package responsibility table and forbidden-import list in `ARCHITECTURE.md` §3 are enforced mechanically, not by convention:

```
api/v1/*.py      → services/*.py only (never db/, never ai/ directly)
services/*.py    → db/repositories/*.py, ai/pipeline.py, core/*.py
workers/*.py     → services/*.py, realtime/manager.py
realtime/*.py    → Redis PubSub only
db/*.py          → nothing above it (no services, api, ai, or workers imports)
ai/*.py          → litellm, OpenAI embeddings client — never db
apps/web         ⇎ apps/extension  (never import from each other)
```

A CI import-linter step (e.g., `import-linter` for Python, a custom ESLint rule with `no-restricted-imports` for TypeScript) must fail the build on any violation of this graph. **Do not rely on code review to catch this** — code review catches the import on the day it's written; it does not catch a transitive violation introduced two files away three months later.

## Error Handling

- **No bare `except:` in Python, ever.** Catch the specific exception type. If you genuinely need a catch-all at a boundary (e.g., the outermost FastAPI exception handler), catch `Exception` explicitly and re-raise or log with full context — never silently swallow.
- Every custom exception has: a name, a human-readable message, and a mapped HTTP status code (per `PROJECT.md` Design Principle 8, "Explicit error contracts" — no generic 500s in production).
- Partial failures must not corrupt broader state. A single audio chunk failing to transcribe must not mark the entire meeting as failed — it should be retried (Celery's built-in retry/backoff) and, if it exhausts retries, recorded as a gap in that meeting's segment list, not silently dropped and not a hard failure of the whole pipeline.
- TypeScript: no `try { } catch { }` blocks that discard the error. At minimum, log it with context (which API call, which component) before deciding whether to surface it to the user.

## Logging

- Server logs are structured JSON via `structlog` (per `OBS-001`), never bare `print()` or unstructured string logs.
- Every request is tagged with a `request_id` (UUID v4, generated in middleware) and every log line emitted during that request's lifecycle carries that ID — this is what makes a single failed meeting traceable across the API handler, the Celery task it enqueued, and the worker that processed it.
- **Never log secrets.** No passwords, no API keys (server-side or user-supplied LLM keys), no raw JWTs. This is a hard rule enforced by code review and, ideally, a log-scrubbing middleware as a backstop.
- Log level is configurable via `LOG_LEVEL` env var, not hardcoded per environment in source.

## Documentation

- Every public Python function has a Google-style docstring (per `SPEC.md` §2.2). "Public" means anything importable from outside its own module — internal helper functions prefixed `_` are exempt but still benefit from a one-line comment if their purpose isn't obvious from the name.
- Every TypeScript exported function/component has a JSDoc comment when its purpose or props aren't self-evident from its name and type signature alone — do not document the obvious (`/** Returns the user's name */ function getName()`), document the non-obvious (why a particular debounce interval, why a particular retry count).
- Architectural decisions go in `DECISIONS.md`, not in code comments — a code comment should reference the relevant ADR by number rather than re-explaining the reasoning inline.

## Dependency Management

- Python: `pyproject.toml` is the single source of truth for dependencies; pin major versions, allow patch-level drift. New dependencies require a one-line justification in the PR description — "why does this need a new library" is a real review question, not a formality, because every dependency is a piece of `litellm`'s problem (per ADR-10's trade-off) multiplied across the whole codebase.
- TypeScript: same discipline via `package.json` per app. `apps/web` and `apps/extension` maintain **independent** `package.json` files with no shared `node_modules` hoisting assumption — per ADR-2/ADR-17, there is no shared package between them, and dependency trees should not implicitly assume one exists.
- No dependency is added "for future use." If a ticket doesn't need it yet, it doesn't go in `pyproject.toml`/`package.json` yet — this mirrors `IMPLEMENTATION_GUIDE.md`'s "No Speculative Abstractions" rule applied to dependencies specifically.

## Clean Architecture Rules

The system is already layered (`api` → `services` → `db`/`ai`) per `ARCHITECTURE.md` §3. The Clean Architecture discipline this implies:

- **Services know nothing about HTTP.** A `MeetingService` method signature should never accept a `Request` object or return a `Response` — it accepts and returns plain Python types or Pydantic models, callable equally from an API handler, a Celery task, or a test.
- **Repositories know nothing about business rules.** A repository method answers "give me this row" or "write this row" — it does not decide *whether* a meeting is allowed to be deleted (that's a service-layer rule, e.g., checking ownership before calling `delete()`).
- **The AI layer knows nothing about persistence.** `ai/pipeline.py` takes a transcript string and returns Pydantic output models; it never queries the database directly (per the forbidden-import rule), even though it would be "convenient" to load the transcript itself instead of having the calling service pass it in.

## SOLID Principles, Applied

- **Single Responsibility**: each service file owns one domain (`meeting_service.py` does not also contain export logic — that's `export_service.py`, per the package responsibility table).
- **Open/Closed**: new LLM providers extend the system by adding a model string, never by modifying `llm.py`'s `complete()` signature (ADR-10). New export formats extend `export_service.py` with a new template/branch, not a rewrite of the existing ones.
- **Liskov Substitution**: not heavily exercised in V2 since "Composition Over Inheritance" (`PROJECT.md` §3) means class inheritance is not used for business logic at all — there is no inheritance hierarchy to violate.
- **Interface Segregation**: Pydantic request/response models are scoped per-endpoint (`MeetingCreate` vs. `MeetingPublic` vs. `MeetingDetail` are three different shapes, per `ARCHITECTURE.md`'s models folder listing) rather than one mega-model with optional fields for every use case.
- **Dependency Inversion**: services receive their repository and AI-client dependencies via FastAPI's dependency-injection system (`core/deps.py`), not via direct instantiation — this is what "every service is independently testable by injecting mocked dependencies" (`PROJECT.md` §3) actually means in practice.

## Testing Expectations

See `TESTING.md` for the full strategy. The standard every PR is held to: new business logic in `services/` or `ai/` ships with unit tests; new API endpoints ship with at least one integration test; coverage on `services/`, `ai/`, and `db/repositories/` must not regress below 80% (`SPEC.md` §12.2).

## Code Review Expectations

A PR is reviewable, and mergeable, when:

- It touches only the files implied by its ticket's stated scope (`IMPLEMENTATION_GUIDE.md` "Keep Changes Scoped").
- It includes the tests its ticket specifies, and they pass in CI.
- It does not cross a forbidden import boundary (CI-enforced, but a reviewer should still recognize the pattern on sight).
- Any deviation from the ticket's documented interface or the RFC is flagged with a `# DEVIATION from RFC` comment (per `SPEC.md`'s Builder's Guide Rule 11), not silently merged.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`), squash-merged to `main`.

A reviewer's job is to verify the boundary discipline above, not to relitigate architecture decisions already recorded in `DECISIONS.md` — if a PR seems to require relitigating one, that's a signal to open a new ADR discussion, not to quietly approve or quietly block.


---

# TESTING.md

> Expands `SPEC.md` §12 (Testing Philosophy) and the `TEST-*` epic into a complete, layer-by-layer testing strategy.

## The Test Pyramid

```
              ┌─────────┐
              │   E2E   │   5%  — Playwright, critical user flows only
              ├─────────┤
              │  Integ  │  25%  — API endpoints, DB queries, worker tasks, WebSocket
              ├─────────┤
              │  Unit   │  70%  — Services, AI prompts/parsing, pure utilities
              └─────────┘
```

The shape of this pyramid is a direct consequence of the layered architecture in `ARCHITECTURE.md` §3: because services are designed to be testable in isolation via dependency injection (`PROJECT.md` §3, "Testability at boundaries"), most logic *can* be unit tested without a database or network call, so most of it *should* be.

## Unit Testing

**What belongs here**: `services/`, `ai/` (prompt assembly and output parsing, not live LLM calls), `db/repositories/` (query construction logic that doesn't require a real connection), and pure utility functions in both Python and TypeScript.

**Conventions**: `test_<module>.py` files under `tests/unit/`, mirroring the source tree. `conftest.py` provides fixtures at each directory level (mock repositories, mock LLM responses). A service test injects fake repositories and fake AI clients — it never spins up Postgres or calls a real LLM.

**What this layer explicitly does NOT test**: private implementation details inside a function. Per `PROJECT.md` Design Principle 6, "Tests are the primary consumer of the public API" — test what a service *does* (its public method contracts), not how it does it internally; this is what allows safe refactors later without breaking unrelated tests.

## Integration Testing

**What belongs here**: API endpoints against a real (test) PostgreSQL instance, Celery worker tasks against real Redis, WebSocket connection/broadcast behavior.

**Conventions**: `testcontainers` spins up a real, ephemeral Postgres instance per test session (per `SPEC.md` §12.2) — never a mocked database for this layer, because the entire point of an integration test is to catch the SQL/ORM-layer bugs a mock would hide. `tests/integration/` mirrors the API/worker structure; `conftest.py` at this level provides a real test client, a real (test) database session, and seeded test users.

**Specific coverage required**:
- Every API endpoint: at least one happy-path test and at least one validation-failure test (422 on bad input, per `SEC-002`).
- Auth flows: registration, login, JWT refresh, API key generation/revocation (`TEST-004`).
- Worker tasks: transcription worker against a real (short, fixture) audio file, diarization worker, intelligence worker against a fixture transcript with mocked LLM responses (`TEST-006`).
- WebSocket: connection scoped correctly to `meeting_id` + `user_id`, broadcast delivers to the right subscriber and *only* the right subscriber (`TEST-007`, and directly tests the Data Isolation guarantee in `ARCHITECTURE.md` §16.5).
- Search: semantic search returns ranked, relevant results against seeded embeddings (`TEST-005`).

## End-to-End Testing

**What belongs here**: a small number of complete, critical user flows through the real (or staging) stack via Playwright — not a re-test of every integration-level case at the browser layer.

**Critical flows to cover** (derived from `PROJECT.md` §8's four primary workflows):
1. Capture a meeting end-to-end: extension build verification (`TEST-008`) confirms the extension at least *builds correctly*; a full Playwright flow should cover login → start capture (or manual upload, given the extension is a deferrable subsystem per `ROADMAP.md`) → see live transcript appear → meeting ends → summary/action items appear.
2. Search: type a natural-language query, see ranked results with snippet highlighting, click through to the source meeting at the right timestamp.
3. Chat: ask a question, see a streamed response with citations linking back to source meetings.
4. Export: request a Markdown/JSON/PDF export, receive a downloadable file (or presigned URL for large meetings).

**Why only 5%**: E2E tests are slow, flaky relative to unit/integration tests, and expensive to maintain across UI changes. They exist to catch "the pieces don't actually fit together," not to re-verify business logic already covered at the unit/integration layers.

## AI Evaluation

This is the layer most meeting-copilot products under-invest in, and the layer most likely to silently regress without it.

- **Offline evaluation set**: a held-out, human-labeled set of transcripts with known-good summaries, action items, and decisions. Every prompt version change (per ADR-11) should be run against this set before being treated as a replacement for the previous version, not just spot-checked on a few live meetings.
- **Metrics to track against the labeled set**: action item extraction precision (target ≥ 85%, per `PROJECT.md` §9), summary relevance (target ≥ 4/5, gathered from real user post-meeting surveys, not just offline scoring), search NDCG@5 (target ≥ 0.75).
- **Regression detection**: because every prompt module carries a `VERSION` string (ADR-11), it is possible — and required before promoting a new prompt version to production default — to run the new version against the labeled set and diff its scores against the previous version's recorded scores.

## Prompt Testing

Distinct from AI evaluation (which scores *output quality*), prompt testing verifies *mechanical* correctness:

- The `build_user_prompt()` function for each prompt module produces well-formed input given edge-case transcripts (empty speaker list, single-speaker meeting, transcript exceeding the model's context window).
- The Pydantic output model for each prompt correctly rejects malformed LLM output (simulate a malformed JSON response and confirm the calling code's retry/fallback path engages rather than crashing — see `AI_PROVIDER_SPEC.md` Retry Strategy).
- Token-counting and context-window truncation logic (`ARCHITECTURE.md` §15.3) is tested with synthetic chunk lists that deliberately exceed the 80% threshold, verifying oldest-first truncation behaves as documented.

## Regression Testing

- Every bug fix ships with a test that would have failed before the fix and passes after it — this is the literal definition of a regression test, and PRs that fix a bug without one should be sent back in review.
- The AI evaluation labeled set (above) *is* the regression-testing mechanism for prompt-quality drift specifically; it should grow every time a real production meeting surfaces a bad summary/action-item extraction, by adding that transcript (anonymized as needed) to the set.

## Accessibility Testing

Per `PROJECT.md` §15 accessibility goals (WCAG 2.1 AA):

- Automated: `axe-core` (or equivalent) run in CI against key pages (meeting list, meeting detail, search, chat, settings) catching missing alt text, insufficient color contrast, and missing ARIA labels before merge.
- Manual: keyboard-only navigation pass on every new interactive component (no mouse) — confirm a logical tab order and visible focus state.
- Screen reader spot-check on the meeting detail page (the most information-dense surface) at least once per release cycle, not just at initial ship.
- `prefers-reduced-motion` respected by every Framer Motion animation introduced — this should be a code-review checklist item, not just a one-time audit.

## Performance Testing

Targets from `PROJECT.md` §9 / `SPEC.md` §14 are the pass/fail bar:

| Metric | Target | How to Test |
|---|---|---|
| API p95 | < 200ms | Load-test key endpoints (meeting list, search) with realistic concurrency in CI or a dedicated perf-test job |
| Search p95 | < 500ms | End-to-end timing including embedding generation, against a realistically-sized seeded dataset |
| 10s chunk transcription | < 5s | Worker-level timing test with a real `faster-whisper` invocation on fixture audio |
| Full intelligence pipeline | < 30s | Timed integration test of the parallel-then-sequential pipeline (ADR-12) against a fixture transcript |
| Web app LCP | < 2s | Lighthouse CI on every PR touching `apps/web` |
| WebSocket delay | < 100ms | Client-side timing harness measuring publish-to-receive latency |

Performance regressions should block merge the same way correctness regressions do — a PR that quietly pushes search latency from 400ms to 800ms p95 is a production incident waiting to happen, not a "we'll optimize later" note.

## Browser Compatibility Testing

The web app targets evergreen Chromium-based browsers and Firefox at minimum (Next.js + Tailwind + shadcn/ui all support this baseline without extra work). The **extension** is Chrome-specific (Manifest V3, `chrome.tabCapture`) — see `EXTENSION_ARCHITECTURE.md`'s Future Browser Support section for what compatibility testing on other browsers would require. Compatibility testing for V2 is scoped to: latest stable Chrome (extension + web app), latest stable Firefox and Safari (web app only, no extension).

## Manual QA

Automated coverage does not replace a manual pass before each release, specifically for:
- A real, live meeting capture end-to-end (the one flow hardest to fully simulate with fixtures — real network jitter, real tab audio routing, real diarization on overlapping speech).
- Visual review of every export format (PDF rendering via WeasyPrint is the most likely to have subtle layout regressions that automated tests won't catch).
- Email report rendering across at least two major email clients (HTML email rendering is notoriously inconsistent and not realistically covered by unit tests).

## Continuous Integration Strategy

Per `SPEC.md` §13.3, every push triggers, in order:

1. Lint (`ruff` for Python, `biome` for TypeScript)
2. Type check (`mypy`, `tsc`)
3. Unit tests
4. Integration tests (with `testcontainers`)
5. Build Docker images
6. (on merge to `main` only) Deploy to staging

A PR cannot merge with a red step anywhere in 1–5. Step 6 is a deploy gate, not a merge gate — staging deploy failures should page whoever merged, not block the next PR's CI run.


---

# SECURITY.md

> Expands `SPEC.md` §8 and `ARCHITECTURE.md` §16, plus the `SEC-*` and `OBS-*` epics, into a complete threat model and control set.

## Threat Model

Watchn't's threat model is shaped by one defining fact: **the operator and the user are usually the same person or organization**, because the system is self-hosted (`PROJECT.md` Mission). This changes which threats matter most relative to a typical multi-tenant SaaS:

| Threat | Relevance in V2 | Primary Mitigation |
|---|---|---|
| Cross-user data leakage (within one deployment, multiple `users` rows) | **High** — V2 supports multiple users per deployment via the `users` table, even without organization accounts | `user_id`-scoped queries everywhere (§16.2) |
| Credential theft (JWT, API key, LLM provider key) | **High** — these are the keys to both the product and the user's own LLM spend | `httpOnly` cookies, hashed API keys, env-var-only secrets (§§ below) |
| Malicious or compromised audio upload | **Medium** — the extension is a relatively narrow attack surface, but the audio upload endpoint accepts arbitrary binary data from an authenticated client | Content-type validation, size limits, ownership checks |
| Operator-side data exposure (the self-hosting party mishandling their own deployment) | **Medium, and explicitly outside Watchn't's code-level control** | Documentation (this file, `STORAGE.md`), secure defaults, but ultimately the operator's responsibility — this is the accepted cost of the self-hosting privacy model (ADR-1) |
| Watchn't-operated infrastructure as an attack target | **Not applicable in V2** — there is no Watchn't-operated server in the architecture; every deployment is the user's own | N/A by design |
| Third-party LLM/embedding provider data handling | **Medium** — transcript content leaves the deployment boundary to reach the configured LLM/embedding provider | BYOK model makes this an explicit, visible user choice (e.g., switching to `ollama/` removes this exposure entirely — see `AI_PROVIDER_SPEC.md`) |

The threats this model explicitly does **not** prioritize (because they don't apply to a self-hosted, no-central-infrastructure product): large-scale credential-stuffing campaigns against a shared login surface, multi-tenant noisy-neighbor resource exhaustion, and centralized-data-breach blast radius across unrelated customers. These would become relevant if a managed/hosted offering is ever introduced — at that point this threat model needs a full revision, not an incremental patch.

## Authentication

| Mechanism | Used By | Lifetime | Storage |
|---|---|---|---|
| JWT access token | Web app | 15 minutes | In-memory only (never `localStorage`) |
| JWT refresh token | Web app | 7 days | `httpOnly` cookie |
| Personal API key | Extension | Indefinite, user-revocable | `chrome.storage.local` |
| Password hash | All users | N/A | `bcrypt`, cost factor 12 |

**Why the access token is never persisted client-side**: a 15-minute token that lives only in memory is gone the instant the tab closes, eliminating the most common XSS payoff (reading a long-lived token out of `localStorage`). The refresh token's `httpOnly` flag means even a successful XSS injection cannot read it directly — it can only ride along automatically on requests to the API origin.

**API keys** are generated via `secrets.token_urlsafe(32)`, and the server stores only the **SHA-256 hash** plus an 8-character unscrambled prefix for display/lookup purposes (`ARCHITECTURE.md` §16.1). The raw key is shown to the user exactly once, at generation time, and is not recoverable afterward — losing it means generating a new one, never "looking it up again." This mirrors how GitHub/Stripe-style API tokens are handled and is the correct pattern specifically *because* a hash is sufficient for verification (compare incoming key's hash to stored hash) and there is no legitimate reason the server ever needs the raw key again after issuing it.

## Authorization

Every database query that returns user data includes an explicit `user_id` filter, enforced **at the service/repository layer**, not only at the API layer (`ARCHITECTURE.md` §16.2's code example is the canonical pattern — `user_id` is a required parameter to every "get a thing" repository function, not an afterthought check bolted onto the handler). This means a bug that skips an authorization check in `api/v1/meetings.py` still cannot leak data, because `meeting_repo.get_meeting()` itself refuses to return a row without a matching `user_id` — defense in depth, not defense in one place.

WebSocket subscriptions are scoped to `meeting_id` **and** validated against the connecting user's `user_id` before the connection is accepted into the broadcast group (`ARCHITECTURE.md` §16.5) — a user cannot subscribe to another user's meeting's live-transcript channel even if they somehow guess or enumerate the `meeting_id` (which is a UUID, making enumeration impractical in the first place).

## Input Validation

- All request bodies, query params, and path params validated via Pydantic before reaching the service layer (`SEC-002`).
- String fields carry `max_length` constraints; numeric fields carry sane `ge`/`le` bounds; UUID path params are validated as UUID-shaped before any lookup is attempted.
- File uploads (audio chunks) are capped at 100MB and restricted to `audio/webm` and `audio/ogg` content types — this is both a DoS mitigation (no arbitrarily large upload) and a defense against someone using the audio-upload endpoint as a generic file-upload vector.
- SQL injection is structurally prevented by SQLAlchemy Core's parameterized queries — there is no code path in this architecture that string-interpolates user input into SQL, and a PR introducing one should be rejected on sight regardless of how "safe" the interpolation looks.
- XSS is mitigated by React's default escaping plus a `Content-Security-Policy` response header from the API.

## Local Storage Security (Browser-Side)

The extension's `chrome.storage.local` holds exactly three values: `serverUrl`, `apiKey`, `userId` (`ARCHITECTURE.md` §12.3). This is a deliberately minimal footprint:

- `chrome.storage.local` is sandboxed per-extension by the browser — other extensions and web pages cannot read it directly, which is a stronger guarantee than `localStorage` (readable by any script running in the page's origin, including a compromised third-party script).
- No LLM provider credentials, no transcript content, no meeting data ever touches `chrome.storage.local` — there is simply nothing more sensitive than the API key for an attacker to find there, by design (ADR-9).
- If the extension's stored API key is ever suspected compromised, the user revokes it from the web app settings page (`DELETE /auth/api-keys/{prefix}`) without needing to re-authenticate anywhere else in the system — revocation is a single, fast, low-friction action specifically so users are not deterred from using it.

## API Key Protection & BYOK Handling

Two categories of "key" exist in this system and they are handled differently on purpose:

1. **Watchn't API keys** (extension ↔ server auth): hashed at rest, shown once, revocable — covered above.
2. **LLM/embedding provider keys** (BYOK — `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or a self-hosted deployment's configured `llm_api_key`): these are **operator secrets**, never user-facing application data. They live in environment variables (`.env`, excluded from git) or the deployment platform's secret-injection mechanism, are never written to disk outside that mechanism, never logged (per `CODING_STANDARDS.md`'s logging rule), and never returned in any API response — there is no endpoint that echoes back a configured provider key, even to an authenticated admin-equivalent user, because V2 has no admin panel and no legitimate reason any client needs to read it back.

This split matters because the two key types have different blast radii if leaked: a leaked Watchn't API key exposes one user's meeting data; a leaked LLM provider key exposes the operator's billing account with that provider, potentially across every user on that deployment.

## Encryption Strategy

- **In transit**: TLS is mandatory in production (Caddy/Nginx-terminated, per the Docker Compose production stack) — no plaintext HTTP between any client and the server outside local development.
- **At rest**: PostgreSQL and MinIO rely on the underlying infrastructure's disk encryption (operator responsibility, consistent with the self-hosting threat model above) rather than Watchn't implementing application-level field encryption for V2. Password hashes (`bcrypt`) and API key hashes (`SHA-256`) are the only values stored in irreversible form by design — everything else (transcripts, summaries) is stored as plaintext in Postgres because the product's core function (search, RAG retrieval, full-text indexing) requires it to be queryable, which application-level encryption would defeat without a much larger engineering investment (e.g., encrypted search) not currently in scope.
- **Future work**: if compliance mode (V3, see `ROADMAP.md`) is pursued, field-level encryption for sensitive transcript content becomes a real evaluation, but it is explicitly *not* a V2 requirement and should not be added speculatively per `IMPLEMENTATION_GUIDE.md`'s "No Speculative Abstractions" rule.

## Chrome Extension Security

- **Minimal permissions**: `storage`, `tabCapture`, `activeTab` only — no broad host permissions (`EXT-001`'s notes are explicit on this point). Every permission requested is a permission a user sees and can be alarmed by during install; requesting less is both a security posture and a trust/conversion concern.
- **No remote code execution**: the extension bundle is built once (via `esbuild`/Vite+CRXJS) and does not fetch or `eval()` remote JavaScript at runtime — Chrome Web Store policy forbids this, and it would also be a direct contradiction of ADR-9's "thin, AI-free, auditable client" posture.
- **CSP**: the extension's own CSP (set in `manifest.json`) should disallow inline scripts and remote script sources, consistent with MV3's default restrictions.

## Browser Permissions

| Permission | Why It's Needed | Why Nothing Broader Is Requested |
|---|---|---|
| `storage` | Persist `serverUrl`, `apiKey`, `userId` | No need for `unlimitedStorage` — the footprint is three small strings |
| `tabCapture` | Capture audio from the active meeting tab | Does not request `<all_urls>` host permissions — capture is scoped to the tab the user explicitly starts on |
| `activeTab` | Grants temporary access to the current tab only after a user action (e.g., clicking the extension icon) | Avoids requesting persistent access to every site the user visits |

## Data Isolation

- No API endpoint returns data across users — this is the authorization model above, restated as a guarantee rather than a mechanism.
- MinIO object keys are namespaced by `meeting_id` (a UUID), making path-guessing/enumeration impractical even if bucket-level access controls were ever misconfigured.
- Redis keys are always scoped with `user_id` or `meeting_id` (ADR-6's long-term consequence) — there is no shared cache key pattern that could accidentally serve user A's cached data to user B.

## Privacy Guarantees

Restating `PROJECT.md`'s Design Principles in control terms:

- No analytics, telemetry, or third-party tracking is embedded in the product by default (opt-in only, per Design Principle 2).
- No Watchn't-operated server ever receives or processes user audio or transcripts — there is no such server in this architecture (Design Principle 1).
- Every external dependency in the AI path (LLM provider, embedding provider) is swappable and user-configured (Design Principle 3, realized via ADR-10).

## Secure Export Strategy

- Exported files (Markdown, JSON, PDF) inherit the same authorization model as the meeting they're derived from — `export_service.export(meeting_id, format, user_id)` takes `user_id` as a required parameter, same pattern as every other service method (§ Authorization above).
- Asynchronously-generated exports (large meetings) are stored in MinIO under `exports/{meeting_id}/{format}.{ext}` and served via a **presigned URL with a 1-hour expiry** (`ARCHITECTURE.md` §10.2) — not a permanent public link. A presigned URL that leaks (e.g., pasted into a public Slack channel by mistake) has a bounded window of exposure rather than being a permanent open door.
- Export files in MinIO carry a 7-day retention (`STORAGE.md`'s state persistence table) — they are regenerable on demand, so there is no reason to retain them indefinitely and every reason not to (smaller attack surface, smaller storage footprint).

## Future Cloud Sync Security

V2 has no sync mechanism — there is exactly one deployment per organization/user, and "sync" in the traditional sense (reconciling state across multiple independent servers) doesn't exist yet. This becomes relevant only if:

- **Organization accounts (V3)** introduce multiple users sharing one deployment's data — this is multi-tenancy *within* a single Postgres instance, not sync between instances, and is already substantially prepared for by the `user_id`-scoping discipline above (extending it to `org_id`-scoping is additive, not a redesign).
- **A future managed/hosted offering** is ever introduced — at that point, data moving between a user's local self-hosted instance and any hosted component would need its own threat model from scratch, including transport encryption, conflict resolution, and a much harder version of the authorization question above (which deployment is authoritative for which record). This is explicitly **not** a V2 or V3 concern per the current roadmap and should not be designed against speculatively.


---

# AI_PROVIDER_SPEC.md

> Fully specifies the provider abstraction introduced in ADR-10 and documented in `ARCHITECTURE.md` §7 and §13. This is the contract any future provider integration, prompt addition, or AI-pipeline change must honor.

## Provider Interface

There is exactly one entry point for every LLM call in the system:

```python
# server/app/ai/llm.py

async def complete(
    *,
    model: str,                                       # e.g. "anthropic/claude-sonnet-4-6"
    messages: list[dict],
    response_format: type[BaseModel] | None = None,    # Pydantic → structured output
    temperature: float = 0.3,
    max_tokens: int = 4096,
    stream: bool = False,
) -> str | BaseModel | AsyncIterator[str]:
    """Unified LLM completion via litellm."""
```

No other function in the codebase is permitted to call a provider SDK (the `anthropic` or `openai` Python packages) directly. Every caller — the intelligence pipeline, the RAG chat endpoint, any future feature — goes through `complete()`. This is what makes the entire rest of this specification possible: every guarantee below (retry, fallback, rate limiting, cost tracking) can be implemented **once**, inside this function, and apply everywhere automatically.

A parallel, equally singular entry point exists for embeddings:

```python
# server/app/ai/embeddings.py

async def embed_text(text: str) -> list[float]:
    """Generate a 1536-dim embedding, with Redis cache check (7-day TTL)."""
```

## Provider Registry

Provider selection is **not** a registry object or a factory pattern in code — it is the `model` string prefix itself, resolved by `litellm` internally. This is intentional and is the core of ADR-10: there is no `ProviderRegistry` class to maintain, register against, or forget to update.

| Prefix | Provider | Example | Notes |
|---|---|---|---|
| `anthropic/` | Anthropic | `anthropic/claude-sonnet-4-6` | Cloud, requires `ANTHROPIC_API_KEY` |
| `openai/` | OpenAI | `openai/gpt-4.1-mini` | Cloud, requires `OPENAI_API_KEY` |
| `gemini/` | Google | `gemini/gemini-2.5-flash` | Cloud, requires Google API credentials |
| `openrouter/` | OpenRouter | `openrouter/meta-llama/llama-3-8b-instruct` | Cloud aggregator, single key for many models |
| `ollama/` | Ollama (local) | `ollama/llama3.1` | **Fully local** — no API key, no external network call |

The "registry," to the extent the term applies, is `litellm`'s own internal provider routing table — Watchn't depends on it staying current, which is precisely why "Future Provider Support" (below) is a configuration change rather than an engineering task.

## Cloud Providers

Cloud providers (`anthropic/`, `openai/`, `gemini/`, `openrouter/`) require a credential, sourced via the **BYOK model**: `Settings.llm_api_key` if explicitly configured, otherwise the standard provider environment variable (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc.) that `litellm` reads automatically. The operator of a given deployment supplies their own credential — Watchn't's code never embeds, proxies, or pools a shared API key on anyone's behalf, which is both the privacy commitment in `PROJECT.md` and the reason there is no concept of "Watchn't's API usage bill."

## Local Providers

`ollama/` is the only local provider target in V2, and it requires the operator to run an Ollama instance reachable from the server container (configured via `litellm`'s standard Ollama base-URL convention). Local provider support exists today specifically so that:

- A privacy-maximalist deployment can run **zero** external network calls for LLM inference (embeddings still use OpenAI's API in V2 per the documented embedding strategy — see `MEMORY_ENGINE.md` for the reason embeddings are not yet local-provider-swappable in the same way completions are).
- The V4+ "Local-only mode" vision item (`ROADMAP.md`, Version 3) is not a new integration to build from scratch — it is the `ollama/` path already exercised today, extended to cover embeddings as well.

## Model Selection

The active completion model is a single configuration value (`Settings.llm_model`, default `anthropic/claude-haiku-4-5`) — there is no per-request model override exposed to end users in V2, and no automatic "pick the best model for this task" routing logic. Every prompt module (summary, action items, decisions, context, chat) uses the same configured model. This is a deliberate simplicity choice consistent with `PROJECT.md`'s "progressive disclosure" principle: power users who want per-task model selection are a V3+ concern, not a V2 requirement.

## Streaming

Streaming is used **only** for the RAG chat endpoint, via Server-Sent Events:

```python
async def chat_stream(message: str, context: str) -> AsyncGenerator[str, None]:
    response = await complete(model=settings.llm_model, messages=[...], stream=True)
    async for chunk in response:
        yield f"data: {json.dumps({'text': chunk})}\n\n"
    yield "data: [DONE]\n\n"
```

All other AI calls (summary, action items, decisions, context synthesis) are **non-streaming**, because they are background Celery tasks with no human waiting on a token-by-token render — a complete, parsed Pydantic object is strictly more useful to a background task than a stream of text fragments it would have to buffer and reassemble anyway.

## Structured Outputs

Every extraction task (summary, action items, decisions, context) specifies `response_format=<PydanticModel>`. `complete()` is responsible for ensuring the returned value is a validated instance of that model, not a raw string the caller must parse. This is the mechanical link between ADR-3 (schema-first design) and ADR-11 (versioned prompts) — each prompt module ships its own output schema, and `complete()` is the single place that schema is enforced against the LLM's actual response.

## Tool Calling / Function Calling

V2 does not currently invoke LLM-native tool/function calling anywhere in the documented pipeline — every extraction task is a single-turn completion with a structured-output schema, not a multi-turn tool-use loop. `litellm`'s unified API supports tool calling identically across providers, so this is a capability the abstraction already has available without any change to `complete()`'s signature; it is simply unused by any current feature. A future feature that needs it (for example, a RAG chat assistant that can call a "search action items" tool mid-conversation) should use `complete()`'s existing `messages` parameter to pass tool definitions per `litellm`'s standard schema, not introduce a second LLM-calling pathway.

## Prompt Versioning

Covered in depth in ADR-11. The mechanical contract: every prompt module exports `VERSION: str`, and any change to `SYSTEM_PROMPT` or the output Pydantic model's fields must increment it. There is no automatic enforcement of this in V2 (no CI check diffs prompt content against the declared version) — it is a code-review discipline, and a strong candidate for a future `OBS-*`-style ticket that lints "prompt content changed but `VERSION` didn't."

## Model Routing

There is no dynamic model routing in V2 — see Model Selection above. "Routing" in this system means exactly one thing: the static mapping from a `model` string prefix to a provider, performed by `litellm` itself.

## Retry Strategy

`complete()` and `embed_text()` should apply a bounded retry with exponential backoff for transient provider errors (timeouts, 5xx responses, rate-limit 429s from the provider itself) — this is consistent with `PROJECT.md`'s "Fail Loud, Recover Gracefully" principle and mirrors the same retry pattern already specified for the extension's chunk upload (`EXT-003`: 3 retries, 1s/2s/4s backoff). A retry exhausting its budget should raise a named exception (per `CODING_STANDARDS.md`'s error-handling rule) that the calling Celery task can catch and handle as a task-level retry/failure, not an unhandled crash.

## Fallback Strategy

V2 does not specify an automatic cross-provider fallback (e.g., "if Anthropic fails, silently retry on OpenAI") — this is intentionally out of scope, because BYOK means a deployment may have credentials configured for only *one* provider, making a silent fallback to a second provider either impossible (no credential) or a surprising, unbudgeted cost the operator didn't opt into. If a call to the configured model fails after exhausting retries, the correct behavior is to fail the task loudly (per "Fail Loud") and let Celery's task-level retry policy decide whether to try again later — not to silently substitute a different model the operator didn't choose.

## Rate Limiting

Rate limiting in this specification refers to **Watchn't's own API rate limiting** (60 requests/minute per user, Redis-backed sliding window, per `SEC-001`), not provider-side rate limiting, which is handled by the Retry Strategy above reacting to a 429 from the provider. The two are independent: a user hitting Watchn't's own rate limit gets a 429 from Watchn't's API directly; a provider rate limit is an internal `complete()`-level retry that the end user never sees unless retries are exhausted.

## Cost Optimization

- **Embedding cache**: every embedding request is cached in Redis by `sha256(text)` with a 7-day TTL (`ARCHITECTURE.md` §7.4) — identical text (a common occurrence across overlapping transcript chunks or repeated queries) is never re-embedded within that window.
- **Token/cost tracking**: every LLM call logs `model`, `input_tokens`, `output_tokens`, `latency_ms`, and `estimated_cost` (`OBS-002`), aggregated into a `llm_usage` table queryable per user per day. This exists so that BYOK cost is visible to the operator, not hidden inside a black box — a deployment running expensive models against high meeting volume should be able to *see* that before it becomes a billing surprise.
- **Temperature 0.3 default**: lower temperature is not just a quality choice (ADR on extraction consistency, see `ARCHITECTURE.md` §7.1) — it also tends to produce more consistent, shorter outputs for structured-extraction tasks, indirectly helping cost predictability.

## Future Provider Support

Per `SPEC.md` §16's Future Extension Points table: adding a new LLM provider requires adding a model string to `litellm`'s supported set — **zero code changes** in Watchn't's own codebase, because no provider-specific code exists outside `litellm` itself. The only Watchn't-side work a new provider could ever require is updating the `Settings` class if the new provider needs a distinct credential field, and updating the pricing table behind `OBS-002`'s cost-estimation logic so usage tracking remains accurate for the new model.


---

# MEMORY_ENGINE.md

> Expands `ARCHITECTURE.md` §9 (Memory Pipeline), §14 (Knowledge Graph), and §15 (RAG Pipeline), plus `SPEC.md` §9, into a complete description of how Watchn't turns audio into organizational memory.
>
> **Framing note**: the source documents do not define separate database tables called "episodic memory," "semantic memory," "project memory," "decision memory," or "people memory." Those are cognitive-science *categories* this section uses to organize and explain the existing three-layer model and existing tables — each maps onto something that already exists in the schema (see the mapping table below), rather than describing new storage.

## Memory Lifecycle

```
Audio captured
     │
     ▼
Layer 1 — Raw Storage          (audio: 90-day retention · segments/speakers: permanent)
     │
     ▼  Intelligence Pipeline (ADR-12)
Layer 2 — Structured Intelligence   (summary · action items · decisions · topics: permanent)
     │
     ▼  Embedding Pipeline
Layer 3 — Semantic Memory       (vector embeddings · full-text index: permanent, regenerable)
     │
     ▼
Retrieval (search, RAG chat) · Cross-meeting queries (relational knowledge graph)
     │
     ▼
Export / Cleanup (per retention policy — see STORAGE.md)
```

A "memory," in this system, is never a single artifact — it is a meeting's audio, segments, speakers, summary, action items, decisions, topics, and embeddings, considered together, at whatever stage of this pipeline they've reached. Nothing is deleted out of this lifecycle except raw audio after its 90-day window (ADR-13); everything that makes the product useful (search, chat, summaries) survives that deletion because it lives in Layers 2 and 3.

## Cognitive-Category Mapping

| Cognitive Category | What It Actually Is in Watchn't V2 | Source Table(s) |
|---|---|---|
| **Meeting memory** | The complete record of one meeting: its segments, speakers, summary, action items, decisions, and embeddings considered as a unit | `meetings`, `segments`, `speakers`, `action_items`, `decisions`, `meeting_embeddings` |
| **Episodic memory** | An individual meeting, as a bounded "episode" with a start/end time and its own narrative (the transcript + summary) | `meetings.summary`, `segments` (ordered by `start_time`) |
| **Semantic memory** | Knowledge abstracted *across* episodes — what the embedding index and full-text index make searchable regardless of which specific meeting it came from | `meeting_embeddings` (pgvector), PostgreSQL `tsvector`/GIN index |
| **Decision memory** | The first-class record of what was decided, independent of which meeting it came from | `decisions` |
| **People memory** | Who said what, how much, and across how many meetings | `speakers` (linked optionally to `users`) |
| **Project memory** | Meetings grouped by theme/initiative | `tags` / `meeting_tags` (the V2 relational knowledge graph — see below) |

This mapping is intentionally a *view* on top of the existing schema, not a new persistence layer — any future work that seems to require a literal new "episodic memory table" should first check whether it's actually asking a question the existing `meetings`/`segments` tables can already answer.

## Entity Extraction

V2's entity extraction is **prompt-based, not a dedicated NLP/NER pipeline**: the LLM intelligence pipeline (`summary_task`, `action_items_task`, `decisions_task`) extracts the entities the product currently needs (action item assignees as free-text `assignee_name`, topics as a string list) directly as part of structured-output generation, rather than running a separate spaCy/NER pass. This is consistent with `PROJECT.md`'s Non-Goal deferring "custom LLM fine-tuning" — prompt-based extraction was judged sufficient for V2's accuracy targets (≥85% action item precision) without a dedicated extraction model.

**What this means for V3's Neo4j migration** (ADR-14): true entity extraction (resolving "Sarah" mentioned in three different meetings to one canonical `Person` node, rather than three free-text strings) is explicitly **not yet built** — `assignee_name` is a string, not a foreign key to a `Person` entity in V2. `PROJECT.md` §11 names "Knowledge graph with Neo4j... enabling relationship queries" as the V3 item that depends on this entity-resolution step existing; building it is a prerequisite for V3's graph migration, not a V2 task.

## Embeddings

| Parameter | Value | Rationale |
|---|---|---|
| Model | `text-embedding-3-small` | 1536 dimensions, best quality/cost ratio at OpenAI's standard tier |
| Chunk size | 500 tokens | Balances retrieval granularity against having enough context per chunk to be meaningful on its own |
| Chunk overlap | 50 tokens | Prevents a semantic boundary (e.g., a decision statement) from being split exactly at a chunk edge |
| Chunking method | `nltk.sent_tokenize` (sentence-aware) | Never cuts a sentence mid-word, which would degrade both embedding quality and any displayed snippet |
| Index type | HNSW (`pgvector` 0.5+) | Better recall than IVFFlat at sub-10M-vector scale (ADR-5) |
| Distance metric | Cosine similarity | Standard for normalized text embeddings |
| Cache | Redis, `sha256(text)` key, 7-day TTL | Avoids re-embedding identical text across overlapping chunks or repeated queries (`AI_PROVIDER_SPEC.md`, Cost Optimization) |

## Chunking

Chunking happens **once, at embedding time**, over the full transcript assembled from `segments` in chronological order — not per-segment. A single `segments` row (one sentence or utterance with start/end timestamps) is usually too small to be a meaningful retrieval unit on its own; the 500-token sentence-aware window groups enough surrounding context to make a retrieved chunk useful in isolation, which is exactly what a RAG context block needs to be.

## Retrieval

```
Query text
    │
    ▼  embed_text(query)
1536-dim query vector
    │
    ▼  pgvector HNSW ANN search (top 10, cosine distance, scoped to user_id)
Candidate chunks
    │
    ▼  Re-rank: score = 0.7 × similarity + 0.3 × recency_score   (ADR-15)
Ranked chunks
    │
    ▼  Sort chronologically, assemble context, truncate oldest-first if >80% of context window
Final context block
```

Search (the user-facing semantic search feature) and RAG retrieval (the chat feature's internal context-assembly step) share this same retrieval mechanism — the difference is purely in what happens *after* retrieval: search returns ranked results with highlighted snippets directly to the UI; RAG retrieval feeds the ranked chunks into an LLM call and returns a synthesized, cited answer instead.

## Context Building

For RAG chat specifically, each retrieved chunk is labeled with its source before being concatenated into the context string:

```python
context_parts.append(f"[Meeting: {chunk.meeting_title}, {chunk.meeting_date}]\n{chunk.text}")
```

This labeling is what makes citation possible on the frontend — the LLM is instructed (via the chat system prompt) to reference which meeting a claim comes from, and the frontend can map that reference back to a real `meeting_id` to render a clickable citation link (`PROJECT.md` G3: "accurate, grounded answers with citations pointing to the source meetings").

## Knowledge Graph Integration

V2's knowledge graph (ADR-14) is the relational layer described in the Cognitive-Category Mapping table above — `tags`/`meeting_tags`, `speakers`, `action_items`, and `decisions`, all foreign-keyed to `meetings`. This is queried directly via SQL joins for cross-meeting questions (see the example queries in `ARCHITECTURE.md` §14.2), and is the mechanism behind features like "all open action items across all meetings" (G3-adjacent, supports the RAG chat use case named explicitly in `PROJECT.md` §1: *"Which open action items are assigned to Sarah?"*).

## Cross-Meeting Intelligence

Cross-meeting intelligence in V2 is the combination of: (a) semantic search/RAG across the embedding index (finds *related content* regardless of explicit tagging), and (b) the relational knowledge graph (finds *explicitly linked* records — same tag, same assignee, same speaker). A query like "what did we decide about the database migration" is answered by (a); a query like "show me all of Sarah's open action items" is answered by (b). Features that need both (e.g., "summarize everything decided about Project Atlas across all its meetings") combine a tag-filtered query with a semantic search scoped to the matching meeting IDs — this is a V2-buildable feature today using only the existing relational graph plus the existing embedding index, with no Neo4j dependency.

## Memory Aging

| Layer | Aging Behavior | Why |
|---|---|---|
| Audio (Layer 1) | Deleted after 90 days (configurable via `AUDIO_RETENTION_DAYS`) | Raw audio's value is highest immediately after a meeting (QA, replay) and drops sharply once the transcript is verified accurate; storage cost does not justify indefinite retention |
| Transcript segments, speakers (Layer 1) | Permanent | The transcript *is* the permanent record of what was said — there is no reason to age it out while the meeting it describes still matters to the user |
| Structured intelligence (Layer 2) | Permanent | The primary user-facing asset; aging this out would directly contradict the product's "organizational memory" mission |
| Embeddings (Layer 3) | Permanent, but **regenerable** | If lost or invalidated (e.g., an embedding model upgrade), embeddings can be fully reconstructed from Layer 1/2 data — this is *not* the same guarantee as Layers 1–2, which are not regenerable if lost |
| RAG retrieval ranking | Recency-weighted at query time (ADR-15), not at storage time | Old chunks are never deleted for being old — they are simply ranked lower and truncated first when context is scarce |

## Memory Cleanup

Cleanup in V2 is narrow and explicit, not a general garbage-collection sweep:

- A scheduled job (or manually-triggered admin action, since V2 has no admin panel — see `SECURITY.md`'s Authorization section) enforces the 90-day audio retention policy by deleting expired objects from the `watchnt-audio` MinIO bucket.
- Export files in the `watchnt-exports` bucket expire after 7 days (`STORAGE.md`) and should be cleaned up by a corresponding scheduled task or MinIO lifecycle policy, since they are regenerable and there is no reason to retain them.
- There is no automatic deletion of meetings, transcripts, action items, or decisions in V2 — a user's organizational memory is permanent until the user explicitly deletes a meeting (cascading deletes via the documented `ON DELETE CASCADE` foreign keys handle cleanup of all dependent rows correctly in that case).

## Export Strategy

See `EXTENSION_ARCHITECTURE.md` and the Export Pipeline details already covered in `DECISIONS.md` ADR-16 and `STORAGE.md`. From a memory-engine perspective, the relevant point is that **export is a read of Layer 2 (and optionally Layer 1's raw segments for a full-transcript export), never of Layer 3** — exported files (Markdown/JSON/PDF/Email) present structured intelligence and transcript text to a human; they never include or expose raw embedding vectors, which would be meaningless to an export's audience and unnecessarily expose the internal representation of the memory engine.


---

# EXTENSION_ARCHITECTURE.md

> Expands `ARCHITECTURE.md` §8 and §12, `SPEC.md` §10, and the `EXT-*` epic into a complete reference for the Chrome extension.

## Manifest V3

The extension targets Manifest V3 exclusively (no MV2 fallback). Requested permissions are deliberately minimal — `storage`, `tabCapture`, `activeTab` — with **no broad host permissions** (`EXT-001`'s explicit instruction). This is both a security posture (`SECURITY.md`, Browser Permissions) and a Chrome Web Store review consideration: a narrower permission set reviews faster and alarms fewer users at install time.

```json
{
  "manifest_version": 3,
  "name": "Watchn't",
  "permissions": ["storage", "tabCapture", "activeTab"],
  "background": { "service_worker": "background/service-worker.js" },
  "action": { "default_popup": "popup/popup.html" },
  "content_scripts": [
    { "matches": ["https://meet.google.com/*", "https://*.zoom.us/*"], "js": ["content/meeting-detector.js"] }
  ]
}
```

## Background Service Worker

```
┌────────────────────────────────────────────────────────────────┐
│  Service Worker (background/service-worker.ts)                 │
│  • Persistent background process *while active*                │
│  • Owns chrome.tabCapture lifecycle orchestration               │
│  • Maintains the upload queue (chunk → POST → retry/backoff)   │
│  • Stores/refreshes the API key via chrome.storage.local        │
│  • Responds to chrome.runtime messages from the popup           │
│    and the content script                                       │
└────────────────────────────────────────────────────────────────┘
```

**Implementation note — why the service worker does not run `MediaRecorder` directly.** `ARCHITECTURE.md` §12.2's example code shows `MediaRecorder` instantiated inline for illustration, but a Manifest V3 service worker has no `window`, no DOM, and critically no `MediaRecorder`/`navigator.mediaDevices` — these APIs require a document context. This is not a contradiction of the documented architecture; it is the implementation detail that makes the documented flow actually buildable. The reconciliation, consistent with `EXT-002`'s file layout (`content/audio-capture.ts`, not `background/service-worker.ts`, owns the actual recorder):

```
Service Worker                          Content Script (content/audio-capture.ts)
  │                                              │
  │  chrome.tabCapture.getMediaStreamId()        │
  │  (must be called from the service worker     │
  │   or popup, in response to a user gesture)   │
  │                                              │
  │  ── streamId ──────────────────────────────► │
  │                                              │  navigator.mediaDevices.getUserMedia({
  │                                              │    audio: { mandatory: {
  │                                              │      chromeMediaSource: "tab",
  │                                              │      chromeMediaSourceId: streamId
  │                                              │  }}})
  │                                              │  → MediaStream
  │                                              │  → new MediaRecorder(stream, {...})
  │                                              │  → recorder.start(10_000)
  │                                              │
  │  ◄── chrome.runtime.sendMessage(blob) ────── │  ondataavailable → send chunk
  │                                              │
  │  uploadChunk(blob, meetingId, sequence)      │
  │  → POST /api/v1/meetings/{id}/audio          │
```

The service worker remains the **owner of capture lifecycle and upload** (matching `ARCHITECTURE.md` §12.1's stated responsibilities exactly); the content script is the **only** piece that needs a DOM context to actually instantiate `MediaRecorder` and produce blobs. This division of labor is what `EXT-002`'s acceptance criteria ("captures tab audio... sends chunks to background service worker via chrome.runtime messages") already implies in its file list — this section simply makes the *why* explicit so a future engineer doesn't "simplify" the code by moving `MediaRecorder` into the service worker, which would not run.

**Offscreen documents as a fallback pattern, not the V2 default**: Chrome's `chrome.offscreen` API exists specifically to give a service worker a DOM-capable surface for exactly this kind of task. It is a credible alternative to the content-script handoff above, and should be considered if content-script injection proves unreliable on a specific meeting platform (e.g., a strict page CSP blocking the injected script, or the meeting tab navigating/reloading mid-capture and tearing down the content script). V2's documented file structure (`content/audio-capture.ts`) is the chosen default; do not introduce an offscreen document as a "better" replacement without an ADR, since it changes where capture state lives and how teardown-on-tab-close is handled.

## Content Scripts

`content/meeting-detector.ts` is injected into known meeting-platform URLs (Google Meet, Zoom web) and has two jobs:

1. **Meeting detection**: watch DOM signals (the page's own "meeting started"/"meeting ended" UI state) and message the service worker so capture can start/stop automatically rather than requiring the user to remember to click "Start" manually.
2. **Audio capture execution** (per the implementation note above): host the `MediaRecorder` instance that the service worker cannot run itself.

These are documented as one file (`audio-capture.ts`) in the `EXT-002` ticket but conceptually two responsibilities — splitting them into `meeting-detector.ts` (detection) and `audio-capture.ts` (recording) as `ARCHITECTURE.md`'s folder listing already shows is the correct boundary, with the service worker coordinating both.

## Popup

```
┌────────────────────────────────────────────────────────────────┐
│  Popup (popup/popup.tsx)                                       │
│  • Rendered when the user clicks the extension icon            │
│  • Shows capture status: idle / recording / error              │
│  • Start / Stop capture buttons                                │
│  • API key input + "open web app settings" link                │
│  • chrome.runtime.sendMessage(...) to talk to the service worker│
└────────────────────────────────────────────────────────────────┘
```

The popup is intentionally the *only* extension surface a user directly interacts with beyond the initial install — there is no options page, no side panel, and no `chrome.sidePanel` usage in V2's documented architecture. A side panel (Chrome's newer persistent-UI surface, an alternative to the transient popup) was not specified in the source documents and should not be introduced without a documented reason; the transient popup is sufficient for the two actions (start/stop, view status) the extension actually exposes.

## Offscreen Documents

Not used by default in V2 — see the Background Service Worker section's implementation note above for the rationale and the conditions under which they'd become the right fallback.

## Audio Capture

```
chrome.tabCapture.capture({ audio: true, video: false })   (or getMediaStreamId(), see above)
    └── MediaStream
        └── new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" })
            └── recorder.start(10_000)               # 10-second chunks
                └── ondataavailable(event)
                    └── if event.data.size > 0:
                            uploadChunk(event.data, meetingId, sequence++)
```

Opus at 48kHz in a WebM container produces excellent speech quality at roughly 64kbps, keeping each 10-second chunk around 80KB (`ARCHITECTURE.md` §8.1) — small enough to upload quickly and reliably even on a mediocre connection, which matters because a stalled upload queue is the direct cause of the "audio capture dropout rate ≤ 1%" target in `PROJECT.md` §9 being missed.

## Message Passing

All cross-context communication uses `chrome.runtime.sendMessage` / `chrome.runtime.onMessage`:

| From → To | Message | Purpose |
|---|---|---|
| Content script → Service worker | `{ type: "chunk", blob, sequence }` | Deliver a recorded audio chunk for upload |
| Content script → Service worker | `{ type: "meeting_detected" / "meeting_ended" }` | Auto start/stop capture based on DOM signals |
| Popup → Service worker | `{ type: "start_capture" }` / `{ type: "stop_capture" }` | Manual user-initiated control |
| Service worker → Popup | `{ type: "status_update", status }` | Reflect current capture state in the popup UI |

A service worker in MV3 can be terminated by the browser after roughly 30 seconds of inactivity — every message handler must be registered synchronously at the top level of the service worker script (never inside an async callback added later), or messages arriving during a "waking up" window will be missed. This is a standard MV3 constraint, not specific to this project, but worth stating explicitly because it directly affects upload-queue reliability if violated.

## Browser Permissions

Covered in `SECURITY.md`'s Browser Permissions table. Restated here for completeness: `storage`, `tabCapture`, `activeTab` — no host permissions, no `<all_urls>`, no `unlimitedStorage`.

## Storage

`chrome.storage.local` holds exactly:

```
serverUrl   → string   (default: http://localhost:8000)
apiKey      → string   (the user's personal API key)
userId      → string   (UUID, display-only — never used for authorization client-side)
```

No transcript content, no meeting metadata, and no LLM credentials are ever stored client-side (ADR-9, `SECURITY.md`).

## Security

Covered in depth in `SECURITY.md`'s Chrome Extension Security section. Summary: minimal permissions, no remote code execution, no inline scripts, API key transmitted only via `X-API-Key` header over TLS.

## Update Strategy

- **Production**: the extension updates automatically via the Chrome Web Store's standard update mechanism (Chrome checks for updates roughly every few hours; no custom update-check code is needed or should be written).
- **Development**: `chrome://extensions` → "Load unpacked" against the `apps/extension/dist/` build output, with a manual "Reload" click after each rebuild — there is no hot-reload for the service worker context (the popup and content script can use a dev-server-driven reload; the service worker generally cannot).
- A version bump in `manifest.json` is required for every Chrome Web Store release; this should follow the same versioning strategy as the rest of the repository (see `CONTRIBUTING.md`).

## Browser Limitations

| Limitation | Impact | Mitigation |
|---|---|---|
| Service worker ~30s idle termination | In-memory capture state (active recorder reference) could be lost if the worker is killed mid-capture | Keep the service worker "alive" during active capture via a recurring lightweight message/alarm (a known MV3 pattern), and treat the content script as the source of truth for an in-progress recording rather than relying solely on service-worker memory |
| `chrome.tabCapture` requires a user gesture to initiate | Capture cannot start fully automatically without **some** prior user action (e.g., clicking the extension icon once per browser session, even if subsequent meetings auto-detect) | Document this clearly in the popup UI rather than treating failed silent-auto-start as a bug |
| `tabCapture` only captures the tab the gesture targeted | Cannot capture a meeting in a tab the user hasn't interacted with via the extension | Inherent to the extension-first capture decision (ADR-8) — not a bug to fix, a documented scope boundary |
| No capture across browser restarts | An in-progress recording does not survive a browser crash/restart | Out of scope for V2; the meeting should be considered ended if capture state cannot be recovered, with whatever chunks were successfully uploaded before the interruption still processed normally |

## Future Browser Support

| Browser | MV3 Support | `tabCapture` Equivalent | V2 Status |
|---|---|---|---|
| Chrome / Chromium-based (Edge, Brave, etc.) | Full | `chrome.tabCapture` | Supported (Edge inherits Chrome's extension APIs as a Chromium browser) |
| Firefox | MV3 supported, with some API differences | No direct `tabCapture` equivalent; Firefox's extension audio-capture story differs meaningfully | Not supported in V2 — would require a distinct capture implementation, not a manifest tweak |
| Safari | WebExtensions support exists but with a materially different permission/API model | No `tabCapture` equivalent | Not supported in V2 or planned in the current roadmap |

Per `PROJECT.md`'s Non-Goals, broader browser support was never an explicit V2 target; this table exists so a future engineer evaluating "should we support Firefox" understands it is a non-trivial new capture implementation, not a packaging change.


---

# STORAGE.md

> Expands `ARCHITECTURE.md` §11 and §6 (State Management) into a complete storage reference, including an explicit account of storage technologies the template requests that V2 deliberately does not use.

## Why Each Storage Technology Exists (Summary)

| Technology | Role | Why It Exists Here |
|---|---|---|
| PostgreSQL 16 + pgvector | System of record for all durable data, including vectors | ACID + relational integrity + FTS + vector search in one engine (ADR-4, ADR-5) |
| Redis 7 | Cache, Celery broker, PubSub, rate limiting | One piece of infrastructure for four short-lived/ephemeral roles (ADR-6) |
| MinIO (S3-compatible) | Object storage for audio and exports | Cheap, self-hostable, S3-API-compatible storage for large binary blobs that don't belong in a relational database |
| `chrome.storage.local` | Extension's three-value settings store | The only client-side persistence in the system, and deliberately minimal (ADR-9) |
| IndexedDB | **Not used in V2** | See dedicated section below |
| OPFS (Origin Private File System) | **Not used in V2** | See dedicated section below |

## PostgreSQL

The full table set (`users`, `api_keys`, `meetings`, `segments`, `speakers`, `action_items`, `decisions`, `meeting_embeddings`, plus `tags`/`meeting_tags`) follows the conventions fixed in `ARCHITECTURE.md` §11.1: UUID v4 primary keys, `created_at`/`updated_at timestamptz`, `ON DELETE CASCADE` for child records, `ON DELETE SET NULL` for optional references.

```sql
-- Representative excerpt (full schema in ARCHITECTURE.md §11.1)
create table meetings (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references users(id) on delete cascade,
    title       text not null,
    platform    text not null,
    status      text not null default 'scheduled',
    started_at  timestamptz,
    ended_at    timestamptz,
    summary     text,
    topics      jsonb,
    created_at  timestamptz default now(),
    updated_at  timestamptz default now()
);
create index on meetings(user_id, created_at desc);
create index on meetings(user_id, status);

create table meeting_embeddings (
    id          uuid primary key default gen_random_uuid(),
    meeting_id  uuid not null references meetings(id) on delete cascade,
    user_id     uuid not null references users(id) on delete cascade,
    chunk_text  text not null,
    chunk_index int not null,
    embedding   vector(1536),
    created_at  timestamptz default now()
);
create index on meeting_embeddings using hnsw (embedding vector_cosine_ops) with (m = 16, ef_construction = 64);
create index on meeting_embeddings(user_id);
```

**Why `user_id` is denormalized onto `meeting_embeddings`** (rather than requiring a join through `meetings` for every scoped query): every semantic-search query filters by `user_id` directly on the embeddings table (`ARCHITECTURE.md` §15.2's SQL), and a direct indexed column avoids a join purely for authorization scoping on the single highest-frequency read path in the system.

## Redis

| Key Pattern | Type | TTL | Purpose |
|---|---|---|---|
| `session:{token_jti}` | String | 24h | JWT revocation blocklist |
| `embed:{sha256}` | String | 7 days | Embedding cache |
| `ratelimit:{user_id}:{minute}` | String | 60s | Sliding-window rate limit counter |
| `meeting:{id}:buffer` | List | 2h | Live meeting transcript buffer (evicted after the meeting ends) |
| `celery-*` | Various | 24h | Celery task state (managed by Celery itself) |
| PubSub channel `meeting:{id}:{event_type}` | — | — | Real-time event fan-out to WebSocket subscribers |

Every key pattern above either embeds `user_id` or `meeting_id` (which is itself only resolvable to a user through an authorization check) — this is the mechanical enforcement of the Data Isolation guarantee in `SECURITY.md`; there is no Redis key pattern in this system that is global across users.

## MinIO (Object Storage)

| Bucket | Key Pattern | Retention | Notes |
|---|---|---|---|
| `watchnt-audio` | `audio/{meeting_id}/{chunk_id}.webm` | 90 days (configurable via `AUDIO_RETENTION_DAYS`) | Raw audio chunks |
| `watchnt-exports` | `exports/{meeting_id}/{format}.{ext}` | 7 days | Generated export files, regenerable on demand |

UUID-based key namespacing makes object enumeration impractical even if bucket policy were ever misconfigured to be more permissive than intended (`SECURITY.md`, Data Isolation).

## Local Cache

Two distinct caches exist, at two distinct layers:

- **Server-side**: Redis's `embed:{sha256}` pattern (above) is the only cache in the traditional sense — a performance optimization with a defined TTL, safe to lose entirely (a cache miss just re-embeds).
- **Client-side (web app)**: TanStack Query's in-memory cache (`ARCHITECTURE.md` §6.2) caches server responses for the lifetime of the page session — this is not persisted across reloads in V2 (no `localStorage`-backed query persistence), which is consistent with never putting sensitive data in browser storage that isn't explicitly designed for it.

## Embedding Storage

Covered above (`meeting_embeddings` table, HNSW index). Worth restating here: embedding storage **lives in the same transaction boundary as the data it describes** — this is the central operational benefit of ADR-5 (pgvector over a dedicated vector database), and any future change to where embeddings live should be evaluated against losing that guarantee.

## Meeting Storage

`meetings`, `segments`, `speakers` — Layer 1 of the Memory Engine's three-layer model (`MEMORY_ENGINE.md`). `segments` is indexed `(meeting_id, start_time asc)` specifically because the dominant read pattern is "give me this meeting's transcript in chronological order," both for display and for assembling the full transcript text fed into the intelligence pipeline.

## Memory Storage

`action_items`, `decisions`, plus `meetings.summary`/`meetings.topics` (JSONB) — Layer 2. `action_items` is indexed `(user_id, status)` because the single most common cross-meeting query in the product (per `PROJECT.md` §1's example: *"which open action items are assigned to Sarah?"*) filters on exactly those two columns.

## Export Formats

| Format | Generation | Library | Storage |
|---|---|---|---|
| Markdown | Jinja2 template, synchronous for small meetings | `jinja2` | Returned directly, or `watchnt-exports` for async case |
| JSON | Direct Pydantic serialization | `pydantic` | Same as above |
| PDF | HTML → PDF | `weasyprint` | Same as above (the format most likely to need async generation per ADR-16) |
| Email | HTML Jinja2 template | `jinja2` + SendGrid/Resend | Sent directly, not stored as a file |

## Import Strategy

V2 has **no bulk-import feature** — meetings are created only via the documented capture flow (extension audio upload) or, per `ROADMAP.md`'s note that the extension is a deferrable subsystem, manual audio upload through the web app's equivalent endpoint. There is no "import your existing meeting notes from Notion/Otter/Granola" capability in V2; richer import is a reasonable V3 candidate but is not specified in any source document and should not be assumed or speculatively built (`IMPLEMENTATION_GUIDE.md`'s "No Speculative Abstractions" rule).

## Backup Strategy

Not detailed in the source documents at the level of a specific tool choice, but the architecture implies the correct shape: a self-hosted deployment (`PROJECT.md` G6) needs operator-managed backups of exactly two stateful systems — PostgreSQL (standard `pg_dump`/WAL-archiving practice, since it holds every piece of permanent data: Layers 2 and 3 of the memory engine, plus users and auth) and MinIO (bucket versioning or periodic sync, lower priority given audio's 90-day intentional expiry and exports' 7-day intentional expiry — **losing MinIO entirely is recoverable in a way losing Postgres is not**, because everything in MinIO is either time-limited-by-design or regenerable from Postgres data). Redis requires no backup — every value it holds is either a cache (regenerable), a queue (transient by nature), or rate-limit/session state (safe to lose, at worst forcing affected users to re-authenticate).

## Optional Sync Strategy

V2 is single-deployment; there is no sync mechanism because there is nothing to sync *between*. This becomes relevant only with organization accounts (V3) or a hypothetical future hosted offering — see `SECURITY.md`'s Future Cloud Sync Security section for the full treatment. It is explicitly not a V2 concern.

## IndexedDB and OPFS — Not Used in V2

The Origin Private File System (OPFS) and IndexedDB are common building blocks for **local-first** web applications that need substantial client-side persistence — exactly the architecture pattern ADR-1 deliberately moved away from for V2. Watchn't's client-side surfaces (the web app and the extension) hold no durable application data of their own:

- The web app's "state" is either server data (fetched via TanStack Query, never persisted client-side beyond the active session) or ephemeral UI state (Zustand, in-memory only).
- The extension's only persistent client-side data is the three-value `chrome.storage.local` settings object (`EXTENSION_ARCHITECTURE.md`).

Neither IndexedDB's structured on-device database nor OPFS's file-system-like storage has a role to play when there is no local-first dataset to store. **This could change** if the V4+ "Local-only mode" vision item (`PROJECT.md` §11) is ever pursued — a fully offline client running local transcription/embedding/LLM would need *somewhere* client-side to persist transcripts and embeddings, and IndexedDB (for structured records) or OPFS (for larger blobs, potentially including local model weights) would be the natural candidates at that point. Until that mode is actually scoped as a build target, introducing either technology would be unused complexity with no current consumer.

## State Persistence Summary

| Data | Storage | Retention | Rationale |
|---|---|---|---|
| Meeting records, segments, speakers | PostgreSQL | Permanent | Core memory-engine data |
| Summaries, action items, decisions | PostgreSQL | Permanent | Primary user-facing asset |
| Embeddings | PostgreSQL (pgvector) | Permanent, regenerable | Required for search and chat |
| Audio files | MinIO | 90 days | Raw audio; transcript is the permanent record |
| Export files | MinIO | 7 days | Regenerable on demand |
| User sessions | Redis | 24 hours | Short-lived auth state |
| Embedding cache | Redis | 7 days | Performance only |
| Live meeting buffer | Redis | 2 hours | Evicted after meeting ends |
| Extension settings | `chrome.storage.local` | Until uninstall/manual clear | Minimal client footprint by design |


---

# UX_GUIDELINES.md

> **Framing note**: none of `PROJECT.md`, `SPEC.md`, or `ARCHITECTURE.md` specify a UX/visual design system in detail. This section is therefore synthesized — consistent with the explicitly stated design principles (`PROJECT.md` §4), the chosen frontend stack (`SPEC.md` §3.3: Next.js, TailwindCSS 4, shadcn/ui, Zustand, TanStack Query, Framer Motion), the explicit accessibility goals (`SPEC.md` §15), and the four inspirations this template requests (Granola, Linear, Notion, Arc Browser) — rather than asserted as already-decided fact. Treat this section as a proposed starting point for a design system, not as something already implemented.

## Why These Four Inspirations, Specifically

- **Granola** — the closest direct competitor in the meeting-copilot category; relevant for how it balances a live, in-meeting surface (the sidebar transcript) against a calm, document-like post-meeting summary view. Watchn't's real-time transcript sidebar and post-meeting summary page (`PROJECT.md` §8, Workflow 1) are functionally the same two surfaces.
- **Linear** — relevant for information density done well: a power-user tool that stays fast and keyboard-driven without feeling cluttered. Watchn't's action-item and decision lists are structurally similar to Linear's issue lists, and should borrow its restraint, not its specific visual style.
- **Notion** — relevant for progressive disclosure of a flexible knowledge base; Watchn't's meeting-history-as-organizational-memory framing (`PROJECT.md` §1) is conceptually closer to a Notion workspace than to a single-purpose SaaS dashboard.
- **Arc Browser** — relevant for command-driven navigation (its command bar) and for treating "search" as a primary navigation mechanism rather than a secondary feature bolted onto a sidebar — directly applicable to Watchn't's semantic search and chat being core product surfaces, not afterthoughts.

## Layout

Three persistent regions, consistent with the route groups already defined in `ARCHITECTURE.md`'s monorepo structure (`(dashboard)/meetings`, `/search`, `/chat`, `/settings`):

- A slim left navigation rail (meetings, search, chat, settings) — always visible, never a hamburger-collapsed drawer on desktop, in the spirit of Linear's persistent sidebar.
- A primary content area that adapts per route: a list+detail split view for meetings (list on the left, transcript/summary on the right when a meeting is open), a single-column result list for search, a chat-style thread for the RAG interface.
- A contextual right-hand panel reserved for the **live transcript sidebar** during an active capture (`PROJECT.md` §8, Workflow 1, step 7) — this is the one surface that should feel "live" (streaming text) while everything else in the product feels static/document-like, mirroring Granola's split between in-meeting and post-meeting modes.

## Navigation

- Primary navigation is the left rail; it does not change shape based on what's selected (no nested flyouts that restructure the rail itself).
- Secondary navigation (within a meeting: transcript / summary / action items / decisions as tabs or anchored sections) stays inside the content area, never duplicated into the left rail.
- A command bar (Arc-inspired, triggered by `Cmd+K`/`Ctrl+K`) is the fastest path to: jump to a specific meeting, run a search query without leaving the current page, or jump to settings — this is the literal feature named in the backlog (`WEB-014`, "Keyboard shortcuts (Cmd+K search, etc.)"), not a speculative addition.

## Information Hierarchy

- A meeting's **summary** is the highest-priority content on its detail page — it should render above the fold, before the full transcript, because most users return to a past meeting to recall *what happened*, not to re-read it verbatim (this directly mirrors why the intelligence pipeline produces a summary as a first-class field on `meetings`, not just a derived view).
- **Action items and decisions** are the second tier — they are the actionable residue of a meeting and should be visually distinct (e.g., a checklist treatment for action items, consistent with their `status: open/completed` field) from the prose summary above them.
- The **full transcript** is always available but never the default view — it is the "show me the receipts" layer beneath summary and action items, consistent with progressive disclosure (`PROJECT.md` Design Principle 4).

## Keyboard Shortcuts

| Shortcut | Action | Source |
|---|---|---|
| `Cmd/Ctrl+K` | Open command bar / jump to search | `WEB-014` |
| `Esc` | Close command bar, close any open modal | Standard convention |
| `↑`/`↓` then `Enter` | Navigate and select search/command results | Standard convention, required for accessibility (keyboard-navigable interactive elements, `SPEC.md` §15) |

Every interactive surface must be reachable and operable without a mouse — this is not optional polish, it is a literal accessibility goal (`SPEC.md` §15: "All interactive elements keyboard-navigable").

## Search

Search is a primary product surface, not a secondary feature (Arc Browser influence, above) — and is implemented exactly as specified in `ARCHITECTURE.md` §15: 300ms debounce on input, ranked results with similarity+recency scoring, snippet highlighting on the matched text, and a one-click path from a result to the source meeting at the relevant timestamp (`PROJECT.md` §8, Workflow 2). The search input should be reachable from the command bar (above) as well as from its own dedicated page — two entry points to the same underlying query, not two different search implementations.

## Empty States

- **No meetings yet**: explain the two ways to start (install/use the extension, or manually upload audio per `ROADMAP.md`'s noted fallback) rather than showing a bare "No meetings" message.
- **No search results**: distinguish "no meetings indexed yet" from "meetings exist but none matched this query" — these require different next actions from the user (capture a meeting vs. rephrase the query).
- **No action items / no decisions on a given meeting**: this is a normal, expected state for a short or informal meeting, not an error — it should read as neutral ("No action items were extracted from this meeting"), never as a failure state.

## Loading States

Skeleton loading components (per `WEB-015`) for the meeting list, search results, and meeting detail page — never a generic spinner for content that has a predictable shape, since a skeleton communicates *what's about to appear* and reduces perceived latency more effectively than an undifferentiated spinner, directly supporting the LCP < 2s target (`PROJECT.md` §9) by making the *perceived* load feel faster even where the actual data fetch time is unchanged.

## Error States

Per `PROJECT.md` Design Principle 8 ("explicit error contracts... no generic 500 errors"), every error state shown to a user should reflect a specific, named failure, not a generic "Something went wrong":

- A meeting stuck in `processing` past a reasonable timeout should say so specifically, distinct from a meeting that failed outright.
- A failed chat message should distinguish "the LLM provider is unreachable" (a configuration/operator issue) from "no relevant meetings were found" (a legitimate empty-context answer) — these need different UI treatments and different next actions.
- Network errors during extension capture should surface in the popup badge (`!` per `EXT-003`'s notes) immediately, not silently retry forever with no visible indication.

## Motion Principles

Framer Motion is the chosen animation library (`SPEC.md` §3.3) specifically for its layout-animation and gesture support — used for: list-item enter/exit when search results update, the live transcript sidebar's new-segment appearance, and route-level transitions between meeting list and meeting detail. Motion should clarify state changes (something appeared, something moved, something was removed), never decorate for its own sake — consistent with Linear's restrained motion language rather than a more maximalist animation style. **All motion must respect `prefers-reduced-motion`** (`SPEC.md` §15) — this is a hard accessibility requirement, not a nice-to-have toggle.

## Accessibility

Restating `SPEC.md` §15 as design-system requirements: WCAG 2.1 AA compliance; all images carry alt text; color contrast ≥ 4.5:1 (this constrains the Tailwind color palette/design tokens chosen for shadcn/ui theming — a palette should be validated against this ratio before being adopted, not after); ARIA labels for screen reader support; explicit focus management on route changes (a route change should move focus to the new page's primary heading, not leave it on a now-unmounted element); `prefers-reduced-motion` support everywhere Framer Motion is used.

## Visual Consistency

shadcn/ui components are used **as provided**, themed via Tailwind config/CSS variables — `ARCHITECTURE.md`'s folder structure explicitly marks `components/ui/` as "do not modify." Visual consistency comes from disciplined use of a small design-token set (spacing scale, type scale, a constrained color palette validated for contrast) applied uniformly, not from per-feature custom styling layered on top of the base components.

## Productivity Features

- Command bar (`Cmd+K`) as the fastest path through the product (Arc influence).
- Keyboard-navigable lists everywhere a list appears (meetings, search results, action items) — arrow-key navigation plus `Enter` to open, matching the density-without-clutter standard set by Linear.
- Inline action-item completion (toggle `status` directly from the meeting detail view or a future cross-meeting action-item list) without navigating away — a small interaction, but exactly the kind of friction-reduction that distinguishes a tool people actually use daily from one they only open occasionally.


---

# CONTRIBUTING.md

> Expands the Git conventions in `SPEC.md` §2.2 and the CI/CD pipeline in §13.3 into full contributor guidelines, for both human and AI contributors.

## Repository Workflow

1. Pick (or be assigned) a ticket from `SPEC.md` Part C, or a follow-on task tracked the same way.
2. Confirm the ticket's listed dependencies are actually complete — per the Builder's Guide Rule 3, **stop and report** if a dependency is missing rather than improvising a stub.
3. Create a branch (see Branch Strategy below).
4. Implement exactly the scope of that one ticket (Builder's Guide Rule 1: one ticket at a time; Rule 7: keep changes scoped to the files the ticket lists, documenting any necessary deviation).
5. Write the tests the ticket specifies (Rule 6) — not optional.
6. Open a PR. CI must pass (lint, type check, unit tests, integration tests, build) before review.
7. Squash-merge to `main` on approval.

## Branch Strategy

- One ticket = one branch = one PR (`SPEC.md` §2.2).
- Branch naming: `{ticket-id}/{short-description}`, e.g. `AUTH-002/jwt-middleware`.
- No long-lived feature branches — per `PROJECT.md` Design Principle 7 ("Ship behind flags"), branches live only as long as the single ticket they implement takes to land. A feature that isn't ready for users yet ships behind a flag on `main`, not on a branch that diverges from `main` for weeks.

## Pull Request Requirements

A PR must include:
- A reference to the ticket ID it implements (or, for non-ticket work, a clear statement of scope).
- All tests the ticket's "Testing Requirements" section specifies, passing in CI.
- No changes outside the ticket's "Files Expected to Change" list without an explanatory note in the PR description (and ideally a `# DEVIATION from RFC` comment at the relevant code location, per Builder's Guide Rule 11).
- A Conventional Commit message on the squash-merge commit (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`).

## Code Review Checklist

Reviewers should verify, in order:
1. **Scope**: does this PR touch only what its ticket implies?
2. **Boundaries**: does it respect the forbidden-import rules in `ARCHITECTURE.md` §3 (CI should catch this mechanically, but a reviewer should recognize a violation on sight)?
3. **Tests**: are the ticket's specified tests present and meaningful (not a test that merely asserts the function didn't throw)?
4. **Naming/conventions**: does it follow `CODING_STANDARDS.md` (snake_case/PascalCase/kebab-case per context, named exports only, no `any`)?
5. **Error handling**: no bare `except:`, no silently-swallowed errors, named exceptions with mapped HTTP status codes where applicable.
6. **Deviations documented**: any departure from the RFC/ticket interface is flagged in-code and in the PR description, not silently merged.

## Documentation Requirements

- A new service, repository, or AI prompt module ships with the docstring/JSDoc conventions in `CODING_STANDARDS.md`.
- A new architectural decision (anything that would change an answer in `DECISIONS.md` if asked today) requires a new ADR entry, proposed in the PR description for discussion before being added to `DECISIONS.md` outright.
- A new API endpoint should be self-documenting via its Pydantic models (FastAPI's automatic OpenAPI generation) — no separate hand-written API reference to keep in sync.

## Testing Requirements

Per `TESTING.md`: new service/AI logic ships with unit tests; new endpoints ship with integration tests; coverage on `services/`, `ai/`, and `db/repositories/` must not regress below 80%. A PR that drops coverage below this floor should not merge without an explicit, reviewed justification.

## AI Contribution Workflow

This repository is designed to be implemented substantially by coding AIs, ticket by ticket (`SPEC.md`'s "Builder's Guide for Coding LLMs"). For an AI contributor specifically:

- Read the full ticket — objective, dependencies, interfaces, acceptance criteria, testing requirements, implementation notes — before writing any code (Builder's Guide Rule 2).
- Treat interfaces defined in a ticket as contracts; do not rename functions or change parameter/return types without explicit human approval, since other tickets depend on them as written (Rule 4).
- Never redesign the architecture to "fix" something that seems wrong — document the concern in a code comment and proceed with the specified design; flag it for human review separately (Rule 5).
- Follow YAGNI: no speculative abstractions, no "future-proofing" beyond what the current ticket requires (Rule 12).
- Leave the repository buildable after every ticket: `make build`, `make test`, `make lint`, and `make dev` must all succeed (Rule 10).
- When the specification is genuinely ambiguous, implement the simplest interpretation that satisfies the acceptance criteria, and document that interpretation in a comment (Rule 15) rather than guessing silently or stalling.

## Commit Message Convention

Conventional Commits, enforced at squash-merge time:

```
feat: add semantic search endpoint
fix: correct chunk-overlap calculation in embedding pipeline
chore: bump litellm to 1.4x
docs: expand AI_PROVIDER_SPEC.md retry strategy
test: add integration coverage for WebSocket meeting scope
refactor: extract context-window truncation into a shared utility
```

## Versioning Strategy

`PROJECT.md`, `SPEC.md`, and `ARCHITECTURE.md` are each versioned independently as documents (currently `2.0.0`), following semantic versioning applied to documentation: a **major** bump for an architecture-changing revision (V2→V3 in the product sense), a **minor** bump for a substantive addition that doesn't break existing decisions, a **patch** bump for clarifications and corrections. The application itself should follow the same semver discipline once it has external consumers of its API (a breaking change to a documented endpoint contract is a major version bump of the API, independent of the product's own V2/V3/V4+ marketing-facing version labels, which is exactly why `ROADMAP.md` includes a note disambiguating the two numbering schemes).


---

# IMPLEMENTATION_GUIDE.md

> This is the most important document in this set. It synthesizes `SPEC.md`'s "Builder's Guide for Coding LLMs," the module dependency rules in `ARCHITECTURE.md` §3, and the design principles in `PROJECT.md` §3–4 into a single operating manual for anyone — human or AI — implementing Watchn't V2.

## Development Philosophy

Six principles, restated from `PROJECT.md` §3 as build-time discipline rather than abstract values:

- **Server-Side Intelligence**: if you find yourself adding AI logic to `apps/extension` or `apps/web`, stop — that code belongs in `server/app/ai/`. There is no exception to this for "just a quick client-side heuristic."
- **Python Backend, TypeScript Frontend**: do not introduce a second backend language or a shared cross-language package to "simplify" type sharing. The friction of manually mirroring types (`CODING_STANDARDS.md`) is an accepted, bounded cost — not a problem to solve by violating ADR-2.
- **Schema-First**: write the Pydantic model before the endpoint. If you're tempted to `return {"foo": bar}` from a handler without a `response_model`, you're building the wrong way around.
- **Explicit Over Implicit**: if a reviewer has to ask "wait, where does this get set?", the answer should be a comment or a docstring, not "you have to trace three function calls to find out."
- **Fail Loud, Recover Gracefully**: a swallowed exception is a future 3am page with no log line to explain it. Log with context, surface with a named exception, retry where retrying is the correct response, and never let one failure silently corrupt a broader record (one bad audio chunk ≠ a failed meeting).
- **Composition Over Inheritance**: if you're reaching for a base class to share behavior between two services, reach for a shared, injected dependency instead.

## Repository Rules

- One ticket at a time. Do not combine tickets, and do not start ticket N+1 before ticket N's tests pass (Builder's Guide Rule 1).
- Read the entire ticket before writing code — objective, dependencies, interfaces, acceptance criteria, testing requirements, implementation notes (Rule 2).
- If a dependency ticket isn't actually done, stop and report it. Do not stub or mock around a missing dependency to make forward progress look real (Rule 3).

## Architectural Guardrails

The forbidden-import graph from `ARCHITECTURE.md` §3, restated as a checklist every PR should pass:

```
[ ] api/*.py does not import anything from db/ directly
[ ] services/*.py does not import anything from api/
[ ] workers/*.py does not import anything from api/
[ ] ai/*.py does not import anything from db/
[ ] db/*.py does not import from services/, api/, ai/, or workers/
[ ] apps/web does not import from apps/extension, or vice versa
```

If a change seems to *require* violating one of these, the change is wrong, not the rule — open a discussion (and, if the rule genuinely needs to change, a new ADR superseding the relevant one in `DECISIONS.md`) rather than quietly importing across the boundary "just this once."

## Things That Must Never Change Without an ADR

- The provider abstraction boundary (ADR-10): no provider-specific code outside `litellm`'s own internals, anywhere in the codebase.
- The extension's AI-free boundary (ADR-9): no LLM calls, no provider credentials, no persistent meeting data in `apps/extension`.
- The three-layer memory model's retention asymmetry (ADR-13): audio expires; transcripts, summaries, action items, and decisions do not, ever, automatically.
- The `user_id`-scoping discipline at the repository layer (`SECURITY.md`, Authorization): every "get a thing" repository function takes `user_id` as a required parameter.
- The dual-auth model (ADR-18): exactly two authentication patterns (JWT-cookie for browser clients, API-key-header for machine clients) — a third client should fit one of these two, not invent a third pattern.

## How to Add New Features

1. Identify which layer owns the new behavior (API validation? Business rule? AI extraction? Background processing?) using the package responsibility table in `ARCHITECTURE.md` §3.
2. Write the Pydantic model(s) first if the feature touches the API surface (ADR-3).
3. Implement the service method with injected dependencies, unit-testable without a live database or LLM call.
4. Wire the API handler (or worker task) to call the service — the handler/task should be a thin adapter, not where the logic lives.
5. Write tests at the layer(s) the feature actually touches (`TESTING.md`).
6. If the feature is a genuinely new architectural pattern (not just a new instance of an existing one), write the ADR *before* merging, not after.

## How to Add New AI Providers

Per ADR-10 and `AI_PROVIDER_SPEC.md`'s Future Provider Support section: this should require **zero changes to Watchn't's own code**. Confirm `litellm` already supports the target provider (it almost certainly does); if so, the only work is operator-side configuration (setting `llm_model` to the new provider's model string, and supplying the relevant credential env var). If the provider needs a distinct credential field not already in `Settings`, add it there — and update the `OBS-002` pricing table so cost tracking remains accurate. If you find yourself writing a provider-specific function anywhere in `server/app/ai/`, you have broken ADR-10 — stop and route through `litellm` instead.

## How to Add Integrations

Per the Future Extension Points table in `SPEC.md` §16: a new integration (Slack, Jira, a future webhook consumer) is a new **worker** following the existing `notification_worker` pattern — triggered by an existing pipeline event (e.g., `intelligence.complete`), not a new entry point bolted onto the API layer. This keeps integrations consistent with the documented event flow (`ARCHITECTURE.md` §6) instead of each integration inventing its own triggering mechanism.

## How to Maintain Package Boundaries

- Treat the forbidden-import list above as load-bearing, not aspirational — wire up CI import-linting (Python: `import-linter`; TypeScript: a custom ESLint rule) as one of the very first `INFRA-*`-equivalent tasks if it isn't already in place, because boundary violations are far cheaper to prevent mechanically than to find in review months later.
- When a new file doesn't obviously belong to an existing package, re-read the package responsibility table (`ARCHITECTURE.md` §3) before creating a new top-level folder — most "doesn't fit anywhere" feelings resolve once you ask "is this business logic (`services/`), a query (`db/`), an AI call (`ai/`), or a background job (`workers/`)?"

## How to Avoid Technical Debt

- **YAGNI, enforced**: no abstractions, base classes, or configuration knobs for a use case that doesn't exist yet (Builder's Guide Rule 12). A `ProviderRegistry` class would be exactly this kind of premature abstraction — ADR-10 deliberately avoids building one.
- **Document deviations the moment they happen**, not "later" (Rule 11) — a `# DEVIATION from RFC` comment written in the moment captures the actual reasoning; the same comment written from memory three weeks later usually doesn't.
- **Don't let a "while I'm in here" refactor cross a ticket boundary** — Builder's Guide Rule 7 (keep changes scoped) exists specifically to prevent technical debt from being introduced under the cover of an unrelated, larger diff that's harder to review carefully.

## Build Order Philosophy

The recommended build order (`SPEC.md` Part B, `ROADMAP.md`'s Dependencies section) is not arbitrary — it sequences work so that **every phase produces something independently testable** before the next phase depends on it: infrastructure before auth, auth before data models, data models before AI processing, and AI processing in parallel with (not blocking) frontend work, since the frontend can develop against a contract (the Pydantic models / OpenAPI schema) before every backend capability is fully wired up. Do not skip ahead to a flashy feature (chat, search) before the unglamorous foundation (auth, meeting CRUD, the transcription worker) is solid — every later phase's tests assume the earlier phases actually work.

## Dependency Management Philosophy

A new dependency is added only when the current ticket genuinely needs it (`CODING_STANDARDS.md`'s Dependency Management section) — never "because we'll probably want it for the next ticket." This mirrors YAGNI applied specifically to the dependency tree, and keeps the audit surface (a real security/maintenance concern for a self-hosted product whose operators are trusting Watchn't's dependency choices) as small as it can be at every point in time.

## Refactoring Guidelines

- A refactor that does not change behavior should not need new tests beyond confirming existing tests still pass — if it does need new tests, it probably changed behavior and should be reviewed as such.
- A refactor never crosses a package boundary "to make things cleaner" without an ADR — moving logic from `services/` into `db/repositories/` (or vice versa) is an architectural change, not a tidy-up, regardless of how small the diff looks.
- Prefer refactoring within a ticket's existing scope over batching multiple unrelated cleanups into one PR — small, reviewable diffs compound into a maintainable codebase; large "while I was in there" diffs compound into review fatigue and missed regressions.

## Definition of Done for New Features

A feature is done when, and only when:

- [ ] It satisfies its ticket's (or ADR's) acceptance criteria exactly as written.
- [ ] It respects every forbidden-import boundary (CI-verified).
- [ ] Its tests exist at the correct layer(s) per `TESTING.md` and pass in CI.
- [ ] Coverage on `services/`, `ai/`, and `db/repositories/` has not regressed below 80%.
- [ ] No secrets, no `any` types, no bare `except:`, no silently swallowed errors were introduced.
- [ ] Any deviation from the documented architecture is recorded as a code comment and surfaced in the PR description.
- [ ] The repository still builds, lints, tests, and starts (`make build`, `make lint`, `make test`, `make dev`) after the change.
- [ ] If the feature touches a Success Metric in `PROJECT.md` §9 (latency, accuracy, reliability), there is a way to measure that metric for this feature specifically — not just a hope that it's fine.

---

## Non-Negotiable Engineering Principles

These are the project's constitution. Everything else in this document set is detail; this list is what survives if everything else had to be rewritten from scratch.

1. **The browser is a thin client. The server does the thinking.** No AI logic, ever, in `apps/extension` or `apps/web`.
2. **Every external dependency — LLM provider, embedding provider, deployment target — must be swappable, never hardcoded.** `litellm`'s model-string abstraction is the enforcement mechanism; do not build a second, parallel way to talk to a provider.
3. **No Watchn't-operated infrastructure ever receives user audio or transcripts.** Every deployment is the user's own. This is not a feature flag — it is the absence of a code path that would need to exist for it to be otherwise.
4. **Every database query that returns user data is scoped by `user_id`, enforced at the repository layer, not only at the API layer.**
5. **A failing component fails loudly and locally. It never silently corrupts the broader record it's part of.** One bad audio chunk is a retry and a gap, never a failed meeting.
6. **Every architectural decision lives in `DECISIONS.md`, with its trade-offs, before it lives in code that depends on it.**
7. **The package dependency graph in `ARCHITECTURE.md` §3 is enforced by CI, not by convention.** A human forgetting to check a boundary is expected; a machine forgetting to check it is a process failure.
8. **No speculative abstraction.** Build for the ticket in front of you. The next ticket can justify its own abstraction when it actually arrives.
9. **Every prompt is versioned. Every LLM call is traceable to the model, the prompt version, and the cost it incurred.**
10. **Self-hosting via `docker compose up` is a permanent product guarantee, not a current convenience.** Any new required dependency must fit inside that single command or the guarantee is broken.
11. **A feature is not done until its tests exist at the right layer and its relevant Success Metric (if any) is measurable.**
12. **When the specification is ambiguous, choose the simplest implementation that satisfies the acceptance criteria, document the interpretation, and move forward** — ambiguity is not a license to redesign, and it is not a reason to stall.

