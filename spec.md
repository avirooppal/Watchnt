# Watchn't V2 — Master Engineering Specification

> **Document Type**: Engineering RFC + Dependency Graph + Implementation Backlog

> **Purpose**: A complete specification that a coding AI can follow to build the entire application, one ticket at a time, without making architectural decisions.

> **Version**: 2.0.0

> **Status**: Draft — Pending CTO Approval

> **Date**: June 26, 2026

---

# PART A — Engineering RFC

---

## 1. Product Vision

### 1.1 Mission

Build an AI Meeting Copilot that functions as an AI employee attending every meeting. The system captures audio, transcribes conversations, identifies speakers, tracks decisions and commitments, generates summaries and action items, and builds organizational memory that can be queried months later.

### 1.2 Core User Flow

```

User schedules meeting

        ↓

System detects meeting via calendar

        ↓

Audio capture begins (extension or bot)

        ↓

Real-time transcription (Whisper)

        ↓

Speaker diarization (pyannote.audio)

        ↓

Live transcript displayed in sidebar

        ↓

Periodic live summaries (every 5 min)

        ↓

Meeting ends

        ↓

Full intelligence pipeline runs

        ↓

Summary + Action Items + Decisions generated

        ↓

Email report sent to participants

        ↓

Meeting indexed into memory engine

        ↓

Searchable via semantic search + RAG chat

```

### 1.3 Non-Goals for V2 MVP

- Mobile native app (responsive web is sufficient)

- Zoom/Teams bot integration (extension capture first)

- Multi-language real-time translation

- Custom LLM fine-tuning

- SOC2 / HIPAA compliance (defer to V3)

---

## 2. Engineering Philosophy

### 2.1 Principles

| # | Principle | Rationale |

|---|---|---|

| 1 | **Server-side intelligence** | All AI processing runs on the server. The browser is a thin client for capture and display. |

| 2 | **Python-first backend** | The AI/ML ecosystem is Python-first. Using Python for the backend eliminates the need for separate Python microservices. |

| 3 | **Explicit over implicit** | Every behavior should be traceable from the code. No magic. No hidden state. |

| 4 | **Fail loud, recover gracefully** | Errors should be logged and surfaced, never silently swallowed. Partial failures should not corrupt state. |

| 5 | **Schema-first API design** | All API contracts are defined via Pydantic models before implementation. |

| 6 | **Test at boundaries** | Test API endpoints, AI prompt outputs, and database queries. Do not test private implementation details. |

| 7 | **Feature flags over branches** | Ship code behind feature flags rather than maintaining long-lived branches. |

| 8 | **Composition over inheritance** | Use dependency injection and composition. Never use class inheritance for business logic. |

### 2.2 Coding Standards

**Python (Backend)**:

- Python 3.11+

- Type hints on all public functions

- Pydantic v2 for all data models

- `ruff` for linting, `ruff format` for formatting

- `pytest` for testing

- Async-first (`async def` for all IO-bound operations)

- No bare `except:` — always catch specific exceptions

- Docstrings on all public functions (Google style)

**TypeScript (Frontend + Extension)**:

- TypeScript strict mode (`strict: true`)

- React 18+ with functional components only

- `biome` for linting and formatting

- No `any` types — use `unknown` with type guards

- Named exports only (no default exports)

- File naming: `kebab-case.tsx` for components, `camelCase.ts` for utilities

- Component naming: `PascalCase`

**SQL**:

- Lowercase keywords

- Snake_case for table and column names

- All tables have `id`, `created_at`, `updated_at`

- UUID primary keys everywhere

- Foreign keys with explicit `ON DELETE` behavior

**Git**:

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`

- One ticket = one branch = one PR

- Branch naming: `{ticket-id}/{short-description}` (e.g., `AUTH-002/jwt-middleware`)

- Squash merge to main

---

## 3. Technology Choices

### 3.1 Backend

| Technology | Purpose | Alternatives Considered | Why This Choice | Maintenance Implications |

|---|---|---|---|---|

| **FastAPI** | HTTP API framework | Django REST, Flask, Hono (Node.js) | Native async, Pydantic integration, automatic OpenAPI docs, Python ecosystem for AI | Well-maintained, large community, good LLM support in docs |

| **PostgreSQL 16** | Primary database | MySQL, SQLite, MongoDB | ACID compliance, pgvector for embeddings, full-text search, JSONB for flexible data | Industry standard, 30+ years of stability |

| **pgvector** | Vector similarity search | Pinecone, Qdrant, Weaviate, Milvus | Runs inside Postgres (no separate service), good enough for <10M vectors, HNSW index | Simpler ops than dedicated vector DB. Migrate to Qdrant if >10M vectors. |

| **Redis 7** | Cache, queue broker, pub/sub | RabbitMQ, Kafka, Memcached | Multi-purpose (cache + queue + pub/sub + rate limiting), simple ops | Redis Stack for additional modules if needed |

| **Celery** | Background task queue | BullMQ, Dramatiq, Huey | Python-native, mature, Redis broker, good monitoring (Flower) | Complex but battle-tested. Alternative: Dramatiq for simpler API. |

| **Alembic** | Database migrations | Django migrations, raw SQL, Prisma | SQLAlchemy integration, Python ecosystem consistency | Requires careful migration ordering |

| **SQLAlchemy 2.0** | ORM / query builder | raw `asyncpg`, Tortoise ORM, Prisma | Type-safe queries, Alembic integration, async support | Use Core (query builder) not ORM (mapper) for performance-critical paths |

### 3.2 AI

| Technology | Purpose | Alternatives Considered | Why This Choice |

|---|---|---|---|

| **Whisper large-v3** | Speech-to-text | Deepgram, AssemblyAI, Google Speech | Self-hosted, no per-minute cost, best open-source accuracy |

| **faster-whisper** | Optimized Whisper inference | whisper.cpp, whisperX | CTranslate2 backend, 4x faster than vanilla Whisper, lower memory |

| **pyannote.audio 3.x** | Speaker diarization | NeMo, simple-diarizer | Best open-source diarization, fine-tunable, supports streaming |

| **OpenAI text-embedding-3-small** | Embeddings | Cohere embed-v3, Voyage AI, nomic-embed-text | 1536 dims, excellent quality/$, simple API |

| **Anthropic Claude / OpenAI GPT-4.1** | LLM intelligence | Gemini, Mistral, Llama | Best structured output, best instruction following |

| **litellm** | LLM provider abstraction | Manual provider switching, LangChain | Unified API for 100+ providers, simple drop-in |

**Decision: litellm over manual provider switching**

The current codebase has a 100-line if/else chain in `shared/llm.js` for provider routing. `litellm` provides a unified `completion()` API that supports all providers with a single function call. This eliminates provider-specific code entirely.

```python

# Instead of if/else chains:

import litellm

response = litellm.completion(

    model="anthropic/claude-3-haiku-20240307",  # or "gpt-4.1-mini", "ollama/llama3.1"

    messages=[{"role": "user", "content": "..."}],

    response_format={"type": "json_object"}

)

```

### 3.3 Frontend

| Technology | Purpose | Alternatives | Why This Choice |

|---|---|---|---|

| **Next.js 14 (App Router)** | Web framework | Remix, Vite + React, SvelteKit | SSR, API routes, file-based routing, Vercel ecosystem |

| **TailwindCSS 4** | Styling | Vanilla CSS, Styled Components, CSS Modules | Utility-first, design system via config, industry standard |

| **shadcn/ui** | Component library | Radix, MUI, Mantine, Ant Design | Accessible, copy-paste components (no dependency lock-in), Tailwind-native |

| **Zustand** | Client state | Redux, Jotai, Context API | Minimal boilerplate, TypeScript-first, no providers |

| **TanStack Query** | Server state | SWR, RTK Query | Cache invalidation, optimistic updates, offline support |

| **Framer Motion** | Animations | CSS transitions, React Spring | Declarative, gesture support, layout animations |

### 3.4 Infrastructure

| Technology | Purpose | Why |

|---|---|---|

| **Docker Compose** | Local development | Single `docker compose up` for entire stack |

| **GitHub Actions** | CI/CD | Industry standard, free for public repos |

| **MinIO** | Object storage (S3-compatible) | Self-hosted, API-compatible with AWS S3 |

---

## 4. Monorepo Structure

```

watchnt/

├── apps/

│   ├── web/                          # Next.js web application

│   │   ├── app/                      # App Router pages

│   │   ├── components/               # React components

│   │   ├── hooks/                    # Custom React hooks

│   │   ├── lib/                      # Client utilities

│   │   ├── styles/                   # Global styles, Tailwind config

│   │   ├── public/                   # Static assets

│   │   ├── next.config.ts

│   │   ├── tailwind.config.ts

│   │   ├── tsconfig.json

│   │   └── package.json

│   │

│   └── extension/                    # Chrome extension (companion)

│       ├── src/

│       │   ├── background/           # Service worker

│       │   ├── content/              # Content scripts

│       │   ├── popup/                # Popup UI

│       │   └── shared/               # Shared types/utils

│       ├── manifest.json

│       ├── tsconfig.json

│       └── package.json

│

├── server/                           # FastAPI backend

│   ├── app/

│   │   ├── api/                      # Route handlers

│   │   │   └── v1/

│   │   │       ├── __init__.py

│   │   │       ├── meetings.py

│   │   │       ├── transcripts.py

│   │   │       ├── search.py

│   │   │       ├── action_items.py

│   │   │       ├── auth.py

│   │   │       ├── users.py

│   │   │       ├── export.py

│   │   │       └── webhooks.py

│   │   ├── core/                     # Framework concerns

│   │   │   ├── __init__.py

│   │   │   ├── config.py             # Settings via pydantic-settings

│   │   │   ├── security.py           # JWT, password hashing

│   │   │   ├── deps.py               # Dependency injection

│   │   │   └── exceptions.py         # Custom exception classes

│   │   ├── models/                   # Pydantic schemas

│   │   │   ├── __init__.py

│   │   │   ├── meeting.py

│   │   │   ├── transcript.py

│   │   │   ├── speaker.py

│   │   │   ├── action_item.py

│   │   │   ├── search.py

│   │   │   ├── user.py

│   │   │   └── common.py

│   │   ├── services/                 # Business logic

│   │   │   ├── __init__.py

│   │   │   ├── meeting_service.py

│   │   │   ├── transcript_service.py

│   │   │   ├── search_service.py

│   │   │   ├── export_service.py

│   │   │   └── notification_service.py

│   │   ├── db/                       # Database layer

│   │   │   ├── __init__.py

│   │   │   ├── session.py            # async engine + session factory

│   │   │   ├── tables.py             # SQLAlchemy table definitions

│   │   │   └── repositories/         # Data access objects

│   │   │       ├── __init__.py

│   │   │       ├── meeting_repo.py

│   │   │       ├── transcript_repo.py

│   │   │       ├── search_repo.py

│   │   │       └── user_repo.py

│   │   ├── ai/                       # AI pipeline

│   │   │   ├── __init__.py

│   │   │   ├── llm.py                # litellm wrapper

│   │   │   ├── embeddings.py         # Embedding generation

│   │   │   ├── prompts/              # Versioned prompt templates

│   │   │   │   ├── __init__.py

│   │   │   │   ├── summary.py

│   │   │   │   ├── action_items.py

│   │   │   │   ├── decisions.py

│   │   │   │   └── context.py

│   │   │   └── pipeline.py           # Orchestrates agent steps

│   │   ├── workers/                  # Celery tasks

│   │   │   ├── __init__.py

│   │   │   ├── celery_app.py         # Celery configuration

│   │   │   ├── transcription.py

│   │   │   ├── diarization.py

│   │   │   ├── intelligence.py

│   │   │   ├── embedding.py

│   │   │   └── notification.py

│   │   └── realtime/                 # WebSocket handlers

│   │       ├── __init__.py

│   │       ├── manager.py            # Connection manager

│   │       └── meeting_ws.py         # Meeting-specific WS

│   ├── migrations/                   # Alembic migrations

│   │   ├── env.py

│   │   ├── versions/

│   │   └── alembic.ini

│   ├── tests/

│   │   ├── unit/

│   │   ├── integration/

│   │   ├── conftest.py

│   │   └── fixtures/

│   ├── pyproject.toml

│   ├── Dockerfile

│   └── .env.example

│

├── docker-compose.yml                # Production-like

├── docker-compose.dev.yml            # Development overrides

├── .github/

│   └── workflows/

│       ├── ci.yml

│       └── deploy.yml

├── .gitignore

├── README.md

└── Makefile                          # Common commands

```

### 4.1 Package Responsibilities

| Package | Responsibility | Does NOT Do |

|---|---|---|

| `apps/web` | Rendering UI, client-side state, API calls, routing | Business logic, AI processing, direct DB access |

| `apps/extension` | Audio capture from browser tabs, sending audio to server | AI processing, data storage, LLM calls |

| `server/app/api` | HTTP request handling, input validation, response formatting | Business logic (delegates to services) |

| `server/app/services` | Business logic, orchestration, domain rules | Direct SQL, HTTP handling, AI prompts |

| `server/app/db` | SQL queries, connection management, migrations | Business logic, HTTP concerns |

| `server/app/ai` | LLM calls, prompt templates, embedding generation | Database access, HTTP handling |

| `server/app/workers` | Background task execution, queue processing | HTTP handling, direct client communication |

| `server/app/realtime` | WebSocket connection management, real-time event push | Business logic, database queries |

### 4.2 Module Boundaries — What Calls What

```

