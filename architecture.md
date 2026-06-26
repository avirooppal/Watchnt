# ARCHITECTURE.md — Watchn't V2

> **Document Type**: System Architecture Reference  
> **Status**: Approved  
> **Version**: 2.0.0  
> **Last Updated**: June 26, 2026  
> **Source of Truth**: [`SPEC.md`](./SPEC.md)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Package Responsibilities](#3-package-responsibilities)
4. [Folder Structure](#4-folder-structure)
5. [Data Flow](#5-data-flow)
6. [Event Flow](#6-event-flow)
7. [AI Pipeline](#7-ai-pipeline)
8. [Audio Pipeline](#8-audio-pipeline)
9. [Memory Pipeline](#9-memory-pipeline)
10. [Export Pipeline](#10-export-pipeline)
11. [Storage Architecture](#11-storage-architecture)
12. [Extension Architecture](#12-extension-architecture)
13. [Provider Architecture](#13-provider-architecture)
14. [Knowledge Graph](#14-knowledge-graph)
15. [RAG Pipeline](#15-rag-pipeline)
16. [Security Architecture](#16-security-architecture)

---

## 1. System Overview

Watchn't V2 is a server-centric, Python-backend AI Meeting Copilot. The architecture is deliberately divided into three tiers:

1. **Capture Tier** — The Chrome extension captures audio from the browser and streams it to the server. It has no AI capability and no local state beyond the active capture session.
2. **Processing Tier** — The FastAPI server and Celery workers perform all AI processing: transcription, diarization, summarization, embedding, and notification.
3. **Presentation Tier** — The Next.js web application displays results, provides search, and exposes the RAG chat interface.

```
┌────────────────────────────────────────────────────────────────────┐
│                         CAPTURE TIER                               │
│                                                                    │
│   ┌──────────────────────────┐   ┌──────────────────────────────┐ │
│   │    Chrome Extension       │   │     Next.js Web App           │ │
│   │                           │   │                              │ │
│   │  chrome.tabCapture        │   │  Meeting list, detail, chat  │ │
│   │  → WebM chunks (10s)      │   │  Search, export              │ │
│   │  → POST /audio            │   │  Real-time transcript sidebar│ │
│   │  Auth: X-API-Key header   │   │  Auth: httpOnly JWT cookie   │ │
│   └──────────┬────────────────┘   └──────────────┬───────────────┘ │
└──────────────┼──────────────────────────────────┼─────────────────┘
               │  HTTP POST (audio)                │  HTTP + WebSocket
               ▼                                   ▼
┌────────────────────────────────────────────────────────────────────┐
│                        PROCESSING TIER                             │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                     FastAPI Application                       │ │
│  │                                                              │ │
│  │   api/v1/auth        api/v1/meetings    api/v1/search        │ │
│  │   api/v1/chat        api/v1/export      api/v1/action_items  │ │
│  │   realtime/ws        api/v1/webhooks                         │ │
│  │                                                              │ │
│  │   ├── services/  (business logic)                            │ │
│  │   ├── ai/        (llm, embeddings, prompts, pipeline)        │ │
│  │   └── db/        (repositories, tables, session)             │ │
│  └──────────────────────────┬───────────────────────────────────┘ │
│                              │  Enqueue tasks                      │
│                              ▼                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                   Celery Workers                              │ │
│  │                                                              │ │
│  │   transcription_worker  diarization_worker                   │ │
│  │   intelligence_worker   embedding_worker                     │ │
│  │   notification_worker                                        │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────────────────────────────┐
│                          DATA TIER                                 │
│                                                                    │
│   ┌────────────────┐   ┌────────────────┐   ┌────────────────┐   │
│   │  PostgreSQL 16  │   │   Redis 7       │   │   MinIO        │   │
│   │  + pgvector     │   │                │   │   (S3-compat)  │   │
│   │                 │   │  • Task queue  │   │                │   │
│   │  • All tables   │   │  • PubSub      │   │  • Audio files │   │
│   │  • HNSW vectors │   │  • Cache       │   │  • Exports     │   │
│   │  • FTS index    │   │  • Rate limits │   │                │   │
│   └────────────────┘   └────────────────┘   └────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                             │
│                                                                    │
│   OpenAI Embeddings API    Anthropic / OpenAI LLM API             │
│   SendGrid / Resend Email  Google Calendar API (V3)               │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Structure

The repository is a monorepo with two frontend applications and one Python backend. There is no shared package between frontend applications in V2 — the extension and web app are independent TypeScript projects.

```
watchnt/
│
├── apps/
│   ├── web/                          # Next.js 14 (App Router) web application
│   │   ├── app/                      # App Router pages and layouts
│   │   │   ├── (auth)/               # Auth route group (login, register)
│   │   │   ├── (dashboard)/          # Authenticated route group
│   │   │   │   ├── meetings/         # Meeting list and detail pages
│   │   │   │   ├── search/           # Semantic search page
│   │   │   │   ├── chat/             # RAG chat interface
│   │   │   │   └── settings/         # User settings, API key management
│   │   │   ├── api/                  # Next.js API routes (thin proxies only)
│   │   │   ├── layout.tsx            # Root layout
│   │   │   └── globals.css           # Global styles
│   │   ├── components/               # Reusable React components
│   │   │   ├── ui/                   # shadcn/ui base components (do not modify)
│   │   │   ├── meeting/              # Meeting-specific components
│   │   │   ├── transcript/           # Transcript display components
│   │   │   ├── search/               # Search UI components
│   │   │   └── layout/               # Navigation, sidebar, header
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── lib/                      # Client-side utilities (API client, formatters)
│   │   ├── store/                    # Zustand state stores
│   │   ├── styles/                   # Tailwind config, CSS variables
│   │   ├── public/                   # Static assets
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── extension/                    # Chrome Extension (Manifest V3)
│       ├── src/
│       │   ├── background/           # Service worker (persistent background)
│       │   │   └── service-worker.ts # Main entry point
│       │   ├── content/              # Content scripts (injected into pages)
│       │   │   └── meeting-detector.ts
│       │   ├── popup/                # Extension popup UI
│       │   │   ├── popup.html
│       │   │   ├── popup.tsx
│       │   │   └── components/
│       │   └── shared/               # Shared constants and types
│       │       ├── types.ts
│       │       ├── constants.ts
│       │       └── api-client.ts     # HTTP client for server communication
│       ├── manifest.json             # MV3 manifest
│       ├── tsconfig.json
│       ├── vite.config.ts            # Vite + CRXJS for extension bundling
│       └── package.json
│
├── server/                           # FastAPI Python backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI app, routers, lifespan handlers
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── auth.py           # /auth/register, /auth/login, /auth/me
│   │   │       ├── meetings.py       # /meetings CRUD + /audio upload
│   │   │       ├── transcripts.py    # /meetings/{id}/transcript
│   │   │       ├── action_items.py   # /action-items CRUD
│   │   │       ├── search.py         # /search (semantic + full-text)
│   │   │       ├── chat.py           # /chat (RAG, streaming SSE)
│   │   │       ├── export.py         # /meetings/{id}/export
│   │   │       ├── users.py          # /users/me profile
│   │   │       └── webhooks.py       # /webhooks (calendar, etc.)
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py             # Settings via pydantic-settings
│   │   │   ├── security.py           # JWT encode/decode, password hashing
│   │   │   ├── deps.py               # FastAPI dependency injection functions
│   │   │   ├── storage.py            # MinIO/S3 client wrapper
│   │   │   └── exceptions.py         # Custom exception classes + handlers
│   │   ├── models/                   # Pydantic request/response schemas
│   │   │   ├── __init__.py
│   │   │   ├── common.py             # PaginatedResponse, ErrorResponse
│   │   │   ├── user.py               # UserPublic, RegisterRequest, LoginRequest
│   │   │   ├── meeting.py            # MeetingCreate, MeetingPublic, MeetingDetail
│   │   │   ├── transcript.py         # SegmentCreate, SegmentPublic
│   │   │   ├── speaker.py            # SpeakerCreate, SpeakerPublic
│   │   │   ├── action_item.py        # ActionItemCreate, ActionItemPublic
│   │   │   └── search.py             # SearchRequest, SearchResult
│   │   ├── services/                 # Business logic layer
│   │   │   ├── __init__.py
│   │   │   ├── meeting_service.py    # Meeting orchestration
│   │   │   ├── transcript_service.py # Segment assembly, transcript formatting
│   │   │   ├── search_service.py     # Hybrid search coordination
│   │   │   ├── export_service.py     # Format conversion (MD, PDF, JSON)
│   │   │   └── notification_service.py # Email + Slack dispatch
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── session.py            # Async engine + session factory
│   │   │   ├── tables.py             # SQLAlchemy Core table definitions
│   │   │   └── repositories/
│   │   │       ├── __init__.py
│   │   │       ├── user_repo.py
│   │   │       ├── meeting_repo.py
│   │   │       ├── transcript_repo.py
│   │   │       ├── speaker_repo.py
│   │   │       ├── action_item_repo.py
│   │   │       └── search_repo.py
│   │   ├── ai/
│   │   │   ├── __init__.py
│   │   │   ├── llm.py                # litellm wrapper — complete() function
│   │   │   ├── embeddings.py         # Embedding generation + Redis caching
│   │   │   ├── pipeline.py           # Intelligence pipeline orchestrator
│   │   │   └── prompts/
│   │   │       ├── __init__.py
│   │   │       ├── summary.py        # SYSTEM_PROMPT, VERSION, SummaryOutput
│   │   │       ├── action_items.py   # SYSTEM_PROMPT, VERSION, ActionItemsOutput
│   │   │       ├── decisions.py      # SYSTEM_PROMPT, VERSION, DecisionsOutput
│   │   │       └── context.py        # SYSTEM_PROMPT, VERSION, MeetingContext
│   │   ├── workers/
│   │   │   ├── __init__.py
│   │   │   ├── celery_app.py         # Celery configuration
│   │   │   ├── transcription.py      # faster-whisper task
│   │   │   ├── diarization.py        # pyannote.audio task
│   │   │   ├── intelligence.py       # LLM intelligence task
│   │   │   ├── embedding.py          # Vector embedding task
│   │   │   └── notification.py       # Email + Slack task
│   │   └── realtime/
│   │       ├── __init__.py
│   │       ├── manager.py            # WebSocket connection registry
│   │       └── meeting_ws.py         # Meeting-specific WS endpoint
│   ├── migrations/
│   │   ├── env.py
│   │   ├── alembic.ini
│   │   └── versions/                 # One file per migration, never delete
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   ├── conftest.py               # Shared fixtures (db, client, users)
│   │   └── fixtures/                 # Static test data (audio samples, etc.)
│   ├── pyproject.toml
│   ├── Dockerfile
│   └── .env.example
│
├── docker-compose.yml                # Production-equivalent stack
├── docker-compose.dev.yml            # Dev overrides (hot reload, exposed ports)
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint + typecheck + test on every PR
│       └── deploy.yml                # Deploy to staging on merge to main
├── Makefile                          # Common commands (dev, test, lint, build)
├── .gitignore
└── README.md
```

---

## 3. Package Responsibilities

Each package has exactly one responsibility. Violations of these boundaries are architectural defects that must be corrected, not accommodated.

| Package | Owns | Does NOT own |
|---|---|---|
| `apps/web` | UI rendering, client-side state, route-level data fetching via TanStack Query | Business logic, AI processing, direct DB access, sensitive secrets |
| `apps/extension` | Tab audio capture, chunked upload to server, capture session state | AI processing, embedding, LLM calls, persistent storage beyond session |
| `server/app/api/v1` | HTTP request parsing, input validation, response serialization, authentication enforcement | Business logic (delegates to `services`), SQL queries (delegates to `db`) |
| `server/app/services` | Business rule enforcement, orchestration across repositories, domain decisions | SQL queries (delegates to `db`), HTTP handling, AI prompts |
| `server/app/db` | SQL query execution, connection lifecycle, schema definitions | Business logic, HTTP concerns, AI calls |
| `server/app/ai` | LLM calls, embedding generation, prompt templates, pipeline orchestration | Database access, HTTP routing, background scheduling |
| `server/app/workers` | Background task execution, Celery task definitions | HTTP request handling, direct WebSocket communication |
| `server/app/realtime` | WebSocket connection registry, event broadcast via Redis PubSub | Business logic, SQL queries, AI calls |
| `server/app/core` | Config, security utilities, dependency injection, shared exceptions, storage client | Business logic specific to any domain |

### Module Dependency Rules (Enforced)

The following dependency directions are the only ones permitted. Any import violating this graph is a bug.

```
api/v1/*.py
    └── services/*.py
            ├── db/repositories/*.py  ──► PostgreSQL
            ├── ai/pipeline.py
            │       ├── ai/llm.py     ──► litellm ──► LLM Provider
            │       └── ai/embeddings.py ──► OpenAI Embedding API
            └── core/*.py

workers/*.py
    ├── services/*.py  (same rules as above)
    └── realtime/manager.py ──► Redis PubSub ──► WebSocket clients

realtime/meeting_ws.py
    └── Redis PubSub (subscribe)
```

**Forbidden imports (import linting enforced in CI)**:

- `api` must never import from `db` directly
- `services` must never import from `api`
- `workers` must never import from `api`
- `ai` must never import from `db`
- `db` must never import from `services`, `api`, `ai`, or `workers`
- Frontend (`apps/web`) must never import from `apps/extension` or vice versa

---

## 4. Folder Structure

### Naming Conventions

| Context | Convention | Example |
|---|---|---|
| Python files | `snake_case.py` | `meeting_service.py` |
| Python classes | `PascalCase` | `MeetingService` |
| Python functions | `snake_case` | `get_meeting_by_id` |
| Python constants | `UPPER_SNAKE_CASE` | `MAX_CHUNK_SIZE_MB` |
| TypeScript files (components) | `kebab-case.tsx` | `meeting-card.tsx` |
| TypeScript files (utilities) | `camelCase.ts` | `formatDuration.ts` |
| TypeScript components | `PascalCase` | `MeetingCard` |
| TypeScript constants | `UPPER_SNAKE_CASE` | `API_BASE_URL` |
| Database tables | `snake_case` plural | `meeting_embeddings` |
| Database columns | `snake_case` | `started_at` |
| API routes | `kebab-case` | `/api/v1/action-items` |
| Environment variables | `UPPER_SNAKE_CASE` | `DATABASE_URL` |

---

## 5. Data Flow

### 5.1 Meeting Capture and Processing Flow

The complete data flow from audio capture to searchable memory:

```
┌──────────────────────────────────────────────────────────────────┐
│  PHASE 1: CAPTURE                                                │
│                                                                  │
│  Chrome Extension                                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ chrome.tabCapture.capture()                                │ │
│  │     → MediaStream → MediaRecorder (WebM, 10s chunks)      │ │
│  │     → ondataavailable → HTTP POST /api/v1/meetings/{id}/audio │
│  └──────────────────────────────┬─────────────────────────────┘ │
└─────────────────────────────────┼────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  PHASE 2: STORAGE                                                │
│                                                                  │
│  FastAPI: POST /api/v1/meetings/{id}/audio                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Validate request (API key, meeting ownership)           │ │
│  │ 2. Store WebM blob in MinIO: audio/{meeting_id}/{chunk}.webm │
│  │ 3. Update meeting status → "live" (first chunk only)       │ │
│  │ 4. Enqueue: transcription_worker.delay(chunk_id, meeting_id) │
│  │ 5. Return: { chunk_id, duration_sec }                      │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  PHASE 3: TRANSCRIPTION (Celery Worker)                          │
│                                                                  │
│  transcription_worker(chunk_id, meeting_id)                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Download audio from MinIO                               │ │
│  │ 2. faster-whisper.transcribe() → segments[]                │ │
│  │    Each segment: { text, start_time, end_time, confidence } │ │
│  │ 3. Bulk insert segments into PostgreSQL                    │ │
│  │ 4. Publish to Redis PubSub: meeting:{id}:segments          │ │
│  │    (WebSocket manager delivers to connected clients)       │ │
│  │ 5. Enqueue: diarization_worker.delay(chunk_id, meeting_id) │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  PHASE 4: DIARIZATION (Celery Worker)                            │
│                                                                  │
│  diarization_worker(chunk_id, meeting_id)                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Load audio from MinIO                                   │ │
│  │ 2. Load segments for this chunk from PostgreSQL            │ │
│  │ 3. pyannote.audio → speaker turn timeline                  │ │
│  │    { speaker_label, start_time, end_time }[]               │ │
│  │ 4. Create/upsert speakers in `speakers` table              │ │
│  │ 5. Update segments with speaker_id                         │ │
│  │ 6. Publish to Redis PubSub: meeting:{id}:speakers          │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                                  │
                   (meeting end signal received)
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  PHASE 5: INTELLIGENCE (Celery Worker — runs once on meeting end)│
│                                                                  │
│  intelligence_worker(meeting_id)                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Load all segments → assemble full transcript            │ │
│  │ 2. Run PARALLEL LLM calls via asyncio.gather():            │ │
│  │    ├── summary_task(transcript) → SummaryOutput            │ │
│  │    ├── action_items_task(transcript) → ActionItemsOutput   │ │
│  │    └── decisions_task(transcript) → DecisionsOutput        │ │
│  │ 3. Run SEQUENTIAL context_task(summary, actions, decisions) │ │
│  │    → MeetingContext (merged, deduplicated)                 │ │
│  │ 4. Write to PostgreSQL:                                    │ │
│  │    - meetings.summary, meetings.topics                     │ │
│  │    - action_items rows (bulk insert)                       │ │
│  │    - decisions rows (bulk insert)                          │ │
│  │ 5. Update meeting status → "completed"                     │ │
│  │ 6. Publish to Redis PubSub: meeting:{id}:intelligence      │ │
│  │ 7. Enqueue embedding_worker, notification_worker (parallel) │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
          │                                    │
          ▼                                    ▼
┌──────────────────────┐          ┌───────────────────────────────┐
│  PHASE 6: EMBEDDING  │          │  PHASE 7: NOTIFICATION        │
│                      │          │                               │
│  embedding_worker    │          │  notification_worker          │
│  ┌────────────────┐  │          │  ┌─────────────────────────┐ │
│  │ 1. Load full   │  │          │  │ 1. Load summary,        │ │
│  │    transcript  │  │          │  │    action items         │ │
│  │ 2. Chunk into  │  │          │  │ 2. Render HTML email    │ │
│  │    500-token   │  │          │  │    via Jinja2 template  │ │
│  │    windows     │  │          │  │ 3. Send via SendGrid    │ │
│  │    (50 overlap)│  │          │  │    or Resend            │ │
│  │ 3. Embed each  │  │          │  │ 4. Post to Slack        │ │
│  │    chunk via   │  │          │  │    (if configured)      │ │
│  │    OpenAI API  │  │          │  └─────────────────────────┘ │
│  │ 4. Store in    │  │          └───────────────────────────────┘
│  │    pgvector    │  │
│  └────────────────┘  │
└──────────────────────┘
```

### 5.2 Search Data Flow

```
User types query in search bar
    │
    ▼ (300ms debounce)
POST /api/v1/search { query: "...", limit: 10 }
    │
    ▼
search_service.search(query, user_id)
    │
    ├─► embeddings.embed(query)
    │       └─► Check Redis cache (sha256(query) → 7-day TTL)
    │           Cache miss → OpenAI text-embedding-3-small
    │           Cache set → return 1536-dim vector
    │
    ▼
search_repo.semantic_search(vector, user_id, limit=10)
    │
    ▼
pgvector: SELECT ... ORDER BY embedding <=> $1 LIMIT 10
    (cosine distance, filtered by user_id)
    │
    ▼
JOIN with meetings, segments, speakers for context
    │
    ▼
Re-rank: score = (0.7 × similarity) + (0.3 × recency_score)
    │
    ▼
Return SearchResult[]:
    { meeting_id, meeting_title, meeting_date,
      chunk_text, speaker_label, similarity_score,
      highlight_snippet }
```

### 5.3 RAG Chat Data Flow

```
User sends message in /chat
    │
    ▼
POST /api/v1/chat { message: "...", conversation_id: "..." }
    │
    ▼
1. Embed user message → 1536-dim vector
    │
    ▼
2. pgvector TOP-K search (K=10) on meeting_embeddings
    Filtered by user_id, ordered by cosine similarity
    │
    ▼
3. Context assembly:
    - Retrieved chunks sorted by meeting date
    - Truncate if total tokens > 80% of model context window
    - Format: "[Meeting: {title}, {date}]\n{chunk_text}\n"
    │
    ▼
4. LLM call:
    system: RAG system prompt with citation instructions
    messages: [...conversation_history, user_message]
    context: assembled chunks injected into system prompt
    stream: True
    │
    ▼
5. Server-Sent Events (SSE) stream to client
    event: "delta" { text: "..." }
    event: "done"  { citations: [...] }
    │
    ▼
Frontend: incremental markdown rendering
```

---

## 6. Event Flow

### 6.1 Real-Time Events via WebSocket + Redis PubSub

The WebSocket system uses Redis PubSub as a broker, allowing multiple FastAPI worker processes to share connection state without sticky sessions.

```
Celery Worker                 Redis PubSub              FastAPI WS Handler
     │                             │                           │
     │  PUBLISH                    │                           │
     │  meeting:{id}:segments      │                           │
     │  { segments: [...] }   ────►│                           │
     │                             │   SUBSCRIBE               │
     │                             │   meeting:{id}:*     ◄────│
     │                             │                           │
     │                             │   DELIVER         ────────►│
     │                             │                           │
     │                             │                    manager.broadcast(
     │                             │                      meeting_id,
     │                             │                      event_type,
     │                             │                      payload)
     │                             │                           │
     │                             │                    for conn in
     │                             │                      connections[meeting_id]:
     │                             │                        await conn.send_json()
```

### 6.2 Event Types

All WebSocket events follow this envelope schema:

```json
{
  "event": "segments.new",
  "meeting_id": "uuid",
  "payload": { ... }
}
```

| Event | Published By | Consumed By | Payload |
|---|---|---|---|
| `segments.new` | transcription_worker | Meeting detail page | `{ segments: SegmentPublic[] }` |
| `segments.updated` | diarization_worker | Meeting detail page | `{ segment_ids: UUID[], speaker_label: str }` |
| `intelligence.complete` | intelligence_worker | Meeting detail page | `{ summary: str, action_items: ActionItemPublic[] }` |
| `meeting.status` | Any worker | Meeting list + detail | `{ status: str }` |
| `live.summary` | intelligence_worker (periodic) | Meeting detail sidebar | `{ summary: str, updated_at: datetime }` |

### 6.3 Celery Task Chain

```
audio_chunk_received
    └── transcription_worker.delay(chunk_id)
            └── (on complete) diarization_worker.delay(chunk_id)

meeting_end_received
    └── intelligence_worker.delay(meeting_id)
            └── (on complete) group(
                    embedding_worker.delay(meeting_id),
                    notification_worker.delay(meeting_id)
                )
```

---

## 7. AI Pipeline

### 7.1 LLM Abstraction Layer

All LLM calls go through a single function in `server/app/ai/llm.py`. This function wraps `litellm` and enforces consistent behavior across providers.

```python
# server/app/ai/llm.py

async def complete(
    *,
    model: str,                          # e.g. "anthropic/claude-sonnet-4-6"
    messages: list[dict],                # [{"role": "user", "content": "..."}]
    response_format: type[BaseModel] | None = None,  # Pydantic → structured output
    temperature: float = 0.3,
    max_tokens: int = 4096,
    stream: bool = False,
) -> str | BaseModel | AsyncIterator[str]:
    """
    Unified LLM completion via litellm.

    - If response_format is set, returns a parsed Pydantic model instance.
    - If stream=True, returns an AsyncIterator[str] of text deltas.
    - Otherwise, returns the full response as a str.
    """
```

**Why 0.3 temperature?** Extraction tasks (summaries, action items, decisions) require consistent, factual output. Lower temperature reduces hallucination at the cost of some creativity — appropriate for this use case.

### 7.2 Prompt Architecture

Each prompt is a self-contained Python module with a version, system prompt constant, output model, and builder function.

```python
# server/app/ai/prompts/summary.py

VERSION: str = "1.0.0"

SYSTEM_PROMPT: str = """
You are an expert meeting analyst. Extract a structured summary
from the provided meeting transcript...
"""

class SummaryOutput(BaseModel):
    executive_summary: str        # 2-3 sentence overview
    key_points: list[str]         # 3-7 bullet points
    topics: list[str]             # Thematic topics discussed
    sentiment: Literal["positive", "neutral", "negative", "mixed"]

def build_user_prompt(transcript: str, speakers: list[str]) -> str:
    """Build the user turn from meeting data."""
    speaker_list = ", ".join(speakers) if speakers else "Unknown"
    return f"Speakers: {speaker_list}\n\nTranscript:\n{transcript}"
```

**Versioning rationale**: The `VERSION` string on each prompt allows the system to track which prompt version produced which meeting output. When a prompt changes and output quality changes, the version makes it possible to identify affected meetings and re-process them if needed.

### 7.3 Intelligence Pipeline

```
intelligence_worker(meeting_id)
    │
    ▼
load full transcript from transcript_repo.get_full_transcript(meeting_id)
    │
    ▼
asyncio.gather(  ← PARALLEL execution
    summary_task(transcript),       # prompts/summary.py
    action_items_task(transcript),  # prompts/action_items.py
    decisions_task(transcript),     # prompts/decisions.py
)
    │
    ▼ (all three complete)
context_task(summary, action_items, decisions)  ← SEQUENTIAL
    # prompts/context.py
    # Merges, deduplicates, resolves conflicts
    │
    ▼
Write results to database:
    - meetings.summary = SummaryOutput.executive_summary
    - meetings.topics = SummaryOutput.topics (JSONB)
    - INSERT action_items[] (bulk)
    - INSERT decisions[] (bulk)
    - UPDATE meetings.status = "completed"
    │
    ▼
Publish intelligence.complete event via Redis PubSub
```

**Parallelism rationale**: The three extraction tasks are independent reads of the same transcript. Running them in parallel reduces total wall-clock time from ~30s (sequential) to ~10s (parallel). The context task must be sequential because it takes the outputs of all three as inputs.

### 7.4 Embedding Strategy

| Parameter | Value | Rationale |
|---|---|---|
| Model | `text-embedding-3-small` | 1536 dims, best quality/cost ratio, OpenAI standard |
| Chunk size | 500 tokens | Balances retrieval granularity vs. context sufficiency |
| Chunk overlap | 50 tokens | Prevents semantic boundary breaks between chunks |
| Chunking method | `nltk.sent_tokenize` (sentence-aware) | Avoids cutting sentences mid-word |
| Index type | HNSW (`pgvector 0.5+`) | Better recall than IVFFlat for < 10M vectors |
| Distance metric | Cosine similarity | Standard for normalized text embeddings |
| Cache | Redis, `sha256(text)` key, 7-day TTL | Avoids re-embedding identical segments across meetings |

```python
# server/app/ai/embeddings.py

async def embed_text(text: str) -> list[float]:
    """
    Generate a 1536-dim embedding for text.
    Checks Redis cache before calling OpenAI API.
    """
    cache_key = f"embed:{sha256(text.encode()).hexdigest()}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    response = await openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    vector = response.data[0].embedding
    await redis.set(cache_key, json.dumps(vector), ex=7 * 24 * 3600)
    return vector
```

---

## 8. Audio Pipeline

### 8.1 Capture (Chrome Extension)

```
chrome.tabCapture.capture({ audio: true, video: false })
    └── Returns MediaStream
        └── MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" })
            └── start(10_000)  # 10-second chunks
                └── ondataavailable(event)
                    └── if event.data.size > 0:
                            uploadChunk(event.data, meetingId, chunkSequence++)
```

The extension uses the Opus codec in a WebM container. Opus at 48kHz provides excellent speech quality at low bit rates (~64kbps), keeping chunk sizes small (~80KB per 10-second chunk).

### 8.2 Transport

Each chunk is sent as a `multipart/form-data` POST:

```
POST /api/v1/meetings/{meeting_id}/audio
Headers:
  X-API-Key: {user_api_key}
  Content-Type: multipart/form-data
Body:
  file: <binary WebM>
  sequence: <int>  (chunk order for reconstruction)
```

The server returns `{ chunk_id: uuid, duration_sec: float }` to allow the extension to track upload progress.

### 8.3 Server-Side Processing

```
MinIO Storage
  audio/{meeting_id}/{chunk_id}.webm
  (retention: 90 days, configurable via AUDIO_RETENTION_DAYS)

faster-whisper
  Model: large-v3 (or configurable via WHISPER_MODEL)
  Backend: CTranslate2 (4x faster than vanilla Whisper)
  Compute type: float16 (GPU) or int8 (CPU fallback)
  Output: segments with word-level timestamps + confidence scores
```

### 8.4 Audio File Lifecycle

```
Chunk uploaded → Stored in MinIO (90 days)
    → Transcribed (segments in PostgreSQL, permanent)
    → Diarized (segments updated, permanent)
    → (Optional) Full recording available for replay
    → After 90 days: audio deleted from MinIO, transcript/summary remain
```

---

## 9. Memory Pipeline

The memory pipeline transforms raw audio into searchable, queryable organizational memory.

### 9.1 Three-Layer Memory Model

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: RAW STORAGE                                           │
│                                                                 │
│  Audio files (MinIO, 90-day retention)                         │
│  Transcript segments (PostgreSQL, permanent)                   │
│  Speaker records (PostgreSQL, permanent)                       │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼ Intelligence Pipeline
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2: STRUCTURED INTELLIGENCE                               │
│                                                                 │
│  Summaries (PostgreSQL, meetings.summary text column)          │
│  Action Items (PostgreSQL, first-class action_items table)     │
│  Decisions (PostgreSQL, first-class decisions table)           │
│  Topics (PostgreSQL, meetings.topics JSONB column)             │
│  Speakers (PostgreSQL, speakers table with stats)              │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼ Embedding Pipeline
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: SEMANTIC MEMORY                                       │
│                                                                 │
│  Embedding vectors (PostgreSQL + pgvector HNSW index)          │
│  Full-text search index (PostgreSQL tsvector + GIN index)      │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Context Assembly for RAG

When assembling context for a RAG chat query:

```python
# Pseudocode for context assembly

chunks = await search_repo.semantic_search(
    vector=query_embedding,
    user_id=user_id,
    limit=10
)

# Sort by meeting date for chronological coherence
chunks.sort(key=lambda c: c.meeting_date)

# Build context string
context_parts = []
current_tokens = 0
MAX_CONTEXT_TOKENS = 0.8 * MODEL_CONTEXT_WINDOW

for chunk in chunks:
    chunk_tokens = count_tokens(chunk.text)
    if current_tokens + chunk_tokens > MAX_CONTEXT_TOKENS:
        break  # Truncate oldest chunks first (already sorted chronologically)
    context_parts.append(
        f"[Meeting: {chunk.meeting_title}, {chunk.meeting_date}]\n{chunk.text}"
    )
    current_tokens += chunk_tokens

context = "\n\n---\n\n".join(context_parts)
```

---

## 10. Export Pipeline

### 10.1 Export Formats

| Format | Generation Method | Library | Use Case |
|---|---|---|---|
| Markdown | Server-side Jinja2 template | `jinja2` | Obsidian, Notion import, dev-friendly |
| JSON | Direct Pydantic model serialization | `pydantic` | API consumers, programmatic import |
| PDF | HTML → PDF via WeasyPrint | `weasyprint` | Sharing with non-technical stakeholders |
| Email | HTML Jinja2 template | `jinja2` + SendGrid/Resend | Post-meeting reports to participants |

### 10.2 Export Flow

```
POST /api/v1/meetings/{id}/export?format=pdf
    │
    ▼
export_service.export(meeting_id, format, user_id)
    │
    ├── For small meetings (< 50 segments): generate synchronously
    │       └── Return file download immediately
    │
    └── For large meetings (≥ 50 segments): generate asynchronously
            └── Enqueue export_worker.delay(meeting_id, format)
                    └── Store output in MinIO: exports/{meeting_id}/{format}.{ext}
                    └── Return presigned URL with 1-hour expiry
```

### 10.3 Markdown Template Structure

```markdown
# {meeting_title}

**Date**: {meeting_date}
**Duration**: {duration}
**Participants**: {speaker_list}

---

## Executive Summary

{summary}

---

## Action Items

- [ ] {action_item.text} — @{assignee} — Due: {deadline}
...

---

## Decisions

- {decision.text}
...

---

## Full Transcript

**{speaker_label}** ({start_time}): {text}
...
```

---

## 11. Storage Architecture

### 11.1 PostgreSQL Schema

All tables follow these conventions:
- UUID primary keys (v4)
- `created_at TIMESTAMPTZ DEFAULT NOW()`
- `updated_at TIMESTAMPTZ DEFAULT NOW()` (updated via trigger)
- `ON DELETE CASCADE` for child tables
- `ON DELETE SET NULL` for optional foreign keys

**Core tables:**

```sql
-- Users
create table users (
    id          uuid primary key default gen_random_uuid(),
    email       text unique not null,
    name        text not null,
    password_hash text not null,
    created_at  timestamptz default now(),
    updated_at  timestamptz default now()
);

-- API Keys (for extension authentication)
create table api_keys (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references users(id) on delete cascade,
    key_hash    text not null,          -- SHA-256 of raw key
    key_prefix  text not null,          -- First 8 chars (unscrambled, for lookup)
    created_at  timestamptz default now(),
    last_used_at timestamptz
);

-- Meetings
create table meetings (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references users(id) on delete cascade,
    title       text not null,
    platform    text not null,          -- google_meet, zoom, teams, manual
    status      text not null default 'scheduled',
    started_at  timestamptz,
    ended_at    timestamptz,
    duration_sec int,
    summary     text,
    topics      jsonb,                  -- string[] of topic labels
    created_at  timestamptz default now(),
    updated_at  timestamptz default now()
);
create index on meetings(user_id, created_at desc);
create index on meetings(user_id, status);

-- Transcript Segments
create table segments (
    id          uuid primary key default gen_random_uuid(),
    meeting_id  uuid not null references meetings(id) on delete cascade,
    speaker_id  uuid references speakers(id) on delete set null,
    text        text not null,
    start_time  float not null,
    end_time    float not null,
    confidence  float,
    created_at  timestamptz default now()
);
create index on segments(meeting_id, start_time asc);

-- Speakers
create table speakers (
    id              uuid primary key default gen_random_uuid(),
    meeting_id      uuid not null references meetings(id) on delete cascade,
    user_id         uuid references users(id) on delete set null,
    label           text not null,      -- "Speaker 1", "Speaker 2"
    speaking_time_sec int default 0,
    word_count      int default 0,
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);

-- Action Items
create table action_items (
    id              uuid primary key default gen_random_uuid(),
    meeting_id      uuid not null references meetings(id) on delete cascade,
    user_id         uuid not null references users(id) on delete cascade,
    text            text not null,
    assignee_name   text,
    status          text not null default 'open',
    deadline        text,
    created_at      timestamptz default now(),
    completed_at    timestamptz
);
create index on action_items(user_id, status);

-- Decisions
create table decisions (
    id          uuid primary key default gen_random_uuid(),
    meeting_id  uuid not null references meetings(id) on delete cascade,
    user_id     uuid not null references users(id) on delete cascade,
    text        text not null,
    created_at  timestamptz default now()
);

-- Meeting Embeddings (pgvector)
create table meeting_embeddings (
    id          uuid primary key default gen_random_uuid(),
    meeting_id  uuid not null references meetings(id) on delete cascade,
    user_id     uuid not null references users(id) on delete cascade,
    chunk_text  text not null,
    chunk_index int not null,
    embedding   vector(1536),
    created_at  timestamptz default now()
);
create index on meeting_embeddings
    using hnsw (embedding vector_cosine_ops)
    with (m = 16, ef_construction = 64);
create index on meeting_embeddings(user_id);
```

### 11.2 Redis Usage

| Key Pattern | Type | TTL | Purpose |
|---|---|---|---|
| `session:{token_jti}` | String | 24h | JWT blocklist (revoked tokens) |
| `embed:{sha256}` | String | 7 days | Embedding cache |
| `ratelimit:{user_id}:{minute}` | String | 60s | Rate limit counter |
| `meeting:{id}:buffer` | List | 2h | Live meeting transcript buffer |
| `celery-*` | Various | 24h | Celery task state (managed by Celery) |
| PubSub channel: `meeting:{id}:{event_type}` | — | — | Real-time events to WebSocket clients |

### 11.3 MinIO (Object Storage)

| Bucket | Key Pattern | Retention | Notes |
|---|---|---|---|
| `watchnt-audio` | `audio/{meeting_id}/{chunk_id}.webm` | 90 days (configurable) | Raw audio chunks |
| `watchnt-exports` | `exports/{meeting_id}/{format}.{ext}` | 7 days | Generated export files |

### 11.4 State Persistence Summary

| Data | Storage | Retention | Rationale |
|---|---|---|---|
| Meeting records | PostgreSQL | Permanent | Core product data |
| Transcript segments | PostgreSQL | Permanent | Source of truth for all intelligence |
| Summaries / actions / decisions | PostgreSQL | Permanent | User-facing intelligence output |
| Embeddings | PostgreSQL (pgvector) | Permanent | Required for search and chat |
| Audio files | MinIO | 90 days | Raw audio; transcript is the permanent record |
| Export files | MinIO | 7 days | Temporary; can be regenerated on demand |
| User sessions | Redis | 24 hours | Short-lived authentication state |
| Embedding cache | Redis | 7 days | Performance optimization only |
| Live meeting buffer | Redis | 2 hours | Evicted after meeting ends |

---

## 12. Extension Architecture

### 12.1 Chrome Extension Components

The extension uses Manifest V3. Its sole responsibility is audio capture and upload.

```
Extension Process Model (MV3)
┌────────────────────────────────────────────────────────────────┐
│  Service Worker (background/service-worker.ts)                 │
│  • Persistent background process                               │
│  • Manages chrome.tabCapture lifecycle                         │
│  • Maintains upload queue                                      │
│  • Handles auth token storage + refresh                        │
│  • Responds to messages from popup                             │
└────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│  Popup (popup/popup.tsx)                                       │
│  • Rendered when user clicks extension icon                    │
│  • Shows capture status (recording / idle)                     │
│  • Start / Stop capture buttons                                │
│  • Link to web app settings                                    │
│  • Communicates with service worker via chrome.runtime.sendMessage │
└────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│  Content Script (content/meeting-detector.ts)                  │
│  • Injected into Google Meet, Zoom web, etc.                   │
│  • Detects meeting start / end based on DOM signals            │
│  • Sends meeting events to service worker                      │
└────────────────────────────────────────────────────────────────┘
```

### 12.2 Audio Capture Flow

```typescript
// Simplified service worker capture flow

async function startCapture(meetingId: string) {
    const stream = await chrome.tabCapture.capture({ audio: true, video: false });
    const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus"
    });
    let sequence = 0;

    recorder.ondataavailable = async (event) => {
        if (event.data.size === 0) return;
        await uploadChunk(event.data, meetingId, sequence++);
    };

    recorder.start(10_000); // 10-second chunks
    captureState = { status: "recording", meetingId, recorder, stream };
}

async function uploadChunk(blob: Blob, meetingId: string, sequence: number) {
    const formData = new FormData();
    formData.append("file", blob, `chunk-${sequence}.webm`);
    formData.append("sequence", String(sequence));

    await fetch(`${SERVER_URL}/api/v1/meetings/${meetingId}/audio`, {
        method: "POST",
        headers: { "X-API-Key": await getApiKey() },
        body: formData,
    });
}
```

### 12.3 Authentication

The extension uses a personal API key (generated in web app settings) stored in `chrome.storage.local`. This is separate from JWT because:

- Extensions cannot use `httpOnly` cookies (cross-origin)
- Long-lived session tokens are appropriate for machine-to-server auth
- Keys can be revoked from the web app without requiring the user to log in again

```
chrome.storage.local keys:
  "serverUrl"  → string (default: http://localhost:8000)
  "apiKey"     → string (user's personal API key)
  "userId"     → string (UUID, for UI display only)
```

---

## 13. Provider Architecture

### 13.1 LLM Provider Abstraction via litellm

All LLM calls go through `litellm.completion()`. Provider selection is controlled by the `model` string prefix:

| Prefix | Provider | Example Model String |
|---|---|---|
| `anthropic/` | Anthropic | `anthropic/claude-sonnet-4-6` |
| `openai/` | OpenAI | `openai/gpt-4.1-mini` |
| `gemini/` | Google | `gemini/gemini-2.5-flash` |
| `openrouter/` | OpenRouter | `openrouter/meta-llama/llama-3-8b-instruct` |
| `ollama/` | Ollama (local) | `ollama/llama3.1` |

No code changes are required to switch providers — only the `model` string in the config.

### 13.2 Configuration

```python
# server/app/core/config.py

class Settings(BaseSettings):
    # LLM
    llm_model: str = "anthropic/claude-haiku-4-5"  # Default model
    llm_api_key: str | None = None  # If None, uses ANTHROPIC_API_KEY / OPENAI_API_KEY env

    # Embeddings
    embedding_model: str = "text-embedding-3-small"
    openai_api_key: str | None = None  # Required if using OpenAI embeddings

    # Whisper
    whisper_model: str = "large-v3"  # or "medium", "small" for faster/less accurate
    whisper_compute_type: str = "float16"  # or "int8" for CPU
```

### 13.3 Streaming

Streaming is only used for the RAG chat endpoint. All other AI calls (summary, action items, decisions) use non-streaming completions.

```python
# Streaming response via SSE

async def chat_stream(message: str, context: str) -> AsyncGenerator[str, None]:
    response = await complete(
        model=settings.llm_model,
        messages=[{"role": "user", "content": message}],
        stream=True,
    )
    async for chunk in response:
        yield f"data: {json.dumps({'text': chunk})}\n\n"
    yield "data: [DONE]\n\n"
```

---

## 14. Knowledge Graph

### 14.1 V2 Knowledge Graph (Relational)

V2 implements a simplified knowledge graph using PostgreSQL relational tables. Full graph database (Neo4j) is deferred to V3.

```
meetings ←───────────────── meeting_tags ───────────────────► tags
    │                                                              │
    │ (1:many)                                              tag.name (e.g. "Q3 2026")
    │
    ├──── speakers (many, linked to meetings)
    │         └── optionally linked to users (1:1)
    │
    ├──── action_items (many, first-class)
    │         └── optionally linked to users (assignee)
    │
    └──── decisions (many, first-class)
```

### 14.2 Cross-Meeting Queries

The relational model enables these cross-meeting queries in V2:

```sql
-- All open action items across all meetings for a user
SELECT ai.*, m.title as meeting_title, m.started_at
FROM action_items ai
JOIN meetings m ON m.id = ai.meeting_id
WHERE ai.user_id = $1 AND ai.status = 'open'
ORDER BY ai.created_at DESC;

-- Find related meetings by shared tags
SELECT m.*
FROM meetings m
JOIN meeting_tags mt ON mt.meeting_id = m.id
JOIN tags t ON t.id = mt.tag_id
WHERE t.name = $1 AND m.user_id = $2;

-- Speaker participation across meetings
SELECT s.label, COUNT(DISTINCT s.meeting_id) as meeting_count,
       SUM(s.speaking_time_sec) as total_speaking_time
FROM speakers s
JOIN meetings m ON m.id = s.meeting_id
WHERE m.user_id = $1
GROUP BY s.label
ORDER BY total_speaking_time DESC;
```

### 14.3 V3 Knowledge Graph (Planned)

In V3, the knowledge graph will migrate to Neo4j with entity extraction:

```
(Person)-[:SPOKE_IN]->(Meeting)
(Person)-[:ASSIGNED_TO]->(ActionItem)
(Meeting)-[:DECIDED]->(Decision)
(Decision)-[:REFERENCES]->(Meeting)
(Topic)-[:DISCUSSED_IN]->(Meeting)
```

This will enable queries like: "What decisions was Sarah involved in across all Q3 meetings that referenced the API redesign?"

---

## 15. RAG Pipeline

### 15.1 Indexing (at embedding time)

```
Full transcript text
    │
    ▼
Sentence-boundary chunking via nltk.sent_tokenize()
    │
    ▼ (500-token windows, 50-token overlap)
Chunks: [chunk_0, chunk_1, chunk_2, ...]
    │
    ▼ (per chunk)
SHA-256 cache check → Redis (7-day TTL)
    cache miss → OpenAI text-embedding-3-small
    │
    ▼
INSERT INTO meeting_embeddings
    (meeting_id, user_id, chunk_text, chunk_index, embedding)
```

### 15.2 Retrieval (at query time)

```
User query: "What did we decide about the database migration?"
    │
    ▼
embed(query) → 1536-dim vector
    │
    ▼
pgvector HNSW ANN search:
    SELECT chunk_text, meeting_id, 1 - (embedding <=> $1) as similarity
    FROM meeting_embeddings
    WHERE user_id = $2
    ORDER BY embedding <=> $1
    LIMIT 10;
    │
    ▼
Re-rank results:
    score = (0.7 × similarity) + (0.3 × recency_score)
    recency_score = 1 / (1 + days_since_meeting)
    │
    ▼
Assemble context (max 80% of model context window)
    │
    ▼
LLM completion with context + conversation history
```

### 15.3 Context Window Management

If retrieved chunks exceed 80% of the model's context window, the oldest chunks (by meeting date) are truncated first. This preserves the most recent and most relevant context while staying within token limits.

```python
MAX_CONTEXT_RATIO = 0.8

def truncate_to_context_window(
    chunks: list[RetrievedChunk],
    model: str,
    system_prompt: str,
    conversation: list[dict],
) -> list[RetrievedChunk]:
    """
    Reduce chunk list to fit within model context window.
    Removes oldest chunks first (chunks are pre-sorted by date ascending).
    """
    model_limit = get_model_context_window(model)
    system_tokens = count_tokens(system_prompt)
    conversation_tokens = sum(count_tokens(m["content"]) for m in conversation)
    available = int(model_limit * MAX_CONTEXT_RATIO) - system_tokens - conversation_tokens

    result = []
    used = 0
    for chunk in reversed(chunks):  # Most recent first
        chunk_tokens = count_tokens(chunk.text)
        if used + chunk_tokens > available:
            break
        result.insert(0, chunk)
        used += chunk_tokens
    return result
```

---

## 16. Security Architecture

### 16.1 Authentication Flows

```
Web App Authentication:
    POST /auth/login
        → Validate credentials → bcrypt.verify()
        → Issue JWT access token (15-min, Bearer header)
        → Issue JWT refresh token (7-day, httpOnly cookie)
        → Client stores access token in memory (not localStorage)

Extension Authentication:
    POST /auth/api-keys (requires JWT)
        → Generate 32-byte random key via secrets.token_urlsafe(32)
        → Store SHA-256 hash in api_keys table
        → Return raw key once (never stored, never recoverable)
        → Extension stores in chrome.storage.local
        → Sent as X-API-Key header on every request
```

### 16.2 Authorization

All database queries include a `user_id` filter. There is no endpoint that returns data across users. This is enforced at the service layer, not only the API layer.

```python
# Correct — enforces user scope at repository level
async def get_meeting(meeting_id: UUID, user_id: UUID) -> Meeting | None:
    query = select(meetings).where(
        (meetings.c.id == meeting_id) &
        (meetings.c.user_id == user_id)  # ← Always required
    )
```

### 16.3 Input Validation

- All request bodies validated via Pydantic models before reaching service layer
- File uploads limited to 100MB (enforced in middleware)
- Audio content type validated: only `audio/webm` and `audio/ogg` accepted
- Rate limiting: 60 requests/minute per user (Redis counter, sliding window)
- SQL injection: impossible via SQLAlchemy Core parameterized queries
- XSS: React's default escaping + `Content-Security-Policy` response header

### 16.4 Secrets Management

```
Development:
    .env file (excluded from git via .gitignore)
    .env.example committed with placeholder values

Production:
    Environment variables injected by deployment platform
    Never written to disk, never logged, never returned in API responses

Key rotation:
    API keys: user-controlled via DELETE /auth/api-keys/{prefix}
    JWT secret: rotation requires re-login for all users (acceptable)
    Database password: infrastructure-level rotation
```

### 16.5 Data Isolation

- No cross-user data access is possible via any API endpoint
- All WebSocket subscriptions are scoped to `meeting_id` + `user_id` validation
- MinIO object keys include `meeting_id` (UUID), making enumeration impractical
- No shared caches that mix user data (Redis keys always include `user_id` or `meeting_id` scoped to a user)

---

## Related Documents

- [`SPEC.md`](./SPEC.md) — Master engineering specification (source of truth)
- [`PROJECT.md`](./PROJECT.md) — Vision, mission, personas, workflows
- [`DECISIONS.md`](./DECISIONS.md) — Architectural decision records with full rationale
- [`EXTENSION_ARCHITECTURE.md`](./EXTENSION_ARCHITECTURE.md) — Deep dive on Chrome extension
- [`AI_PROVIDER_SPEC.md`](./AI_PROVIDER_SPEC.md) — LLM provider abstraction specification
- [`MEMORY_ENGINE.md`](./MEMORY_ENGINE.md) — Memory system and embedding pipeline
- [`STORAGE.md`](./STORAGE.md) — Storage layer reference
- [`SECURITY.md`](./SECURITY.md) — Threat model and security controls