api/v1/*.py  →  services/*.py  →  db/repositories/*.py  →  PostgreSQL

                     ↓

                ai/pipeline.py  →  ai/llm.py  →  litellm  →  LLM Provider

                     ↓

                ai/embeddings.py  →  OpenAI Embedding API

                     ↓

              workers/*.py  →  services/*.py  (async background processing)

                     ↓

              realtime/*.py  →  Redis PubSub  →  WebSocket clients

```

**Forbidden dependencies** (enforced by import linting):

- `api` must NOT import from `db` directly (must go through `services`)

- `services` must NOT import from `api`

- `workers` must NOT import from `api`

- `ai` must NOT import from `db`

- `db` must NOT import from `services`, `api`, `ai`, or `workers`

---

## 5. Data Flow

### 5.1 Meeting Processing Flow

```

1. CAPTURE PHASE

   Browser Extension captures tab audio via chrome.tabCapture

        ↓

   Audio chunks (10s WebM blobs) sent via HTTP POST to /api/v1/meetings/{id}/audio

        ↓

   Server stores audio chunk in MinIO (S3-compatible object storage)

        ↓

   Server enqueues transcription task



2. TRANSCRIPTION PHASE (Celery Worker)

   Worker downloads audio chunk from MinIO

        ↓

   faster-whisper processes audio → timestamped text segments

        ↓

   Segments stored in `segments` table

        ↓

   WebSocket push: new segments → frontend live transcript

        ↓

   Enqueues diarization task



3. DIARIZATION PHASE (Celery Worker)

   Worker loads audio + segments

        ↓

   pyannote.audio assigns speaker labels to segments

        ↓

   Speaker records created/updated in `speakers` table

        ↓

   Segments updated with speaker_id

        ↓

   WebSocket push: speaker-attributed segments → frontend



4. INTELLIGENCE PHASE (Celery Worker — triggered on meeting end)

   Worker loads all segments for meeting

        ↓

   Assembles full transcript with speaker labels

        ↓

   LLM Pipeline: summary + action_items + decisions + topics

        ↓

   Results stored in meeting record and related tables

        ↓

   WebSocket push: summary + actions → frontend

        ↓

   Enqueues embedding task + notification task



5. EMBEDDING PHASE (Celery Worker)

   Worker chunks transcript into 500-token overlapping windows

        ↓

   OpenAI text-embedding-3-small generates embeddings

        ↓

   Embeddings stored in `meeting_embeddings` table (pgvector)



6. NOTIFICATION PHASE (Celery Worker)

   Worker loads meeting summary + action items

        ↓

   Generates email report (HTML template)

        ↓

   Sends via SendGrid/Resend to meeting participants

        ↓

   Posts to Slack channel (if configured)

```

### 5.2 Search Flow

```

User types query in search bar

        ↓

Frontend debounces (300ms) and sends POST /api/v1/search

        ↓

Server generates embedding for query text

        ↓

pgvector cosine similarity search on meeting_embeddings

        ↓

Results joined with meetings, speakers, segments

        ↓

Returned as ranked list with highlight snippets

```

### 5.3 RAG Chat Flow

```

User sends message in chat

        ↓

POST /api/v1/chat with { message, conversation_id }

        ↓

Server generates embedding for user message

        ↓

Top-K vector search (K=10) on meeting_embeddings

        ↓

Retrieved chunks assembled as context

        ↓

LLM call with system prompt + context + user message

        ↓

Streaming response via Server-Sent Events (SSE)

        ↓

Frontend renders markdown incrementally

```

---

## 6. State Management

### 6.1 Server State

| State | Storage | TTL |

|---|---|---|

| Meeting records | PostgreSQL | Permanent |

| Audio files | MinIO (S3) | 90 days (configurable) |

| Embeddings | PostgreSQL (pgvector) | Permanent |

| User sessions | Redis | 24 hours |

| Rate limit counters | Redis | 1 minute |

| Embedding cache | Redis | 7 days |

| WebSocket connections | In-memory (per-process) | Connection lifetime |

| Celery task state | Redis | 24 hours |

| Live meeting buffer | Redis | 2 hours |

### 6.2 Client State (Next.js)

| State | Tool | Why |

|---|---|---|

| Auth token | `httpOnly` cookie (set by server) | Security — not accessible to JS |

| Server data (meetings, search results) | TanStack Query | Automatic caching, refetching, invalidation |

| UI state (sidebar open, active tab) | Zustand | Simple, no providers |

| Form state | React Hook Form | Validation, controlled inputs |

| Real-time data (live transcript) | WebSocket + Zustand | Push updates merged into local state |

---

## 7. AI Architecture

### 7.1 LLM Abstraction

All LLM calls go through a single function:

```python

# server/app/ai/llm.py

async def complete(

    *,

    model: str,                         # e.g. "anthropic/claude-3-haiku-20240307"

    messages: list[dict],

    response_format: type[BaseModel] | None = None,  # Pydantic model for structured output

    temperature: float = 0.3,

    max_tokens: int = 4096,

    stream: bool = False,

) -> str | BaseModel | AsyncIterator[str]:

    """Unified LLM completion via litellm."""

```

### 7.2 Prompt Architecture

Each prompt is a Python module with:

```python

# server/app/ai/prompts/summary.py

SYSTEM_PROMPT: str = """..."""

VERSION: str = "1.0.0"



class SummaryOutput(BaseModel):

    executive_summary: str

    key_points: list[str]

    topics: list[str]



def build_user_prompt(transcript: str, speakers: list[str]) -> str:

    """Build the user message from meeting data."""

    ...

```

**Why versioned prompts?** Each prompt has a `VERSION` string. When prompts change, the version increments. This allows A/B testing and debugging which prompt version produced which output.

### 7.3 Meeting Intelligence Pipeline

The pipeline runs as a Celery task after meeting end. It executes **three parallel LLM calls** followed by one sequential call:

```

Parallel:

  ├── summary_task(transcript)       → SummaryOutput

  ├── action_items_task(transcript)  → ActionItemsOutput

  └── decisions_task(transcript)     → DecisionsOutput



Sequential (after all parallel complete):

  └── context_task(summary, actions, decisions) → MeetingContext

```

**Why parallel?** Summary, action items, and decisions are independent extractions from the same transcript. Running them in parallel reduces total latency from ~30s to ~10s.

**Why one sequential step?** The context task synthesizes the parallel outputs into a coherent meeting record, resolving conflicts and deduplication.

### 7.4 Embedding Strategy

| Decision | Choice | Why |

|---|---|---|

| Model | `text-embedding-3-small` | Best quality/cost ratio, 1536 dims |

| Chunk size | 500 tokens with 50-token overlap | Balances context vs. granularity |

| Chunking method | Sentence-boundary aware (via `nltk.sent_tokenize`) | Avoids cutting sentences mid-word |

| Index type | HNSW (pgvector 0.5+) | Better recall than IVFFlat for <10M vectors |

| Distance metric | Cosine similarity | Standard for text embeddings |

| Cache | Redis with `sha256(text)` as key, 7-day TTL | Avoid re-embedding identical text |

---

## 8. Security Model

### 8.1 Authentication

| Mechanism | Usage |

|---|---|

| **JWT access token** | Short-lived (15 min), sent in `Authorization: Bearer` header |

| **JWT refresh token** | Long-lived (7 days), stored in `httpOnly` cookie |

| **Password hashing** | `bcrypt` with cost factor 12 |

| **OAuth 2.0** (future) | Google OAuth for "Sign in with Google" |

### 8.2 Authorization

- **User-scoped data**: All queries filter by `user_id` or `org_id`

- **No admin panel in V2** — defer to V3

- **API key for extension**: Each user has a personal API key for the Chrome extension to authenticate

### 8.3 Input Validation

- All request bodies validated via Pydantic models

- File uploads limited to 100MB

- Rate limiting: 60 requests/minute per user (configurable)

- SQL injection prevented by parameterized queries (SQLAlchemy)

- XSS prevented by React's default escaping + `Content-Security-Policy` headers

### 8.4 Secrets Management

- All secrets in `.env` files (never committed — `.gitignore` enforced)

- `.env.example` with placeholder values committed

- Production: environment variables injected by deployment platform

---

## 9. Memory Engine & Knowledge Graph

### 9.1 Memory Architecture

The memory engine stores meeting knowledge in three layers:

```

Layer 1: Raw Storage

  - Audio files (MinIO/S3)

  - Transcript segments (PostgreSQL)

  - Speaker records (PostgreSQL)



Layer 2: Structured Intelligence

  - Summaries (PostgreSQL)

  - Action items (PostgreSQL — first-class entities)

  - Decisions (PostgreSQL — first-class entities)

  - Topics (PostgreSQL JSONB)



Layer 3: Semantic Memory

  - Embedding vectors (pgvector)

  - Full-text search index (PostgreSQL tsvector)

```

### 9.2 Knowledge Graph (V2 — Simplified)

The V2 knowledge graph is a **tag-based relationship graph** stored in PostgreSQL:

```

meetings ←→ meeting_tags ←→ tags

meetings ←→ speakers ←→ users

meetings ←→ action_items ←→ users

```

Full graph database (Neo4j) is deferred to V3.

### 9.3 RAG Pipeline

```

Query → Embed → Vector Search (top 10) → Re-rank (by recency + similarity)

  → Format Context → LLM Call → Stream Response

```

**Context window management**: If retrieved chunks exceed 80% of the model's context window, truncate oldest chunks first.

---

## 10. Extension Architecture

### 10.1 Responsibilities (V2)

The Chrome extension in V2 is a **thin audio capture companion**. It does NOT:

- Run AI pipelines

- Store API keys for LLM providers

- Make direct LLM calls

- Manage state beyond active capture session

It DOES:

- Capture tab audio via `chrome.tabCapture.capture()`

- Stream audio chunks to the server via HTTP POST

- Show capture status in the popup

- Authenticate with the server via user's API key

### 10.2 Authentication

The extension authenticates using a personal API key (generated in the web app settings). The key is stored in `chrome.storage.local` and sent in `X-API-Key` header on every request.

**Why API key instead of JWT?** Extensions cannot use cookies (different origin). API keys are simpler for machine-to-server auth. The key is scoped to a single user and can be revoked from the web app.

---

## 11. Export Architecture

| Format | Implementation | Use Case |

|---|---|---|

| **Markdown** | Server-side template rendering | Obsidian, Notion import |

| **JSON** | Direct serialization of meeting model | API consumers, integrations |

| **PDF** | HTML → PDF via `weasyprint` | Sharing with non-technical users |

| **Email** | HTML template via Jinja2 + SendGrid/Resend | Post-meeting reports |

Exports are generated as background tasks (Celery) for large meetings.

---

## 12. Testing Philosophy

### 12.1 Test Pyramid

```

           ┌─────────┐

           │   E2E   │  5% — Playwright, critical flows only

           ├─────────┤

           │  Integ  │  25% — API endpoints, DB queries, worker tasks

           ├─────────┤

           │  Unit   │  70% — Services, AI prompts, utilities

           └─────────┘

```

### 12.2 Test Conventions

- Test files: `test_<module>.py` in `tests/unit/` or `tests/integration/`

- Fixtures: `conftest.py` at each test directory level

- Database tests: Use `testcontainers` for real Postgres

- AI tests: Mock LLM responses, test prompt assembly and output parsing

- Coverage target: 80% on `services/`, `ai/`, `db/repositories/`

- CI gate: Tests must pass before merge

---

## 13. Deployment Philosophy

### 13.1 Development

```bash

make dev   # docker compose -f docker-compose.dev.yml up

```

Starts: PostgreSQL, Redis, MinIO, FastAPI (hot reload), Next.js (hot reload), Celery worker

### 13.2 Production

```bash

docker compose up -d

```

Services: FastAPI (Uvicorn, 4 workers), Celery (4 workers), PostgreSQL, Redis, MinIO, Nginx (reverse proxy)

### 13.3 CI/CD Pipeline

```

Push to branch → GitHub Actions:

  1. Lint (ruff + biome)

  2. Type check (mypy + tsc)

  3. Unit tests

  4. Integration tests (with testcontainers)

  5. Build Docker images

  6. (on merge to main) Deploy to staging

```

---

## 14. Performance Goals

| Metric | Target | Measurement |

|---|---|---|

| API response time (p95) | < 200ms | FastAPI middleware timing |

| Search latency (p95) | < 500ms | End-to-end including embedding |

| Transcription latency | < 5s per 10s chunk | Worker processing time |

| LLM pipeline (full meeting) | < 30s | Total intelligence phase |

| Web app initial load | < 2s (LCP) | Lighthouse |

| WebSocket message delay | < 100ms | Client-side measurement |

---

## 15. Accessibility Goals

- WCAG 2.1 AA compliance

- All interactive elements keyboard-navigable

- All images have alt text

- Color contrast ratio ≥ 4.5:1

- Screen reader support via ARIA labels

- Focus management on route changes

- Reduced motion support via `prefers-reduced-motion`

---

## 16. Future Extension Points

| Extension Point | Mechanism | Notes |

|---|---|---|

| New LLM providers | Add model string to litellm | Zero code changes needed |

| New meeting platforms | New Celery worker + API endpoint | Platform-specific capture logic |

| New export formats | New template in `export_service.py` | Template pattern |

| New integrations (Slack, Jira) | New notification worker | Worker pattern |

| Custom prompts per org | Database-stored prompt overrides | Query `org_settings` table |

| Plugins / webhooks | Webhook dispatch on meeting events | Event-driven pattern |

---

# PART B — Dependency Graph

---

## 1. System-Level Dependency Graph

```

┌─────────────────────────────────────────────────────────┐

│                     FRONTEND LAYER                       │

│                                                          │

│  ┌──────────────────┐     ┌──────────────────────────┐  │

│  │  Chrome Extension │     │  Next.js Web App          │  │

│  │  (Audio Capture)  │     │  (Dashboard, Search, Chat)│  │

│  └────────┬─────────┘     └─────────┬────────────────┘  │

│           │ HTTP POST               │ HTTP + WebSocket   │

│           │ (audio chunks)          │ (API + real-time)  │

└───────────┼─────────────────────────┼────────────────────┘

            │                         │

            ▼                         ▼

┌─────────────────────────────────────────────────────────┐

│                      API LAYER                           │

│                                                          │

│  ┌──────────────────────────────────────────────────┐   │

│  │            FastAPI Application                     │   │

│  │                                                    │   │

│  │  api/v1/auth.py ─────────── core/security.py      │   │

│  │  api/v1/meetings.py ──────── services/meeting.py  │   │

│  │  api/v1/search.py ────────── services/search.py   │   │

│  │  api/v1/action_items.py ──── services/meeting.py  │   │

│  │  api/v1/export.py ────────── services/export.py   │   │

│  │  api/v1/chat.py ──────────── ai/pipeline.py       │   │

│  │  api/v1/webhooks.py ──────── workers/*.py         │   │

│  │  realtime/meeting_ws.py ──── Redis PubSub         │   │

│  └──────────────────────────────────────────────────┘   │

│           │                  │                 │         │

│     ┌─────┘            ┌─────┘           ┌─────┘        │

│     ▼                  ▼                 ▼              │

│  ┌────────┐     ┌──────────┐      ┌──────────┐         │

│  │Services│     │   AI     │      │ Workers  │         │

│  │        │     │          │      │ (Celery) │         │

│  │meeting │     │ llm.py   │      │          │         │

│  │search  │     │embeddings│      │transcribe│         │

│  │export  │     │pipeline  │      │diarize   │         │

│  │notify  │     │prompts/* │      │intel     │         │

│  └───┬────┘     └────┬─────┘      │embed     │         │

│      │               │            │notify    │         │

│      ▼               │            └────┬─────┘         │

│  ┌────────┐          │                 │               │

│  │  DB    │          │                 │               │

│  │Repos   │◄─────────┘─────────────────┘               │

│  └───┬────┘                                             │

└──────┼──────────────────────────────────────────────────┘

       │

       ▼

┌─────────────────────────────────────────────────────────┐

│                   DATA LAYER                             │

│                                                          │

│  ┌──────────┐   ┌──────────┐   ┌──────────┐            │

│  │PostgreSQL│   │  Redis   │   │  MinIO   │            │

│  │+ pgvector│   │          │   │  (S3)    │            │

│  │          │   │ • Cache  │   │          │            │

│  │ • Tables │   │ • Queue  │   │ • Audio  │            │

│  │ • HNSW  │   │ • PubSub │   │ • Exports│            │

│  │ • FTS   │   │ • Rate   │   │          │            │

│  └──────────┘   └──────────┘   └──────────┘            │

└─────────────────────────────────────────────────────────┘

       │

       ▼

┌─────────────────────────────────────────────────────────┐

│                 EXTERNAL SERVICES                        │

│                                                          │

│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │

│  │ OpenAI   │  │Anthropic │  │ SendGrid │  │ Google │ │

│  │Embeddings│  │/OpenAI   │  │ /Resend  │  │Calendar│ │

│  │API       │  │LLM API   │  │ Email    │  │API     │ │

│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │

└─────────────────────────────────────────────────────────┘

```

## 2. AI Pipeline Dependency Graph

```

Audio Chunk Uploaded

        │

        ▼

┌───────────────────┐

│  transcription    │  Worker: faster-whisper

│  worker           │  Input: audio file from MinIO

│                   │  Output: segments[] in PostgreSQL

└────────┬──────────┘

         │

         ▼

┌───────────────────┐

│  diarization      │  Worker: pyannote.audio

│  worker           │  Input: audio + segments

│                   │  Output: speaker-attributed segments

└────────┬──────────┘

         │

         ▼ (on meeting end only)

┌───────────────────┐

│  intelligence     │  Worker: LLM via litellm

│  worker           │  Input: full transcript

│                   │  Output: summary, actions, decisions

│                   │

│  ┌──────────────┐ │

│  │ summary_task │─┤  PARALLEL

│  │ actions_task │─┤  PARALLEL

│  │decisions_task│─┤  PARALLEL

│  └──────────────┘ │

│         │         │

│         ▼         │

│  ┌──────────────┐ │

│  │ context_task │ │  SEQUENTIAL (merges parallel outputs)

│  └──────────────┘ │

└────────┬──────────┘

         │

         ├────────────────────────┐

         ▼                        ▼

┌───────────────────┐    ┌───────────────────┐

│  embedding        │    │  notification     │

│  worker           │    │  worker           │

│  Input: transcript│    │  Input: summary   │

│  Output: vectors  │    │  Output: email    │

│  in pgvector      │    │  + Slack message  │

└───────────────────┘    └───────────────────┘

```

## 3. Build Order (Critical Path)

```

Phase 1 — Foundation (no dependencies)

  ├── INFRA-001: Docker Compose scaffold

  ├── INFRA-002: PostgreSQL + Alembic setup

  ├── INFRA-003: Redis setup

  ├── INFRA-004: MinIO setup

  └── INFRA-005: FastAPI scaffold



Phase 2 — Core Backend (depends on Phase 1)

  ├── AUTH-001: User model + registration

  ├── AUTH-002: JWT middleware

  ├── DB-001: Meeting model + CRUD

  ├── DB-002: Segment model + CRUD

  └── DB-003: Speaker model + CRUD



Phase 3 — AI Pipeline (depends on Phase 2)

  ├── AI-001: litellm wrapper

  ├── AI-002: Embedding service

  ├── AI-003: Celery configuration

  ├── AI-004: Transcription worker

  ├── AI-005: Diarization worker

  └── AI-006: Intelligence worker



Phase 4 — Frontend (depends on Phase 2, parallel with Phase 3)

  ├── WEB-001: Next.js scaffold

  ├── WEB-002: Auth pages

  ├── WEB-003: Meeting list

  ├── WEB-004: Meeting detail

  └── WEB-005: Search



Phase 5 — Extension (depends on Phase 2)

  ├── EXT-001: Manifest + scaffold

  ├── EXT-002: Audio capture

  └── EXT-003: Upload to server



Phase 6 — Integration (depends on Phase 3 + 4)

  ├── RT-001: WebSocket server

  ├── RT-002: Live transcript

  ├── SEARCH-001: Semantic search

  └── INT-001: Email reports

```

## 4. Independent Subsystems

These can be built in any order relative to each other:

```

Independent Subsystem A: Search (SEARCH-*)

  - Can be developed once embeddings exist

  - No dependency on real-time or notifications



Independent Subsystem B: Export (API-008, API-009)

  - Can be developed once meetings exist

  - No dependency on AI or real-time



Independent Subsystem C: Notifications (INT-*)

  - Can be developed once meetings exist

  - No dependency on search or real-time



Independent Subsystem D: Knowledge Graph / RAG Chat (SEARCH-004, SEARCH-005)

  - Requires embeddings to be working

  - No dependency on real-time or notifications

```

## 5. Optional Subsystems (Deferrable)

```

Optional: Calendar Integration (INT-003, INT-004)

  - Can ship V2 without it

  - High user value but complex (OAuth + webhook)



Optional: Slack Integration (INT-005)

  - Nice-to-have for V2

  - Independent of all other subsystems



Optional: Chrome Extension (EXT-*)

  - Web app can accept manual audio upload

  - Extension adds convenience, not core functionality

```

---

# PART C — Implementation Backlog

---

## Epic: INFRA — Infrastructure & DevOps

---

### INFRA-001

**Title**: Create Docker Compose development environment

**Objective**: Establish the foundational Docker Compose configuration that runs all infrastructure services (PostgreSQL, Redis, MinIO) with a single command.

**Background**: V1 used Docker Compose for PostgreSQL and Whisper only. V2 needs Redis for queuing/caching and MinIO for object storage. All services must be accessible from the host for local development.

**Dependencies**: None — this is the first ticket.

**Affected Packages**: Root directory

**Files Expected to Change**:

- `docker-compose.dev.yml` (NEW)

- `docker-compose.yml` (NEW)

- `.env.example` (NEW)

- `.gitignore` (MODIFY — ensure `.env` excluded)

- `Makefile` (NEW)

**Interfaces**: None (infrastructure only)

**Acceptance Criteria**:

- [ ] `make dev-infra` starts PostgreSQL 16 on port 5432

- [ ] `make dev-infra` starts Redis 7 on port 6379

- [ ] `make dev-infra` starts MinIO on port 9000 (console on 9001)

- [ ] All services are reachable from host

- [ ] `.env.example` contains all required environment variables with placeholder values

- [ ] `.gitignore` includes `.env`, `*.pyc`, `__pycache__`, `node_modules`, `.next`

- [ ] `Makefile` includes targets: `dev-infra`, `dev-stop`, `dev-clean`

**Testing Requirements**:

- Manual: Run `make dev-infra`, verify all ports responsive

- Manual: Run `make dev-stop`, verify all containers stopped

**Definition of Done**: All infrastructure services start, are reachable, and stop cleanly.

**Complexity**: S

**Estimated Time**: 1 hour

**Risks**: Port conflicts with existing services on developer machine.

**Notes for the Coding AI**: Use named volumes for data persistence. Use `healthcheck` directives for all services. Set `restart: unless-stopped`. Use specific image tags, not `latest`.

---

### INFRA-002

**Title**: Set up FastAPI project scaffold with Alembic migrations

**Objective**: Create the FastAPI application skeleton with Alembic migration infrastructure and the initial database schema.

**Background**: V1 used a Hono/Node.js server with raw SQL. V2 uses FastAPI with SQLAlchemy for type-safe queries and Alembic for migration management.

**Dependencies**: INFRA-001

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/pyproject.toml` (NEW)

- `server/app/__init__.py` (NEW)

- `server/app/main.py` (NEW)

- `server/app/core/__init__.py` (NEW)

- `server/app/core/config.py` (NEW)

- `server/app/db/__init__.py` (NEW)

- `server/app/db/session.py` (NEW)

- `server/app/db/tables.py` (NEW — empty for now)

- `server/migrations/env.py` (NEW)

- `server/migrations/alembic.ini` (NEW)

- `server/Dockerfile` (NEW)

**Interfaces**:

```python

# config.py

class Settings(BaseSettings):

    database_url: str

    redis_url: str

    secret_key: str

    ...



# session.py

async def get_db() -> AsyncGenerator[AsyncSession, None]: ...



# main.py

app = FastAPI(title="Watchn't API", version="2.0.0")

```

**Acceptance Criteria**:

- [ ] `uvicorn server.app.main:app --reload` starts successfully

- [ ] `GET /health` returns `{"status": "ok"}`

- [ ] `GET /docs` shows Swagger UI

- [ ] `alembic revision --autogenerate -m "initial"` creates a migration

- [ ] `alembic upgrade head` applies the migration

- [ ] `Settings` loads from environment variables

- [ ] Docker build succeeds

**Testing Requirements**:

- Unit: Test that `Settings` loads correctly with env vars

- Manual: Start server, hit `/health`, verify Swagger UI

**Definition of Done**: FastAPI server starts, connects to PostgreSQL, Alembic migrations work.

**Complexity**: M

**Estimated Time**: 2 hours

**Risks**: SQLAlchemy async session configuration can be tricky. Use `create_async_engine` with `asyncpg` driver.

**Notes for the Coding AI**: Use `pydantic-settings` for config. Use `asyncpg` as the PostgreSQL driver. Set `pool_size=20` and `pool_pre_ping=True` on the engine. The `main.py` should include lifespan handlers for startup/shutdown.

---

### INFRA-003

**Title**: Set up Celery with Redis broker

**Objective**: Configure Celery for background task processing with Redis as the broker and result backend.

**Background**: V1 had no background processing — everything ran in the browser. V2 moves all AI processing to Celery workers.

**Dependencies**: INFRA-001, INFRA-002

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/workers/__init__.py` (NEW)

- `server/app/workers/celery_app.py` (NEW)

- `docker-compose.dev.yml` (MODIFY — add worker service)

- `Makefile` (MODIFY — add `dev-worker` target)

**Interfaces**:

```python

# celery_app.py

celery_app = Celery("watchnt", broker=settings.redis_url)

```

**Acceptance Criteria**:

- [ ] `celery -A server.app.workers.celery_app worker --loglevel=info` starts

- [ ] A test task can be enqueued and executed

- [ ] Worker appears in Docker Compose dev setup

- [ ] `make dev-worker` starts the Celery worker

**Testing Requirements**:

- Integration: Enqueue a test task, verify it executes

- Manual: Verify worker logs in Docker Compose

**Definition of Done**: Celery worker starts, connects to Redis, processes a test task.

**Complexity**: S

**Estimated Time**: 1.5 hours

**Risks**: Celery + async can cause issues. Use `celery[redis]` with sync tasks (Celery tasks call async functions via `asyncio.run()`).

**Notes for the Coding AI**: Celery tasks should be sync functions that internally call async code via `asyncio.run()`. Do not use `celery-pool-gevent`. Configure `task_serializer='json'` and `result_serializer='json'`.

---

### INFRA-004

**Title**: Set up MinIO client for object storage

**Objective**: Create a reusable S3-compatible storage client for audio file uploads and downloads.

**Background**: V1 stored audio as temp files on disk. V2 uses MinIO (S3-compatible) for persistent, scalable audio storage.

**Dependencies**: INFRA-001

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/core/storage.py` (NEW)

**Interfaces**:

```python

# storage.py

class StorageClient:

    async def upload(self, bucket: str, key: str, data: bytes, content_type: str) -> str: ...

    async def download(self, bucket: str, key: str) -> bytes: ...

    async def get_presigned_url(self, bucket: str, key: str, expires: int = 3600) -> str: ...

    async def delete(self, bucket: str, key: str) -> None: ...

```

**Acceptance Criteria**:

- [ ] Can upload a file to MinIO

- [ ] Can download the uploaded file

- [ ] Can generate a presigned URL

- [ ] Can delete a file

- [ ] Bucket auto-created if not exists

**Testing Requirements**:

- Integration: Upload, download, delete cycle against real MinIO

- Unit: Test key generation logic

**Definition of Done**: Storage client works with MinIO, all CRUD operations functional.

**Complexity**: S

**Estimated Time**: 1.5 hours

**Risks**: MinIO Python SDK (`minio`) is sync-only. Wrap in `asyncio.to_thread()` for async compatibility.

**Notes for the Coding AI**: Use the `minio` Python package. Wrap sync calls in `asyncio.to_thread()`. Default bucket name: `watchnt-audio`. Use UUIDs for object keys.

---

### INFRA-005

**Title**: GitHub Actions CI pipeline

**Objective**: Set up automated CI that runs linting, type checking, and tests on every PR.

**Background**: V1 had no CI/CD. V2 requires automated quality gates.

**Dependencies**: INFRA-002

**Affected Packages**: `.github/`

**Files Expected to Change**:

- `.github/workflows/ci.yml` (NEW)

**Acceptance Criteria**:

- [ ] CI runs on every push and PR

- [ ] Runs `ruff check` and `ruff format --check`

- [ ] Runs `mypy server/`

- [ ] Runs `pytest server/tests/`

- [ ] Fails the build if any step fails

- [ ] Uses PostgreSQL and Redis service containers for integration tests

**Testing Requirements**:

- Manual: Push a branch, verify CI runs

**Definition of Done**: CI pipeline runs and blocks merge on failure.

**Complexity**: M

**Estimated Time**: 2 hours

**Risks**: Service containers for PostgreSQL + Redis add CI complexity.

**Notes for the Coding AI**: Use `services` in GitHub Actions for PostgreSQL and Redis. Cache pip dependencies. Use a matrix strategy if testing multiple Python versions.

---

## Epic: AUTH — Authentication & User Management

---

### AUTH-001

**Title**: User model, registration, and login endpoints

**Objective**: Implement user registration and login with JWT token issuance.

**Background**: V1 had no authentication — all requests used a hardcoded user ID. V2 requires proper user management.

**Dependencies**: INFRA-002

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/db/tables.py` (MODIFY — add users table)

- `server/app/models/user.py` (NEW)

- `server/app/core/security.py` (NEW)

- `server/app/api/v1/auth.py` (NEW)

- `server/app/db/repositories/user_repo.py` (NEW)

- `server/migrations/versions/xxx_add_users.py` (NEW — auto-generated)

**Interfaces**:

```python

# POST /api/v1/auth/register

class RegisterRequest(BaseModel):

    email: EmailStr

    password: str = Field(min_length=8)

    name: str



class AuthResponse(BaseModel):

    access_token: str

    token_type: str = "bearer"

    user: UserPublic



# POST /api/v1/auth/login

class LoginRequest(BaseModel):

    email: EmailStr

    password: str

```

**Acceptance Criteria**:

- [ ] `POST /api/v1/auth/register` creates user and returns JWT

- [ ] `POST /api/v1/auth/login` validates credentials and returns JWT

- [ ] Passwords stored as bcrypt hashes (cost 12)

- [ ] Duplicate email returns 409

- [ ] Invalid credentials return 401

- [ ] JWT contains `user_id`, `email`, `exp`

- [ ] Access token expires in 15 minutes

- [ ] Refresh token set as httpOnly cookie (7 days)

**Testing Requirements**:

- Unit: Password hashing round-trip

- Unit: JWT encode/decode

- Integration: Register → Login → Verify token

- Edge: Duplicate email, wrong password, expired token

**Definition of Done**: Users can register, login, and receive valid JWTs.

**Complexity**: M

**Estimated Time**: 3 hours

**Risks**: None — standard authentication pattern.

**Notes for the Coding AI**: Use `passlib[bcrypt]` for hashing. Use `python-jose[cryptography]` for JWT. Store refresh token in httpOnly cookie with `SameSite=Lax`. Never return the password hash in any response.

---

### AUTH-002

**Title**: JWT authentication middleware

**Objective**: Create a FastAPI dependency that validates JWT tokens and injects the current user into request handlers.

**Dependencies**: AUTH-001

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/core/deps.py` (NEW)

- `server/app/api/v1/auth.py` (MODIFY — add `/me` endpoint)

**Interfaces**:

```python

# deps.py

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserPublic: ...

async def get_current_user_optional(token: str | None = Depends(oauth2_scheme_optional)) -> UserPublic | None: ...

```

**Acceptance Criteria**:

- [ ] Protected endpoints return 401 without token

- [ ] Protected endpoints return 401 with expired token

- [ ] Protected endpoints return 401 with invalid token

- [ ] `GET /api/v1/auth/me` returns current user

- [ ] `get_current_user` dependency injectable into any route

**Testing Requirements**:

- Integration: Access protected endpoint without token → 401

- Integration: Access protected endpoint with valid token → 200

- Integration: Access with expired token → 401

**Definition of Done**: JWT middleware protects endpoints and injects user context.

**Complexity**: S

**Estimated Time**: 1.5 hours

**Risks**: None.

**Notes for the Coding AI**: Use FastAPI's `Depends()` pattern. Create an `OAuth2PasswordBearer` scheme pointing to `/api/v1/auth/login`. The `get_current_user` function should decode the JWT, look up the user in the database, and return a `UserPublic` model.

---

### AUTH-003

**Title**: API key authentication for Chrome extension

**Objective**: Allow users to generate a personal API key for the Chrome extension to use instead of JWT.

**Dependencies**: AUTH-001, AUTH-002

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/db/tables.py` (MODIFY — add api_keys table)

- `server/app/models/user.py` (MODIFY — add ApiKey model)

- `server/app/api/v1/auth.py` (MODIFY — add key generation endpoint)

- `server/app/core/deps.py` (MODIFY — add API key auth)

**Interfaces**:

```python

# POST /api/v1/auth/api-keys

class ApiKeyResponse(BaseModel):

    key: str         # shown once, then hashed

    key_prefix: str  # first 8 chars for identification

    created_at: datetime



# X-API-Key header authentication

async def get_current_user_from_api_key(api_key: str = Header(..., alias="X-API-Key")) -> UserPublic: ...

```

**Acceptance Criteria**:

- [ ] `POST /api/v1/auth/api-keys` generates a new API key

- [ ] API key is shown once in the response, then stored as hash

- [ ] `X-API-Key` header authenticates requests

- [ ] `DELETE /api/v1/auth/api-keys/{prefix}` revokes a key

- [ ] `GET /api/v1/auth/api-keys` lists active keys (prefix only)

- [ ] Auth middleware accepts either JWT or API key

**Testing Requirements**:

- Integration: Generate key → Use key → Access protected endpoint

- Integration: Revoke key → Verify 401

**Definition of Done**: Extension can authenticate via API key.

**Complexity**: M

**Estimated Time**: 2 hours

**Risks**: Key storage — hash the key with SHA-256, store the hash, compare on auth.

**Notes for the Coding AI**: Generate keys using `secrets.token_urlsafe(32)`. Store SHA-256 hash. Look up by prefix (first 8 chars, stored unscrambled) then verify full hash. This avoids full-table hash comparisons.

---

## Epic: DB — Database Models & Migrations

---

### DB-001

**Title**: Meeting model, table, and CRUD repository

**Objective**: Create the core `meetings` table with full CRUD operations.

**Dependencies**: INFRA-002, AUTH-001

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/db/tables.py` (MODIFY — add meetings table)

- `server/app/models/meeting.py` (NEW)

- `server/app/db/repositories/meeting_repo.py` (NEW)

- `server/migrations/versions/xxx_add_meetings.py` (NEW)

**Interfaces**:

```python

# models/meeting.py

class MeetingCreate(BaseModel):

    title: str

    platform: Literal["google_meet", "zoom", "teams", "manual"]



class MeetingPublic(BaseModel):

    id: UUID

    title: str

    platform: str

    status: str  # scheduled, live, processing, completed, failed

    started_at: datetime | None

    ended_at: datetime | None

    duration_sec: int | None

    summary: str | None

    created_at: datetime



# repositories/meeting_repo.py

class MeetingRepository:

    async def create(self, user_id: UUID, data: MeetingCreate) -> MeetingPublic: ...

    async def get(self, meeting_id: UUID, user_id: UUID) -> MeetingPublic | None: ...

    async def list(self, user_id: UUID, limit: int, offset: int) -> list[MeetingPublic]: ...

    async def update_status(self, meeting_id: UUID, status: str) -> None: ...

    async def update_summary(self, meeting_id: UUID, summary: str, ...) -> None: ...

    async def delete(self, meeting_id: UUID, user_id: UUID) -> bool: ...

```

**Acceptance Criteria**:

- [ ] Migration creates `meetings` table with all columns

- [ ] CRUD operations work correctly

- [ ] All queries filter by `user_id` (data isolation)

- [ ] `list` supports pagination with `limit` and `offset`

- [ ] `status` defaults to `"scheduled"`

- [ ] `created_at` and `updated_at` auto-populated

**Testing Requirements**:

- Integration: Create, read, update, delete meeting

- Integration: List with pagination

- Integration: Verify user isolation (user A cannot see user B's meetings)

**Definition of Done**: Meetings can be created, listed, updated, and deleted.

**Complexity**: M

**Estimated Time**: 2.5 hours

**Risks**: None.

**Notes for the Coding AI**: Use `sqlalchemy.Column` definitions, not ORM mapping. Keep repositories as plain classes that receive an `AsyncSession` in their constructor. Use parameterized queries via SQLAlchemy Core.

---

### DB-002

**Title**: Segment model (transcript segments)

**Objective**: Create the `segments` table for storing timestamped transcript chunks.

**Dependencies**: DB-001

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/db/tables.py` (MODIFY)

- `server/app/models/transcript.py` (NEW)

- `server/app/db/repositories/transcript_repo.py` (NEW)

- `server/migrations/versions/xxx_add_segments.py` (NEW)

**Interfaces**:

```python

class SegmentCreate(BaseModel):

    text: str

    start_time: float

    end_time: float

    speaker_id: UUID | None = None



class SegmentPublic(BaseModel):

    id: UUID

    text: str

    start_time: float

    end_time: float

    speaker_label: str | None

    confidence: float



class TranscriptRepository:

    async def add_segments(self, meeting_id: UUID, segments: list[SegmentCreate]) -> list[UUID]: ...

    async def get_segments(self, meeting_id: UUID) -> list[SegmentPublic]: ...

    async def get_full_transcript(self, meeting_id: UUID) -> str: ...

```

**Acceptance Criteria**:

- [ ] Segments stored with meeting_id foreign key

- [ ] Segments ordered by start_time

- [ ] `get_full_transcript` returns concatenated text with speaker labels

- [ ] Bulk insert for efficiency

**Testing Requirements**:

- Integration: Add segments, retrieve in order

- Integration: Full transcript assembly

**Definition of Done**: Transcript segments can be stored and retrieved.

**Complexity**: S

**Estimated Time**: 2 hours

**Risks**: None.

**Notes for the Coding AI**: Use `insert().values(list_of_dicts)` for bulk insert. Order by `start_time ASC` in retrieval.

---

### DB-003

**Title**: Speaker model

**Objective**: Create the `speakers` table for tracking meeting participants.

**Dependencies**: DB-001

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/db/tables.py` (MODIFY)

- `server/app/models/speaker.py` (NEW)

- `server/app/db/repositories/speaker_repo.py` (NEW)

- `server/migrations/versions/xxx_add_speakers.py` (NEW)

**Interfaces**:

```python

class SpeakerCreate(BaseModel):

    label: str  # "Speaker 1"

    user_id: UUID | None = None



class SpeakerPublic(BaseModel):

    id: UUID

    label: str

    user_name: str | None

    speaking_time_sec: int

    word_count: int

```

**Acceptance Criteria**:

- [ ] Speakers linked to meetings via foreign key

- [ ] Optional link to user record

- [ ] Speaking time and word count tracked

**Testing Requirements**:

- Integration: Create speaker, update stats, retrieve

**Definition of Done**: Speakers can be created and associated with meetings.

**Complexity**: S

**Estimated Time**: 1.5 hours

**Risks**: None.

**Notes for the Coding AI**: Keep it simple. Label is a free-text string initially assigned by diarization ("Speaker 1", "Speaker 2"). User mapping is optional and added later.

---

### DB-004

**Title**: Action items and decisions models

**Objective**: Create `action_items` and `decisions` as first-class database entities.

**Dependencies**: DB-001

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/db/tables.py` (MODIFY)

- `server/app/models/action_item.py` (NEW)

- `server/app/db/repositories/action_item_repo.py` (NEW)

- `server/migrations/versions/xxx_add_actions_decisions.py` (NEW)

**Interfaces**:

```python

class ActionItemCreate(BaseModel):

    text: str

    assignee_name: str | None = None

    deadline: str | None = None



class ActionItemPublic(BaseModel):

    id: UUID

    meeting_id: UUID

    text: str

    assignee_name: str | None

    status: Literal["open", "in_progress", "completed", "cancelled"]

    deadline: str | None

    created_at: datetime

    completed_at: datetime | None



class ActionItemUpdate(BaseModel):

    status: Literal["open", "in_progress", "completed", "cancelled"] | None = None

    assignee_name: str | None = None

```

**Acceptance Criteria**:

- [ ] Action items linked to meetings

- [ ] Status transitions: open → in_progress → completed/cancelled

- [ ] Decisions stored as separate entities

- [ ] Can list all open action items across meetings for a user

**Testing Requirements**:

- Integration: Create, update status, list across meetings

- Edge: Invalid status transition

**Definition of Done**: Action items and decisions are queryable first-class entities.

**Complexity**: M

**Estimated Time**: 2.5 hours

**Risks**: None.

**Notes for the Coding AI**: Do not enforce status transition rules in the database — enforce in the service layer. Add an index on `(user_id, status)` for the cross-meeting action items view.

---

### DB-005

**Title**: Meeting embeddings table with HNSW index

**Objective**: Create the `meeting_embeddings` table with pgvector HNSW index for semantic search.

**Dependencies**: DB-001

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/db/tables.py` (MODIFY)

- `server/migrations/versions/xxx_add_embeddings.py` (NEW)

**Acceptance Criteria**:

- [ ] `meeting_embeddings` table with `vector(1536)` column

- [ ] HNSW index on embedding column with cosine distance

- [ ] Foreign key to `meetings`

- [ ] `chunk_text` stored alongside embedding for retrieval

**Testing Requirements**:

- Integration: Insert embedding, query by similarity

**Definition of Done**: Embeddings can be stored and queried via cosine similarity.

**Complexity**: S

**Estimated Time**: 1 hour

**Risks**: pgvector HNSW requires pgvector ≥ 0.5.0. Verify Docker image version.

**Notes for the Coding AI**: Use `CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)` in the migration. Ensure the pgvector extension is created in the initial migration.

---

## Epic: API — REST API Endpoints

---

### API-001

**Title**: Meeting CRUD API endpoints

**Objective**: Expose meeting CRUD operations as REST endpoints.

**Dependencies**: DB-001, AUTH-002

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/api/v1/meetings.py` (NEW)

- `server/app/services/meeting_service.py` (NEW)

- `server/app/main.py` (MODIFY — register router)

**Interfaces**:

```

POST   /api/v1/meetings           → MeetingPublic

GET    /api/v1/meetings           → { meetings: MeetingPublic[], total: int }

GET    /api/v1/meetings/{id}      → MeetingDetailPublic (includes segments, speakers, actions)

PATCH  /api/v1/meetings/{id}      → MeetingPublic

DELETE /api/v1/meetings/{id}      → { deleted: true }

```

**Acceptance Criteria**:

- [ ] All endpoints require authentication

- [ ] User can only access own meetings

- [ ] List supports `?limit=`, `?offset=`, `?status=` query params

- [ ] Detail view includes segments, speakers, action items, decisions

- [ ] 404 for non-existent meeting

- [ ] 403 for another user's meeting

**Testing Requirements**:

- Integration: Full CRUD cycle

- Integration: User isolation

- Integration: Pagination

**Definition of Done**: Meeting CRUD fully functional via REST API.

**Complexity**: M

**Estimated Time**: 3 hours

**Risks**: None.

**Notes for the Coding AI**: The service layer should contain all business logic. The API layer should only handle request/response transformation. Use FastAPI's `APIRouter` with prefix `/api/v1/meetings`.

---

### API-002

**Title**: Audio upload endpoint

**Objective**: Accept audio chunks from the Chrome extension and store in MinIO.

**Dependencies**: API-001, INFRA-004, AUTH-003

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/api/v1/meetings.py` (MODIFY — add audio upload route)

**Interfaces**:

```

POST /api/v1/meetings/{id}/audio

Content-Type: multipart/form-data

Body: { file: binary (WebM audio) }

Response: { chunk_id: str, duration_sec: float }

```

**Acceptance Criteria**:

- [ ] Accepts WebM audio files up to 100MB

- [ ] Stores in MinIO under `audio/{meeting_id}/{chunk_id}.webm`

- [ ] Returns chunk ID for tracking

- [ ] Enqueues transcription task

- [ ] Updates meeting status to "live" on first chunk

- [ ] Rejects non-audio content types

- [ ] Requires API key or JWT auth

**Testing Requirements**:

- Integration: Upload audio file, verify stored in MinIO

- Integration: Verify transcription task enqueued

- Edge: Oversized file (> 100MB)

- Edge: Wrong content type

**Definition of Done**: Audio can be uploaded and stored reliably.

**Complexity**: M

**Estimated Time**: 2.5 hours

**Risks**: Large file uploads may timeout. Use streaming upload if possible.

**Notes for the Coding AI**: Use FastAPI's `UploadFile` parameter. Generate chunk IDs with `uuid4()`. Validate file size in middleware. Use `file.read()` in chunks for memory efficiency.

---

### API-003

**Title**: Action items API endpoints

**Objective**: CRUD for action items with cross-meeting listing.

**Dependencies**: DB-004, AUTH-002

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/api/v1/action_items.py` (NEW)

**Interfaces**:

```

GET    /api/v1/action-items              → list all user's action items

GET    /api/v1/meetings/{id}/actions     → list meeting's action items

PATCH  /api/v1/action-items/{id}         → update status/assignee

```

**Acceptance Criteria**:

- [ ] Cross-meeting list supports `?status=open` filter

- [ ] Can update status (open → completed, etc.)

- [ ] All queries scoped to current user

**Testing Requirements**:

- Integration: Create actions via meeting, list across meetings, update status

**Definition of Done**: Action items manageable as independent entities.

**Complexity**: S

**Estimated Time**: 2 hours

**Risks**: None.

**Notes for the Coding AI**: Action items are created by the intelligence worker, not directly by users. The API only exposes read and update (status changes).

---

### API-004

**Title**: Search API endpoint

**Objective**: Semantic search across all user's meetings using pgvector.

**Dependencies**: DB-005, AUTH-002

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/api/v1/search.py` (NEW)

- `server/app/services/search_service.py` (NEW)

- `server/app/db/repositories/search_repo.py` (NEW)

**Interfaces**:

```

POST /api/v1/search

Body: { query: str, limit: int = 20 }

Response: {

    results: [{

        meeting_id: UUID,

        meeting_title: str,

        chunk_text: str,

        similarity: float,

        meeting_date: datetime

    }]

}

```

**Acceptance Criteria**:

- [ ] Query text is embedded via OpenAI API

- [ ] Top-K results returned by cosine similarity

- [ ] Results include meeting metadata

- [ ] Limit capped at 50

- [ ] Results scoped to current user's meetings

- [ ] Response time < 500ms for < 100K embeddings

**Testing Requirements**:

- Integration: Index a meeting, search for it, verify found

- Edge: Empty query, very long query

**Definition of Done**: Semantic search returns relevant results.

**Complexity**: M

**Estimated Time**: 3 hours

**Risks**: Embedding API latency (~200ms per call). Consider caching.

**Notes for the Coding AI**: Use the embedding service from AI-002. Join results with meetings table to get metadata. Order by similarity DESC.

---

### API-005

**Title**: RAG chat endpoint with streaming

**Objective**: Chat endpoint that retrieves context from meetings and streams LLM responses via SSE.

**Dependencies**: API-004, AI-001

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/api/v1/chat.py` (NEW)

**Interfaces**:

```

POST /api/v1/chat

Body: { message: str, conversation_id: UUID | null }

Response: Server-Sent Events (text/event-stream)

  data: {"type": "token", "content": "..."}

  data: {"type": "sources", "meeting_ids": [...]}

  data: {"type": "done"}

```

**Acceptance Criteria**:

- [ ] Retrieves top 10 relevant chunks via semantic search

- [ ] Assembles context from retrieved chunks

- [ ] Streams LLM response via SSE

- [ ] Includes source meeting IDs in response

- [ ] Handles empty knowledge base gracefully

**Testing Requirements**:

- Integration: Send message, receive streamed response

- Edge: No relevant context found

**Definition of Done**: Users can chat with their meeting history with streaming responses.

**Complexity**: L

**Estimated Time**: 4 hours

**Risks**: SSE connection management, context window overflow.

**Notes for the Coding AI**: Use FastAPI's `StreamingResponse` with `media_type="text/event-stream"`. Use litellm's streaming mode. Format each SSE event as `data: {json}\n\n`.

---

### API-006

**Title**: Export endpoints (JSON, Markdown, PDF)

**Objective**: Export meeting data in multiple formats.

**Dependencies**: API-001

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/api/v1/export.py` (NEW)

- `server/app/services/export_service.py` (NEW)

**Interfaces**:

```

GET /api/v1/meetings/{id}/export?format=json|markdown|pdf

Response: file download

```

**Acceptance Criteria**:

- [ ] JSON: Full meeting data as structured JSON

- [ ] Markdown: Formatted document with headers, speaker labels, action items

- [ ] All exports scoped to current user

- [ ] Content-Disposition header for file download

**Testing Requirements**:

- Integration: Export each format, verify content

**Definition of Done**: Meetings can be exported in 3 formats.

**Complexity**: M

**Estimated Time**: 3 hours

**Risks**: PDF generation requires `weasyprint` which has system dependencies. Defer PDF to a follow-up ticket if it blocks progress.

**Notes for the Coding AI**: Start with JSON and Markdown only. Use Jinja2 templates for Markdown formatting. PDF can be added later.

---

## Epic: AI — AI Pipeline & Processing

---

### AI-001

**Title**: LLM abstraction layer with litellm

**Objective**: Create a unified LLM calling interface that supports all providers via litellm.

**Dependencies**: INFRA-002

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/ai/__init__.py` (NEW)

- `server/app/ai/llm.py` (NEW)

**Interfaces**:

```python

async def complete(

    *,

    model: str,

    messages: list[dict],

    response_model: type[BaseModel] | None = None,

    temperature: float = 0.3,

    max_tokens: int = 4096,

    stream: bool = False,

) -> str | BaseModel | AsyncIterator[str]: ...

```

**Acceptance Criteria**:

- [ ] Calls litellm.completion under the hood

- [ ] Supports structured output via Pydantic model (JSON mode)

- [ ] Supports streaming mode

- [ ] Logs model, token usage, latency for every call

- [ ] Raises typed exceptions on failure (LLMError, LLMRateLimitError, etc.)

- [ ] Configurable timeout (default 60s)

- [ ] Works with at least: `anthropic/claude-3-haiku-20240307`, `gpt-4.1-mini`, `ollama/llama3.1`

**Testing Requirements**:

- Unit: Test with mocked litellm responses

- Unit: Test structured output parsing

- Unit: Test error handling

**Definition of Done**: Any part of the system can call any LLM via one function.

**Complexity**: M

**Estimated Time**: 3 hours

**Risks**: litellm version compatibility. Pin version in pyproject.toml.

**Notes for the Coding AI**: Use `litellm.acompletion` for async. For structured output, use `response_format={"type": "json_object"}` and parse with the Pydantic model. Log to structured logger (not print).

---

### AI-002

**Title**: Embedding service with caching

**Objective**: Generate text embeddings via OpenAI API with Redis caching.

**Dependencies**: INFRA-003, INFRA-002

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/ai/embeddings.py` (NEW)

**Interfaces**:

```python

class EmbeddingService:

    async def embed(self, text: str) -> list[float]: ...

    async def embed_batch(self, texts: list[str]) -> list[list[float]]: ...

```

**Acceptance Criteria**:

- [ ] Uses OpenAI `text-embedding-3-small` (1536 dimensions)

- [ ] Caches embeddings in Redis with `sha256(text)` key, 7-day TTL

- [ ] Batch mode for efficiency (up to 100 texts per API call)

- [ ] Graceful fallback if cache unavailable

- [ ] Logs embedding latency and cache hit rate

**Testing Requirements**:

- Unit: Test cache hit/miss logic (mock Redis)

- Integration: Generate embedding, verify 1536 dimensions

- Integration: Verify cache works

**Definition of Done**: Embeddings generated reliably with caching.

**Complexity**: M

**Estimated Time**: 2.5 hours

**Risks**: OpenAI API key required. Fall back to Ollama `nomic-embed-text` if key not configured.

**Notes for the Coding AI**: Use the `openai` Python package directly (not litellm) for embeddings — litellm's embedding support is less mature. Cache key: `embed:{sha256(text)}`. Cache value: JSON array of floats.

---

### AI-003

**Title**: Summary prompt and extraction

**Objective**: Create the meeting summary prompt with structured output.

**Dependencies**: AI-001

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/ai/prompts/__init__.py` (NEW)

- `server/app/ai/prompts/summary.py` (NEW)

**Interfaces**:

```python

VERSION = "1.0.0"



class SummaryOutput(BaseModel):

    executive_summary: str = Field(description="2-3 sentence executive summary")

    key_points: list[str] = Field(description="5-10 key discussion points")

    topics: list[str] = Field(description="Main topics discussed")

    sentiment: str = Field(description="Overall meeting sentiment: positive/neutral/negative")



async def generate_summary(transcript: str, speakers: list[str]) -> SummaryOutput: ...

```

**Acceptance Criteria**:

- [ ] Prompt includes speaker labels in transcript

- [ ] Output conforms to SummaryOutput schema

- [ ] Handles transcripts up to 100K tokens (truncation strategy)

- [ ] Version tracked in output metadata

**Testing Requirements**:

- Unit: Test prompt assembly with sample transcript

- Unit: Test output parsing with sample LLM response (mocked)

- Edge: Very short transcript (< 100 words)

- Edge: Very long transcript (> 50K words — truncation)

**Definition of Done**: Summary generation works with structured output.

**Complexity**: M

**Estimated Time**: 2 hours

**Risks**: Token limits. If transcript exceeds model context, summarize in chunks then merge.

**Notes for the Coding AI**: Use `response_model=SummaryOutput` in the `complete()` call. For long transcripts, implement a map-reduce strategy: summarize 10K-token chunks, then summarize the summaries.

---

### AI-004

**Title**: Action items prompt and extraction

**Objective**: Extract action items from meeting transcript.

**Dependencies**: AI-001

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/ai/prompts/action_items.py` (NEW)

**Interfaces**:

```python

class ActionItemOutput(BaseModel):

    text: str

    assignee: str | None

    deadline: str | None

    priority: Literal["high", "medium", "low"]



class ActionItemsOutput(BaseModel):

    action_items: list[ActionItemOutput]



async def extract_action_items(transcript: str, speakers: list[str]) -> ActionItemsOutput: ...

```

**Acceptance Criteria**:

- [ ] Extracts commitments, to-dos, follow-ups

- [ ] Assigns to speaker when mentioned

- [ ] Extracts deadlines when mentioned

- [ ] Handles meetings with no action items gracefully

**Testing Requirements**:

- Unit: Test with sample transcript containing clear action items

- Unit: Test with transcript containing no action items

**Definition of Done**: Action items reliably extracted from transcripts.

**Complexity**: S

**Estimated Time**: 1.5 hours

**Risks**: LLM hallucination — may invent action items. Add instruction: "Only extract explicitly stated commitments."

**Notes for the Coding AI**: Include few-shot examples in the prompt showing good and bad action item extraction. Emphasize extracting only explicit commitments.

---

### AI-005

**Title**: Decisions prompt and extraction

**Objective**: Extract decisions made during meetings.

**Dependencies**: AI-001

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/ai/prompts/decisions.py` (NEW)

**Interfaces**:

```python

class DecisionOutput(BaseModel):

    text: str

    context: str  # brief context for why this decision was made



class DecisionsOutput(BaseModel):

    decisions: list[DecisionOutput]



async def extract_decisions(transcript: str) -> DecisionsOutput: ...

```

**Acceptance Criteria**:

- [ ] Extracts explicit decisions

- [ ] Includes brief context for each decision

- [ ] Returns empty list if no decisions found

**Testing Requirements**:

- Unit: Test with sample transcript containing decisions

**Definition of Done**: Decisions reliably extracted.

**Complexity**: S

**Estimated Time**: 1 hour

**Risks**: None.

**Notes for the Coding AI**: Similar pattern to action items. Focus prompt on explicit group decisions, not individual opinions.

---

### AI-006

**Title**: Meeting intelligence pipeline orchestrator

**Objective**: Orchestrate the full intelligence pipeline (summary + actions + decisions in parallel, then merge).

**Dependencies**: AI-003, AI-004, AI-005

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/ai/pipeline.py` (NEW)

**Interfaces**:

```python

class MeetingIntelligence(BaseModel):

    summary: SummaryOutput

    action_items: list[ActionItemOutput]

    decisions: list[DecisionOutput]



async def run_intelligence_pipeline(

    meeting_id: UUID,

    transcript: str,

    speakers: list[str]

) -> MeetingIntelligence: ...

```

**Acceptance Criteria**:

- [ ] Runs summary, action items, and decisions extraction in parallel

- [ ] Returns combined result

- [ ] Total latency < 15s (parallel execution)

- [ ] Handles partial failures (if one extraction fails, others still succeed)

- [ ] Logs total pipeline duration and per-step duration

**Testing Requirements**:

- Unit: Test orchestration with mocked AI calls

- Unit: Test partial failure handling

**Definition of Done**: Pipeline runs in parallel and returns combined intelligence.

**Complexity**: M

**Estimated Time**: 2.5 hours

**Risks**: `asyncio.gather` with `return_exceptions=True` for partial failure handling.

**Notes for the Coding AI**: Use `asyncio.gather(summary_task, actions_task, decisions_task, return_exceptions=True)`. Log any exceptions but don't fail the whole pipeline if one step fails. Wrap each result in a try/except.

---

### AI-007

**Title**: Transcription worker (faster-whisper)

**Objective**: Celery worker that transcribes audio chunks using faster-whisper.

**Dependencies**: INFRA-003, INFRA-004, DB-002

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/workers/transcription.py` (NEW)

- `docker-compose.dev.yml` (MODIFY — add whisper service or install in worker)

**Interfaces**:

```python

@celery_app.task

def transcribe_audio_chunk(meeting_id: str, chunk_key: str) -> dict:

    """Downloads audio from MinIO, runs Whisper, stores segments."""

    ...

```

**Acceptance Criteria**:

- [ ] Downloads audio chunk from MinIO

- [ ] Runs faster-whisper transcription

- [ ] Stores resulting segments in database

- [ ] Publishes new segments to Redis pub/sub for live UI

- [ ] Enqueues diarization task upon completion

- [ ] Handles Whisper failures gracefully (retry up to 3 times)

- [ ] Cleans up temp files

**Testing Requirements**:

- Integration: Upload audio, trigger task, verify segments stored

- Edge: Corrupted audio file

- Edge: Empty/silent audio

**Definition of Done**: Audio chunks are transcribed and stored reliably.

**Complexity**: L

**Estimated Time**: 4 hours

**Risks**: faster-whisper requires specific CUDA/CPU setup. Use CPU mode for development, GPU for production.

**Notes for the Coding AI**: Install `faster-whisper` in the worker container. Use `WhisperModel("large-v3", device="cpu", compute_type="int8")` for dev. Download audio to a temp file, transcribe, delete temp file in a `finally` block.

---

### AI-008

**Title**: Diarization worker (pyannote.audio)

**Objective**: Celery worker that performs speaker diarization on meeting audio.

**Dependencies**: AI-007, DB-003

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/workers/diarization.py` (NEW)

**Interfaces**:

```python

@celery_app.task

def diarize_meeting(meeting_id: str) -> dict:

    """Runs speaker diarization on meeting audio, assigns speakers to segments."""

    ...

```

**Acceptance Criteria**:

- [ ] Downloads full meeting audio from MinIO

- [ ] Runs pyannote.audio diarization pipeline

- [ ] Creates speaker records in database

- [ ] Updates segments with speaker assignments

- [ ] Publishes speaker updates via Redis pub/sub

**Testing Requirements**:

- Integration: Provide audio with multiple speakers, verify diarization

- Edge: Single speaker audio

- Edge: Very short audio (< 10s)

**Definition of Done**: Speaker diarization assigns speakers to transcript segments.

**Complexity**: L

**Estimated Time**: 4 hours

**Risks**: pyannote.audio requires a Hugging Face auth token for model download. Document this in setup guide.

**Notes for the Coding AI**: pyannote requires `HUGGINGFACE_TOKEN` env var. Use `Pipeline.from_pretrained("pyannote/speaker-diarization-3.1")`. Map diarization output timestamps to existing segments by overlap.

---

### AI-009

**Title**: Intelligence worker (triggers full pipeline on meeting end)

**Objective**: Celery worker that runs the full intelligence pipeline after a meeting ends.

**Dependencies**: AI-006, DB-001, DB-004

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/workers/intelligence.py` (NEW)

**Interfaces**:

```python

@celery_app.task

def process_meeting_intelligence(meeting_id: str) -> dict:

    """Runs full intelligence pipeline and stores results."""

    ...

```

**Acceptance Criteria**:

- [ ] Loads full transcript from database

- [ ] Runs intelligence pipeline

- [ ] Stores summary in meeting record

- [ ] Creates action item and decision records

- [ ] Updates meeting status to "completed"

- [ ] Enqueues embedding task

- [ ] Enqueues notification task

- [ ] On failure, sets meeting status to "failed"

**Testing Requirements**:

- Integration: Create meeting with segments, trigger intelligence, verify results

- Edge: Meeting with no segments (should fail gracefully)

**Definition of Done**: Full meeting intelligence runs automatically after meeting ends.

**Complexity**: M

**Estimated Time**: 3 hours

**Risks**: Pipeline failure should not leave meeting in inconsistent state. Use status transitions.

**Notes for the Coding AI**: Wrap in try/except. On success: status → "completed". On failure: status → "failed" with error message. Always enqueue notification (even on failure, to notify user).

---

### AI-010

**Title**: Embedding worker (chunk + embed + store)

**Objective**: Celery worker that chunks transcript text, generates real embeddings, and stores in pgvector.

**Dependencies**: AI-002, DB-005

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/workers/embedding.py` (NEW)

**Interfaces**:

```python

@celery_app.task

def embed_meeting(meeting_id: str) -> dict:

    """Chunks transcript and stores embeddings in pgvector."""

    ...

```

**Acceptance Criteria**:

- [ ] Chunks transcript into ~500-token windows with 50-token overlap

- [ ] Uses sentence boundary detection (not mid-word splitting)

- [ ] Generates embeddings via EmbeddingService (AI-002)

- [ ] Stores chunks + embeddings in meeting_embeddings table

- [ ] Idempotent — re-running deletes old embeddings first

**Testing Requirements**:

- Integration: Create meeting, run embedding worker, verify vectors stored

- Unit: Test chunking algorithm

**Definition of Done**: Meeting transcripts are chunked and embedded for semantic search.

**Complexity**: M

**Estimated Time**: 2.5 hours

**Risks**: Long meetings may produce many chunks (1-hour meeting ≈ ~50 chunks). Batch embedding API calls.

**Notes for the Coding AI**: Use `nltk.sent_tokenize()` for sentence splitting. Count tokens with `tiktoken`. Overlap 50 tokens between adjacent chunks for context continuity. Delete existing embeddings for the meeting before inserting new ones.

---

## Epic: RT — Real-Time Features

---

### RT-001

**Title**: WebSocket connection manager

**Objective**: Create a WebSocket server that clients connect to for real-time meeting updates.

**Dependencies**: INFRA-002, AUTH-002

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/realtime/__init__.py` (NEW)

- `server/app/realtime/manager.py` (NEW)

- `server/app/realtime/meeting_ws.py` (NEW)

- `server/app/main.py` (MODIFY — register WS route)

**Interfaces**:

```python

# Client connects to: ws://host/ws/meetings/{meeting_id}?token={jwt}

class ConnectionManager:

    async def connect(self, meeting_id: UUID, websocket: WebSocket) -> None: ...

    async def disconnect(self, meeting_id: UUID, websocket: WebSocket) -> None: ...

    async def broadcast(self, meeting_id: UUID, message: dict) -> None: ...

```

**Acceptance Criteria**:

- [ ] Client connects with JWT token in query param

- [ ] Invalid token rejected immediately

- [ ] Messages broadcast to all clients watching the same meeting

- [ ] Disconnection handled gracefully

- [ ] Connection count logged

**Testing Requirements**:

- Integration: Connect, receive broadcast, disconnect

- Edge: Invalid token, connection drop

**Definition of Done**: WebSocket connections work with auth.

**Complexity**: M

**Estimated Time**: 3 hours

**Risks**: WebSocket auth in query params is standard but token is visible in server logs. Consider short-lived tokens.

**Notes for the Coding AI**: Use FastAPI's built-in WebSocket support. Store connections in a `dict[UUID, list[WebSocket]]`. Use `try/finally` to ensure cleanup on disconnect.

---

### RT-002

**Title**: Redis pub/sub bridge for WebSocket events

**Objective**: Bridge Redis pub/sub to WebSocket broadcasts so workers can push events to clients.

**Dependencies**: RT-001, INFRA-003

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/realtime/manager.py` (MODIFY)

**Acceptance Criteria**:

- [ ] Workers publish events to Redis channel `meeting:{meeting_id}`

- [ ] WebSocket manager subscribes to relevant channels

- [ ] Events received from Redis are broadcast to connected WebSocket clients

- [ ] Subscribes/unsubscribes as clients connect/disconnect

**Testing Requirements**:

- Integration: Publish Redis message, verify WebSocket client receives it

**Definition of Done**: Workers can push real-time updates to frontend clients.

**Complexity**: M

**Estimated Time**: 2.5 hours

**Risks**: Redis pub/sub requires a dedicated connection per subscription. Use `aioredis` with a listener task.

**Notes for the Coding AI**: Run a background `asyncio.Task` that listens on Redis pub/sub. When a message arrives on channel `meeting:{id}`, call `manager.broadcast(id, message)`. Start the listener in FastAPI's lifespan handler.

---

### RT-003

**Title**: Live transcript streaming to frontend

**Objective**: Push new transcript segments to the frontend in real-time as they're transcribed.

**Dependencies**: RT-002, AI-007

**Affected Packages**: `server/`, `apps/web/`

**Files Expected to Change**:

- `server/app/workers/transcription.py` (MODIFY — publish to Redis)

- Frontend WebSocket integration (covered in WEB-\* tickets)

**Acceptance Criteria**:

- [ ] Transcription worker publishes each new segment to Redis

- [ ] Message format: `{"type": "segment", "data": SegmentPublic}`

- [ ] Frontend receives and appends to transcript display

- [ ] Latency from audio upload to display < 5 seconds

**Testing Requirements**:

- Integration: Upload audio chunk, verify WebSocket message received

**Definition of Done**: New transcript segments appear in real-time on the frontend.

**Complexity**: S

**Estimated Time**: 1.5 hours

**Risks**: None.

**Notes for the Coding AI**: In the transcription worker, after storing segments, publish each to Redis: `redis.publish(f"meeting:{meeting_id}", json.dumps(event))`. The WebSocket manager (RT-002) handles the rest.

---

## Epic: EXT — Chrome Extension

---

### EXT-001

**Title**: Chrome extension scaffold with TypeScript

**Objective**: Create the companion Chrome extension with Manifest V3 and TypeScript.

**Dependencies**: None (can be built in parallel)

**Affected Packages**: `apps/extension/`

**Files Expected to Change**:

- `apps/extension/manifest.json` (NEW)

- `apps/extension/src/background/service-worker.ts` (NEW)

- `apps/extension/src/popup/popup.html` (NEW)

- `apps/extension/src/popup/popup.ts` (NEW)

- `apps/extension/src/popup/popup.css` (NEW)

- `apps/extension/src/shared/types.ts` (NEW)

- `apps/extension/tsconfig.json` (NEW)

- `apps/extension/package.json` (NEW)

- `apps/extension/esbuild.config.ts` (NEW)

**Acceptance Criteria**:

- [ ] Extension loads in Chrome (developer mode)

- [ ] Popup shows app name and API key input

- [ ] Service worker registers successfully

- [ ] TypeScript compiles without errors

- [ ] Build output in `dist/`

**Testing Requirements**:

- Manual: Load unpacked extension, verify popup opens

**Definition of Done**: Extension shell loads in Chrome.

**Complexity**: M

**Estimated Time**: 2.5 hours

**Risks**: None.

**Notes for the Coding AI**: Minimal permissions: `"storage"`, `"tabCapture"`, `"activeTab"`. Do NOT request broad host permissions. Use esbuild for bundling. The extension stores only: API key and API host URL.

---

### EXT-002

**Title**: Tab audio capture with chrome.tabCapture

**Objective**: Capture audio from the active browser tab using the tabCapture API.

**Dependencies**: EXT-001

**Affected Packages**: `apps/extension/`

**Files Expected to Change**:

- `apps/extension/src/content/audio-capture.ts` (NEW)

- `apps/extension/src/background/service-worker.ts` (MODIFY)

- `apps/extension/src/shared/types.ts` (MODIFY)

**Acceptance Criteria**:

- [ ] Captures tab audio stream via `chrome.tabCapture.capture()`

- [ ] Records in 10-second WebM chunks using MediaRecorder

- [ ] Sends chunks to background service worker via chrome.runtime messages

- [ ] Handles stream errors gracefully

- [ ] Stop capture on user action or tab close

**Testing Requirements**:

- Manual: Start capture on a YouTube video, verify chunks generated

**Definition of Done**: Audio chunks are reliably captured from browser tabs.

**Complexity**: M

**Estimated Time**: 3 hours

**Risks**: `tabCapture` requires user gesture to activate. Handle the `chrome.tabCapture.capture` permission correctly.

**Notes for the Coding AI**: Use `MediaRecorder` with `mimeType: "audio/webm;codecs=opus"`. The 10-second interval is a balance between latency and overhead. Send chunks as `Blob` to service worker.

---

### EXT-003

**Title**: Upload audio chunks to server

**Objective**: Service worker uploads captured audio chunks to the server API.

**Dependencies**: EXT-002, API-002, AUTH-003

**Affected Packages**: `apps/extension/`

**Files Expected to Change**:

- `apps/extension/src/background/service-worker.ts` (MODIFY)

- `apps/extension/src/shared/api.ts` (NEW)

**Acceptance Criteria**:

- [ ] Audio chunks sent as `multipart/form-data` to `POST /api/v1/meetings/{id}/audio`

- [ ] API key from `chrome.storage.local` in `X-API-Key` header

- [ ] Retry on network failure (up to 3 retries with exponential backoff)

- [ ] Creates meeting on first chunk if not exists

- [ ] Shows upload status in popup badge

**Testing Requirements**:

- Manual: Capture audio, verify chunks arrive at server

- Edge: Network disconnection during upload

**Definition of Done**: Audio flows from browser to server reliably.

**Complexity**: M

**Estimated Time**: 2.5 hours

**Risks**: Service worker 5-minute timeout. Keep uploads small (10s chunks) and fast.

**Notes for the Coding AI**: Use `fetch()` with `FormData`. Implement retry with `setTimeout` and exponential backoff (1s, 2s, 4s). Set badge text to "●" (recording) or "!" (error).

---

## Epic: WEB — Next.js Web Application

---

### WEB-001

**Title**: Next.js project scaffold with TailwindCSS and shadcn/ui

**Objective**: Create the Next.js web application with the design system.

**Dependencies**: None (can start in parallel)

**Affected Packages**: `apps/web/`

**Files Expected to Change**:

- `apps/web/` (entire directory — NEW)

**Acceptance Criteria**:

- [ ] `npm run dev` starts Next.js on port 3000

- [ ] TailwindCSS configured with dark mode

- [ ] shadcn/ui initialized

- [ ] Layout component with sidebar navigation

- [ ] Design tokens match V1's premium dark theme (Zinc palette, Indigo accents)

- [ ] TypeScript strict mode enabled

- [ ] `@` path alias configured

**Testing Requirements**:

- Manual: Start dev server, verify page renders

**Definition of Done**: Next.js app runs with the design system configured.

**Complexity**: M

**Estimated Time**: 2 hours

**Risks**: None.

**Notes for the Coding AI**: Use `npx create-next-app@latest --typescript --tailwind --eslint --app --src-dir=false`. Port the color palette from V1's `index.css`: `--bg-base: #09090b`, `--accent-primary: #6366f1`, etc. Configure these as Tailwind theme colors.

---

### WEB-002

**Title**: Authentication pages (Login, Register)

**Objective**: Build login and registration pages with form validation.

**Dependencies**: WEB-001, AUTH-001

**Affected Packages**: `apps/web/`

**Files Expected to Change**:

- `apps/web/app/(auth)/login/page.tsx` (NEW)

- `apps/web/app/(auth)/register/page.tsx` (NEW)

- `apps/web/app/(auth)/layout.tsx` (NEW)

- `apps/web/lib/auth.ts` (NEW)

- `apps/web/hooks/use-auth.ts` (NEW)

**Acceptance Criteria**:

- [ ] Login form with email + password

- [ ] Register form with email + password + name

- [ ] Client-side validation (email format, password length)

- [ ] Error display for invalid credentials

- [ ] Redirect to dashboard on success

- [ ] Loading states on submit

**Testing Requirements**:

- Manual: Register, login, verify redirect

- Edge: Wrong password, duplicate email

**Definition of Done**: Users can register and log in.

**Complexity**: M

**Estimated Time**: 3 hours

**Risks**: None.

**Notes for the Coding AI**: Use shadcn/ui `Input`, `Button`, `Card` components. Use React Hook Form for form state. Store JWT in httpOnly cookie via server response (set by FastAPI).

---

### WEB-003

**Title**: Meeting list page with infinite scroll

**Objective**: Display the user's meetings in a card list with infinite scroll.

**Dependencies**: WEB-001, WEB-002, API-001

**Affected Packages**: `apps/web/`

**Files Expected to Change**:

- `apps/web/app/(dashboard)/meetings/page.tsx` (NEW)

- `apps/web/components/meetings/meeting-card.tsx` (NEW)

- `apps/web/hooks/use-meetings.ts` (NEW)

**Acceptance Criteria**:

- [ ] Displays meetings in reverse chronological order

- [ ] Each card shows: title, date, platform, status, duration

- [ ] Infinite scroll loads more meetings

- [ ] Status badge with colors (live=green, processing=yellow, completed=blue, failed=red)

- [ ] Empty state when no meetings

- [ ] Loading skeletons while fetching

- [ ] Click navigates to meeting detail

**Testing Requirements**:

- Manual: View meeting list, scroll to load more

- Edge: No meetings, many meetings

**Definition of Done**: Users can browse their meeting history.

**Complexity**: M

**Estimated Time**: 3 hours

**Risks**: None.

**Notes for the Coding AI**: Use TanStack Query `useInfiniteQuery` for pagination. Use Intersection Observer for infinite scroll trigger. Use shadcn/ui `Badge` for status.

---

### WEB-004

**Title**: Meeting detail page with transcript, summary, and actions

**Objective**: Display a single meeting with all its intelligence.

**Dependencies**: WEB-003, API-001

**Affected Packages**: `apps/web/`

**Files Expected to Change**:

- `apps/web/app/(dashboard)/meetings/[id]/page.tsx` (NEW)

- `apps/web/components/meetings/transcript-view.tsx` (NEW)

- `apps/web/components/meetings/summary-panel.tsx` (NEW)

- `apps/web/components/meetings/action-items-panel.tsx` (NEW)

- `apps/web/components/meetings/speaker-list.tsx` (NEW)

**Acceptance Criteria**:

- [ ] Tab layout: Transcript | Summary | Action Items | Decisions

- [ ] Transcript shows speaker-attributed segments with timestamps

- [ ] Summary tab shows executive summary + key points

- [ ] Action items tab shows items with status toggles

- [ ] Speaker list sidebar with speaking time

- [ ] Click on timestamp scrolls transcript

- [ ] 404 page for non-existent meeting

**Testing Requirements**:

- Manual: View meeting with all tabs

- Edge: Meeting still processing (show progress state)

**Definition of Done**: Full meeting detail view is functional.

**Complexity**: L

**Estimated Time**: 5 hours

**Risks**: Complex layout. Use shadcn/ui Tabs component.

**Notes for the Coding AI**: Use a two-column layout: main content (transcript/summary) on left, sidebar (speakers, actions) on right. Use shadcn/ui `Tabs`, `ScrollArea`, `Badge`, `Checkbox` components. Animate tab transitions with Framer Motion.

---

### WEB-005

**Title**: Search page with semantic results

**Objective**: Build the search interface for querying across all meetings.

**Dependencies**: WEB-001, WEB-002, API-004

**Affected Packages**: `apps/web/`

**Files Expected to Change**:

- `apps/web/app/(dashboard)/search/page.tsx` (NEW)

- `apps/web/components/search/search-bar.tsx` (NEW)

- `apps/web/components/search/search-result.tsx` (NEW)

- `apps/web/hooks/use-search.ts` (NEW)

**Acceptance Criteria**:

- [ ] Search bar with debounced input (300ms)

- [ ] Results show: meeting title, matched text snippet, similarity score, date

- [ ] Click on result navigates to meeting detail

- [ ] Loading state during search

- [ ] "No results" state

- [ ] Keyboard shortcut: Cmd+K opens search

**Testing Requirements**:

- Manual: Search for a topic, verify relevant results appear

- Edge: No results, very long query

**Definition of Done**: Users can search their meeting history semantically.

**Complexity**: M

**Estimated Time**: 3 hours

**Risks**: None.

**Notes for the Coding AI**: Use shadcn/ui `Dialog` for Cmd+K modal. Highlight the matched text snippet in results. Use TanStack Query with `enabled: query.length > 2`.

---

### WEB-006

**Title**: Chat interface with streaming responses

**Objective**: Build a RAG chat interface for asking questions about meetings.

**Dependencies**: WEB-001, WEB-002, API-005

**Affected Packages**: `apps/web/`

**Files Expected to Change**:

- `apps/web/app/(dashboard)/chat/page.tsx` (NEW)

- `apps/web/components/chat/chat-message.tsx` (NEW)

- `apps/web/components/chat/chat-input.tsx` (NEW)

- `apps/web/hooks/use-chat.ts` (NEW)

**Acceptance Criteria**:

- [ ] Chat bubbles for user and assistant messages

- [ ] Streaming response display (token by token)

- [ ] Source citations (links to meetings used as context)

- [ ] Markdown rendering in assistant messages

- [ ] Auto-scroll to latest message

- [ ] Loading indicator during generation

- [ ] Empty state with example questions

**Testing Requirements**:

- Manual: Ask a question, verify streaming response

- Edge: No meeting data, server error

**Definition of Done**: Users can chat with their meeting history.

**Complexity**: L

**Estimated Time**: 4 hours

**Risks**: SSE parsing can be tricky. Use a helper library or manual EventSource parsing.

**Notes for the Coding AI**: Use `fetch()` with `ReadableStream` for SSE consumption. Parse `data: {...}\n\n` events manually. Use `react-markdown` for rendering assistant messages. Port the premium chat UI design from V1's `ChatView.jsx` and `index.css`.

---

### WEB-007

**Title**: Settings page with API key management

**Objective**: Allow users to configure their account and manage API keys for the extension.

**Dependencies**: WEB-001, WEB-002, AUTH-003

**Affected Packages**: `apps/web/`

**Files Expected to Change**:

- `apps/web/app/(dashboard)/settings/page.tsx` (NEW)

- `apps/web/components/settings/api-key-manager.tsx` (NEW)

- `apps/web/components/settings/llm-config.tsx` (NEW)

**Acceptance Criteria**:

- [ ] Display user profile (name, email)

- [ ] Generate new API key (shown once)

- [ ] List active API keys (prefix only)

- [ ] Revoke API key

- [ ] LLM provider configuration (model selection)

- [ ] Success/error toasts for actions

**Testing Requirements**:

- Manual: Generate key, revoke key, change settings

**Definition of Done**: Users can manage their account and extension API keys.

**Complexity**: M

**Estimated Time**: 3 hours

**Risks**: None.

**Notes for the Coding AI**: Use shadcn/ui `Card`, `Input`, `Button`, `Toast` components. Show API key only once in a modal with a copy button. After closing, only show the prefix.

---

### WEB-008

**Title**: Live meeting view with real-time transcript

**Objective**: Display a live meeting view with real-time transcript updates via WebSocket.

**Dependencies**: WEB-004, RT-001, RT-003

**Affected Packages**: `apps/web/`

**Files Expected to Change**:

- `apps/web/app/(dashboard)/meetings/[id]/live/page.tsx` (NEW)

- `apps/web/hooks/use-meeting-websocket.ts` (NEW)

- `apps/web/components/meetings/live-transcript.tsx` (NEW)

**Acceptance Criteria**:

- [ ] Connects to WebSocket `ws://host/ws/meetings/{id}?token={jwt}`

- [ ] Displays new segments as they arrive

- [ ] Shows speaker label on each segment

- [ ] Auto-scrolls to latest segment

- [ ] Reconnects automatically on connection drop

- [ ] Shows connection status indicator (connected/reconnecting/disconnected)

**Testing Requirements**:

- Manual: Start a meeting capture, view live transcript

- Edge: Network disconnection, reconnection

**Definition of Done**: Users see live transcript during meetings.

**Complexity**: L

**Estimated Time**: 4 hours

**Risks**: WebSocket reconnection logic. Use exponential backoff.

**Notes for the Coding AI**: Use native `WebSocket` API (not socket.io). Implement reconnection with backoff: 1s, 2s, 4s, 8s, max 30s. Store segments in Zustand store for persistence across re-renders. Show a colored dot for connection status.

---

### WEB-009

**Title**: Action items dashboard (cross-meeting view)

**Objective**: A dedicated page showing all open action items across all meetings.

**Dependencies**: WEB-001, API-003

**Affected Packages**: `apps/web/`

**Files Expected to Change**:

- `apps/web/app/(dashboard)/action-items/page.tsx` (NEW)

- `apps/web/components/action-items/action-item-row.tsx` (NEW)

**Acceptance Criteria**:

- [ ] Lists all open action items across meetings

- [ ] Filter by status: open, in_progress, completed

- [ ] Each item shows: text, meeting link, assignee, deadline

- [ ] Checkbox to mark complete

- [ ] Optimistic update on status change

- [ ] Empty state

**Testing Requirements**:

- Manual: View action items, mark as complete

**Definition of Done**: Users can manage action items in one place.

**Complexity**: M

**Estimated Time**: 2.5 hours

**Risks**: None.

**Notes for the Coding AI**: Use TanStack Query `useMutation` with optimistic updates. Use shadcn/ui `Checkbox` and `Table` components.

---

## Epic: SEARCH — Search & Knowledge

---

### SEARCH-001

**Title**: Hybrid search (semantic + full-text)

**Objective**: Combine pgvector semantic search with PostgreSQL full-text search for best results.

**Dependencies**: API-004, DB-005

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/services/search_service.py` (MODIFY)

- `server/app/db/repositories/search_repo.py` (MODIFY)

**Acceptance Criteria**:

- [ ] Short queries (< 3 words) use full-text search

- [ ] Longer queries use semantic search

- [ ] Results de-duplicated and ranked by combined score

- [ ] Full-text search uses PostgreSQL `tsvector` + `tsquery`

**Testing Requirements**:

- Integration: Test keyword search, semantic search, and mixed results

**Definition of Done**: Search returns high-quality results for both keyword and semantic queries.

**Complexity**: M

**Estimated Time**: 2.5 hours

**Risks**: Ranking algorithm tuning. Start with simple weighted average (0.7 _ semantic + 0.3 _ text relevance).

**Notes for the Coding AI**: Add a `search_vector` generated column on the `segments` table. Use `ts_rank` for text search scoring. Normalize both scores to [0, 1] before combining.

---

## Epic: INT — Integrations

---

### INT-001

**Title**: Email report generation and sending

**Objective**: Generate and send HTML email reports after meetings complete.

**Dependencies**: AI-009

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/workers/notification.py` (NEW)

- `server/app/services/notification_service.py` (NEW)

- `server/app/templates/email_report.html` (NEW)

**Acceptance Criteria**:

- [ ] HTML email template with meeting summary, action items, decisions

- [ ] Sent via Resend API (or configurable SMTP)

- [ ] Sent to the meeting creator

- [ ] Email includes "View Meeting" link

- [ ] Handles email send failure gracefully (log, don't retry)

**Testing Requirements**:

- Unit: Test template rendering with sample data

- Integration: Verify email send (use Resend test key)

**Definition of Done**: Users receive email summaries after meetings.

**Complexity**: M

**Estimated Time**: 3 hours

**Risks**: Email deliverability. Use a reputable service (Resend, SendGrid).

**Notes for the Coding AI**: Use Jinja2 for HTML template. Use the `resend` Python package. Keep the template simple and mobile-responsive. Include: meeting title, date, executive summary, action items list, "View in Watchn't" button.

---

## Epic: TEST — Testing Infrastructure

---

### TEST-001

**Title**: Test fixtures and conftest setup

**Objective**: Create shared test fixtures for database, Redis, and authenticated requests.

**Dependencies**: INFRA-002, AUTH-001

**Affected Packages**: `server/tests/`

**Files Expected to Change**:

- `server/tests/conftest.py` (NEW)

- `server/tests/fixtures/sample_data.py` (NEW)

**Acceptance Criteria**:

- [ ] `db_session` fixture: provides async database session, rolls back after each test

- [ ] `client` fixture: provides authenticated `AsyncClient` (httpx)

- [ ] `redis` fixture: provides Redis connection, flushes after each test

- [ ] `sample_meeting` fixture: creates a meeting with segments

- [ ] All fixtures use testcontainers for PostgreSQL and Redis

**Testing Requirements**:

- Verify fixtures work by writing one passing test per fixture

**Definition of Done**: Test infrastructure enables writing integration tests easily.

**Complexity**: M

**Estimated Time**: 3 hours

**Risks**: testcontainers requires Docker. CI must have Docker access.

**Notes for the Coding AI**: Use `pytest-asyncio` for async tests. Use `httpx.AsyncClient` with FastAPI's `TestClient`. Use `testcontainers-python` for PostgreSQL and Redis.

---

### TEST-002

**Title**: API integration tests for meeting CRUD

**Objective**: Write integration tests for all meeting API endpoints.

**Dependencies**: TEST-001, API-001

**Affected Packages**: `server/tests/`

**Files Expected to Change**:

- `server/tests/integration/test_meetings.py` (NEW)

**Acceptance Criteria**:

- [ ] Test create meeting

- [ ] Test list meetings with pagination

- [ ] Test get meeting detail

- [ ] Test update meeting

- [ ] Test delete meeting

- [ ] Test user isolation (user A cannot see user B's meetings)

- [ ] Test 404 for non-existent meeting

- [ ] Test 401 for unauthenticated request

**Testing Requirements**: This ticket IS the tests.

**Definition of Done**: All meeting endpoints have integration test coverage.

**Complexity**: M

**Estimated Time**: 3 hours

**Risks**: None.

**Notes for the Coding AI**: Use `pytest.mark.asyncio` for all tests. Use the `client` fixture from TEST-001. Assert both response status codes and response body shape.

---

### TEST-003

**Title**: AI prompt unit tests

**Objective**: Test prompt assembly and output parsing for all AI prompts.

**Dependencies**: AI-003, AI-004, AI-005

**Affected Packages**: `server/tests/`

**Files Expected to Change**:

- `server/tests/unit/test_prompts.py` (NEW)

**Acceptance Criteria**:

- [ ] Test summary prompt builds correctly

- [ ] Test action items prompt builds correctly

- [ ] Test decisions prompt builds correctly

- [ ] Test output parsing with sample LLM responses

- [ ] Test output parsing with malformed responses (error handling)

- [ ] Mock all LLM calls — no real API calls in tests

**Testing Requirements**: This ticket IS the tests.

**Definition of Done**: All AI prompts have unit test coverage.

**Complexity**: M

**Estimated Time**: 2.5 hours

**Risks**: None.

**Notes for the Coding AI**: Use `unittest.mock.patch` to mock litellm. Provide realistic sample LLM responses as test fixtures. Test both happy path and error cases (malformed JSON, missing fields).

---

## Epic: OBS — Observability

---

### OBS-001

**Title**: Structured logging with request IDs

**Objective**: Implement structured JSON logging with request correlation IDs.

**Dependencies**: INFRA-002

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/core/logging.py` (NEW)

- `server/app/main.py` (MODIFY — add logging middleware)

**Acceptance Criteria**:

- [ ] All logs are JSON-formatted

- [ ] Each request has a unique `request_id`

- [ ] `request_id` included in all log lines for that request

- [ ] Log level configurable via env var

- [ ] Access logs: method, path, status, duration

- [ ] No sensitive data in logs (no passwords, no API keys)

**Testing Requirements**:

- Unit: Test log formatter produces valid JSON

- Manual: Make API call, verify structured log output

**Definition of Done**: All server logs are structured and correlated.

**Complexity**: M

**Estimated Time**: 2 hours

**Risks**: None.

**Notes for the Coding AI**: Use `structlog` for structured logging. Add a FastAPI middleware that generates `request_id` (uuid4), binds it to the structlog context, and logs request completion. Configure via `LOG_LEVEL` env var.

---

### OBS-002

**Title**: AI observability — token tracking and cost estimation

**Objective**: Log token usage and estimated cost for every LLM call.

**Dependencies**: AI-001, OBS-001

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/ai/llm.py` (MODIFY — add token logging)

- `server/app/api/v1/stats.py` (NEW — usage stats endpoint)

**Acceptance Criteria**:

- [ ] Every LLM call logs: model, input_tokens, output_tokens, latency_ms, estimated_cost

- [ ] Cost estimated from model pricing table

- [ ] `GET /api/v1/stats/usage` returns aggregate token usage for current user

- [ ] Daily usage tracking in database

**Testing Requirements**:

- Unit: Test cost estimation function

- Integration: Make LLM call, verify usage logged

**Definition of Done**: LLM usage is tracked and queryable.

**Complexity**: M

**Estimated Time**: 2.5 hours

**Risks**: litellm provides token counts in response. Use `response.usage.prompt_tokens` and `response.usage.completion_tokens`.

**Notes for the Coding AI**: Create a simple `llm_usage` table: `(user_id, model, input_tokens, output_tokens, estimated_cost, created_at)`. Insert after every LLM call. The stats endpoint aggregates by day/model.

---

## Epic: SEC — Security Hardening

---

### SEC-001

**Title**: CORS, rate limiting, and security headers

**Objective**: Add CORS policy, rate limiting, and security headers to the API.

**Dependencies**: INFRA-002

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/main.py` (MODIFY)

- `server/app/core/rate_limit.py` (NEW)

**Acceptance Criteria**:

- [ ] CORS allows only configured origins (not `*`)

- [ ] Rate limiting: 60 requests/minute per user (Redis-backed)

- [ ] 429 response when rate limit exceeded

- [ ] Security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`

- [ ] Request body size limited to 100MB

**Testing Requirements**:

- Integration: Verify CORS headers on response

- Integration: Exceed rate limit, verify 429

- Manual: Verify security headers with curl

**Definition of Done**: API has basic security hardening.

**Complexity**: M

**Estimated Time**: 2 hours

**Risks**: Rate limiting key design. Use `rate:{user_id}:{minute_bucket}` pattern.

**Notes for the Coding AI**: Use FastAPI's `CORSMiddleware` with explicit `allow_origins`. For rate limiting, use a custom middleware with Redis INCR + EXPIRE pattern. Do not use a third-party rate limiting library unless necessary.

---

### SEC-002

**Title**: Input validation on all endpoints

**Objective**: Add Pydantic validation to all request bodies, query params, and path params.

**Dependencies**: API-001 through API-006

**Affected Packages**: `server/`

**Files Expected to Change**:

- All `server/app/api/v1/*.py` files (MODIFY)

- `server/app/models/*.py` (MODIFY — add validators)

**Acceptance Criteria**:

- [ ] All request bodies validated via Pydantic

- [ ] String fields have max_length constraints

- [ ] Numeric fields have reasonable min/max bounds

- [ ] UUID path params validated as UUID format

- [ ] Invalid input returns 422 with descriptive error

- [ ] No raw SQL string interpolation anywhere

**Testing Requirements**:

- Integration: Submit invalid data to each endpoint, verify 422

**Definition of Done**: All API inputs are validated before processing.

**Complexity**: M

**Estimated Time**: 3 hours

**Risks**: None.

**Notes for the Coding AI**: Use `Field(max_length=500)`, `Field(ge=1, le=100)`, etc. Use `constr(pattern=...)` for formatted strings. Pydantic V2 validators with `@field_validator`.

---

## Epic: DOC — Documentation

---

### DOC-001

**Title**: API documentation with OpenAPI

**Objective**: Ensure all API endpoints have comprehensive OpenAPI documentation.

**Dependencies**: All API-\* tickets

**Affected Packages**: `server/`

**Files Expected to Change**:

- All `server/app/api/v1/*.py` files (MODIFY — add docstrings)

- All `server/app/models/*.py` files (MODIFY — add Field descriptions)

**Acceptance Criteria**:

- [ ] Every endpoint has a docstring that appears in Swagger UI

- [ ] Every Pydantic model field has a `description`

- [ ] Example values provided for request/response models

- [ ] Authentication requirements documented per endpoint

- [ ] `/docs` shows a usable, complete API reference

**Testing Requirements**:

- Manual: Open `/docs`, verify all endpoints documented

**Definition of Done**: A new developer can understand the API from Swagger alone.

**Complexity**: M

**Estimated Time**: 2.5 hours

**Risks**: None.

**Notes for the Coding AI**: Use FastAPI's built-in OpenAPI generation. Add `summary` and `description` to every `@router.get/post/etc()` decorator. Use `schema_extra` in Pydantic models for examples.

---

### DOC-002

**Title**: Developer setup guide (README)

**Objective**: Write a comprehensive README with setup instructions.

**Dependencies**: INFRA-001

**Affected Packages**: Root directory

**Files Expected to Change**:

- `README.md` (NEW or REWRITE)

**Acceptance Criteria**:

- [ ] Prerequisites listed (Docker, Node.js 20+, Python 3.11+)

- [ ] One-command setup: `make dev`

- [ ] Environment variable documentation

- [ ] Architecture overview diagram

- [ ] How to run tests

- [ ] How to build the extension

- [ ] How to create database migrations

- [ ] Troubleshooting section

**Testing Requirements**:

- Manual: Follow the README on a clean machine, verify everything works

**Definition of Done**: A new engineer can set up the project from scratch using only the README.

**Complexity**: M

**Estimated Time**: 2 hours

**Risks**: None.

**Notes for the Coding AI**: Keep it concise. Use code blocks for all commands. Include a "Quick Start" section that gets someone running in < 5 minutes.

---

## Epic: MAIL — Notification System

---

### MAIL-001

**Title**: Meeting end detection and pipeline trigger

**Objective**: Detect when a meeting has ended and trigger the intelligence pipeline.

**Dependencies**: API-002, AI-009

**Affected Packages**: `server/`

**Files Expected to Change**:

- `server/app/api/v1/meetings.py` (MODIFY — add end-meeting endpoint)

- `server/app/services/meeting_service.py` (MODIFY)

**Interfaces**:

```

POST /api/v1/meetings/{id}/end

Response: { status: "processing" }

```

**Acceptance Criteria**:

- [ ] Sets meeting `ended_at` timestamp

- [ ] Updates status to "processing"

- [ ] Calculates and stores `duration_sec`

- [ ] Enqueues intelligence worker task

- [ ] Returns immediately (async processing)

- [ ] Idempotent — calling end twice doesn't double-process

**Testing Requirements**:

- Integration: End a meeting, verify status transition and task enqueued

- Edge: End a meeting with no segments

**Definition of Done**: Meeting end triggers the full post-processing pipeline.

**Complexity**: S

**Estimated Time**: 1.5 hours

**Risks**: Race condition if end is called while audio is still uploading. Use a lock or debounce.

**Notes for the Coding AI**: Use Redis lock `lock:meeting:{id}` with 30-second TTL to prevent concurrent end processing. If lock is held, return 409.

---

## Remaining Tickets (Summarized)

The following tickets follow the same format. They are listed in summary form for space.

| ID | Title | Dependencies | Complexity | Est. Time |

|---|---|---|---|---|

| **PERF-001** | Add Redis caching for meeting list API | API-001, INFRA-003 | S | 1.5h |

| **PERF-002** | Add database connection pooling configuration | INFRA-002 | S | 1h |

| **PERF-003** | Implement lazy loading for Next.js pages | WEB-001 | S | 1.5h |

| **PERF-004** | Add response compression (gzip/brotli) | INFRA-002 | S | 1h |

| **SEC-003** | Add CSRF protection for web app | WEB-002 | S | 1.5h |

| **SEC-004** | Audit logging for data access | OBS-001, AUTH-002 | M | 2.5h |

| **SEC-005** | PII detection in transcripts | AI-007 | M | 3h |

| **WEB-010** | Sidebar navigation component | WEB-001 | S | 2h |

| **WEB-011** | Toast notification system | WEB-001 | S | 1h |

| **WEB-012** | Dark/light mode toggle | WEB-001 | S | 1.5h |

| **WEB-013** | Responsive mobile layout | WEB-001 | M | 3h |

| **WEB-014** | Keyboard shortcuts (Cmd+K search, etc.) | WEB-005 | S | 2h |

| **WEB-015** | Skeleton loading components | WEB-001 | S | 1.5h |

| **EXT-004** | Extension popup with capture status | EXT-001 | S | 2h |

| **EXT-005** | Extension settings (API key, server URL) | EXT-001 | S | 1.5h |

| **INT-002** | Slack notification integration | INT-001 | M | 3h |

| **INT-003** | Google Calendar webhook integration | AUTH-001 | L | 5h |

| **INT-004** | Calendar event → auto-create meeting | INT-003 | M | 3h |

| **TEST-004** | Auth integration tests | TEST-001, AUTH-001 | M | 2h |

| **TEST-005** | Search integration tests | TEST-001, API-004 | M | 2h |

| **TEST-006** | Worker integration tests | TEST-001, AI-007 | M | 3h |

| **TEST-007** | WebSocket integration tests | TEST-001, RT-001 | M | 2.5h |

| **TEST-008** | Extension build verification test | EXT-001 | S | 1h |

| **DOC-003** | Architecture decision records (ADRs) | None | M | 2h |

| **DOC-004** | Deployment guide | INFRA-001 | M | 2h |

| **OBS-003** | Health check endpoint (deep) | INFRA-002 | S | 1h |

| **DB-006** | Add organizations table for multi-tenancy | AUTH-001 | M | 2.5h |

| **DB-007** | Add tags table and meeting_tags junction | DB-001 | S | 1.5h |

| **API-007** | User profile endpoint | AUTH-001 | S | 1.5h |

| **API-008** | Meeting statistics endpoint | DB-001 | M | 2h |

| **AI-011** | Context classification prompt | AI-001 | S | 1.5h |

| **AI-012** | Transcript chunking utility | None | S | 1.5h |

| **RT-004** | Live summary push (periodic during meeting) | RT-002, AI-006 | L | 4h |

| **SEARCH-002** | Full-text search on segments | DB-002 | M | 2h |

| **SEARCH-003** | Search result highlighting | API-004 | S | 1.5h |

| **SEARCH-004** | Meeting similarity (find related meetings) | DB-005 | M | 2.5h |

---

## Ticket Count Summary

| Epic | Count | Total Estimated Hours |

|---|---|---|

| INFRA | 5 | 8.5h |

| AUTH | 3 | 6.5h |

| DB | 7 | 13.5h |

| API | 8 | 22h |

| AI | 12 | 31h |

| RT | 4 | 10h |

| EXT | 5 | 12h |

| WEB | 15 | 40h |

| SEARCH | 4 | 9h |

| INT | 5 | 16h |

| TEST | 8 | 20h |

| OBS | 3 | 6.5h |

| SEC | 5 | 12h |

| PERF | 4 | 5h |

| DOC | 4 | 8.5h |

| MAIL | 1 | 1.5h |

| **TOTAL** | **93 detailed + 40 summarized = ~133** | **~222 hours** |

---

# Builder's Guide for Coding LLMs

---

## How to Use This Backlog

You are a coding AI that will implement this system one ticket at a time. Follow these rules exactly.

### Rule 1: One Ticket at a Time

Implement exactly one ticket per session. Do not combine tickets. Do not start the next ticket until the current one is complete and all tests pass.

### Rule 2: Read the Full Ticket Before Starting

Every ticket includes: objective, background, dependencies, interfaces, acceptance criteria, testing requirements, and implementation notes. Read all of these before writing any code.

### Rule 3: Check Dependencies First

If a ticket lists dependencies, verify that those tickets have been completed. If they haven't, **stop and report the dependency instead of improvising**. Do not create stub implementations or mock the dependency.

### Rule 4: Follow the Interfaces Exactly

The interfaces defined in each ticket are **contracts**. Do not rename functions, change parameter types, or alter return types without explicit approval. Other tickets depend on these interfaces.

### Rule 5: Never Modify Architecture

This RFC defines the architecture. If you encounter a situation where the architecture seems wrong, **document your concern in a code comment** and proceed with the specified design. Do not redesign modules, move files between packages, or change dependency directions.

### Rule 6: Write Tests

Every ticket specifies testing requirements. Write these tests. They are not optional. Tests must pass before the ticket is considered complete.

### Rule 7: Keep Changes Scoped

Only modify files listed in "Files Expected to Change." If you need to modify additional files, document why. Avoid cascading changes across packages.

### Rule 8: Follow Coding Standards

- **Python**: Type hints, docstrings, async-first, ruff-formatted

- **TypeScript**: Strict mode, named exports, no `any`

- **SQL**: Parameterized queries, snake_case, UUIDs

- **Git**: Conventional commit messages

### Rule 9: Preserve Existing Code

When modifying existing files, do not rewrite code that is not related to your ticket. Preserve all existing tests, comments, and functionality.

### Rule 10: Leave the Repo Buildable

After completing a ticket, the entire repository must:

- Build without errors (`make build`)

- Pass all existing tests (`make test`)

- Have no new linting errors (`make lint`)

- Start successfully (`make dev`)

### Rule 11: Document Deviations

If you deviate from the specification for any reason, add a comment in the code:

```python

# DEVIATION from RFC: [reason]

# Ticket: AI-003

# Original spec: ...

# Actual implementation: ...

# Reason: ...

```

### Rule 12: No Speculative Abstractions

Do not create abstractions, utility functions, or patterns that are not required by the current ticket. Do not "future-proof" code. Follow YAGNI (You Aren't Gonna Need It).

### Rule 13: Error Handling

- Catch specific exceptions, not bare `except:`

- Log errors with context (ticket ID, function name, parameters)

- Return appropriate HTTP status codes (400, 401, 403, 404, 422, 500)

- Never silently swallow errors

### Rule 14: Naming

- Files: `snake_case.py` (Python), `kebab-case.tsx` (React)

- Functions: `snake_case` (Python), `camelCase` (TypeScript)

- Classes: `PascalCase` (both)

- Constants: `UPPER_SNAKE_CASE` (both)

- Database: `snake_case` tables and columns

- API routes: `kebab-case` paths

### Rule 15: When in Doubt

If the specification is ambiguous, choose the simplest implementation that satisfies the acceptance criteria. Document your interpretation in a code comment.

---

## Recommended Implementation Order

Start with the critical path. This ordering minimizes blocked work:

```

1. INFRA-001  (Docker Compose)

2. INFRA-002  (FastAPI + Alembic)

3. AUTH-001   (Users + Registration)

4. AUTH-002   (JWT Middleware)

5. DB-001     (Meeting Model)

6. API-001    (Meeting CRUD API)

7. TEST-001   (Test Fixtures)

8. TEST-002   (Meeting API Tests)

9. INFRA-003  (Celery + Redis)

10. AI-001    (LLM Abstraction)

11. AI-002    (Embedding Service)

12. DB-002    (Segments)

13. DB-003    (Speakers)

14. DB-004    (Action Items)

15. DB-005    (Embeddings Table)

16. WEB-001   (Next.js Scaffold)

17. WEB-002   (Auth Pages)

18. WEB-003   (Meeting List)

19. API-002   (Audio Upload)

20. AI-007    (Transcription Worker)

```

After these 20 tickets, you have a functional system where meetings can be created, audio uploaded, transcribed, and viewed.

---

> **End of Specification**

> This document is the single source of truth for the Watchn't V2 engineering effort.

> All implementation work should reference this document.

> Updates to this document require CTO approval.
