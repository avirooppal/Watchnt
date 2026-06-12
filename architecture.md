# Watchn't — Full System Architecture (Self-Hosted)

> Browser-native, bot-free agentic knowledge capture platform.
> MVP scope: English YouTube videos → structured knowledge library.
> Stack: Chrome Extension · Hono API Server · PostgreSQL + pgvector · Docker Compose · Anthropic API.
> Zero external SaaS dependencies. Runs entirely on your own machine or a $5 VPS.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [High-Level System Map](#high-level-system-map)
3. [File & Folder Structure](#file--folder-structure)
4. [Layer-by-Layer Breakdown](#layer-by-layer-breakdown)
   - [Extension Shell](#1-extension-shell)
   - [Content Scripts](#2-content-scripts)
   - [Background Service Worker](#3-background-service-worker)
   - [Agent Pipeline](#4-agent-pipeline)
   - [Storage Layer](#5-storage-layer)
   - [Popup UI](#6-popup-ui)
   - [Knowledge Library App](#7-knowledge-library-app-side-panel--tab)
   - [API Server](#8-api-server-hononode)
   - [Database](#9-database-postgresql--pgvector)
   - [Docker Compose](#10-docker-compose)
5. [Agent Definitions](#agent-definitions)
6. [State Architecture](#state-architecture)
7. [Data Flow — End to End](#data-flow--end-to-end)
8. [Database Schema](#database-schema)
9. [API Routes](#api-routes)
10. [Service Connection Map](#service-connection-map)
11. [Deployment Options](#deployment-options)
12. [Expansion Targets Post-MVP](#expansion-targets-post-mvp)

---

## Design Philosophy

Watchn't is built on three constraints that shape every architectural decision:

| Constraint            | Implication                                                                   |
| --------------------- | ----------------------------------------------------------------------------- |
| **No bots**           | Must read transcripts from the DOM — no server-side audio processing          |
| **No disruption**     | All capture happens passively; zero user action required after setup          |
| **Fully self-hosted** | No Supabase, no Firebase, no managed services — your data stays on your infra |

The system has two parts: the **Chrome extension** (the capture + UI layer) and the **backend stack** (API server + Postgres + pgvector running in Docker). They communicate over HTTP using a static API key. No cloud required.

---

## High-Level System Map

```
┌──────────────────────────────────────────────────────────────────┐
│                          BROWSER                                 │
│                                                                  │
│  ┌──────────────┐  DOM events   ┌──────────────────────────┐    │
│  │ Content       │ ────────────▶ │ Background Service Worker │    │
│  │ Scripts       │              │ (Orchestrator)            │    │
│  │ (per-tab)     │ ◀──────────── │                          │    │
│  └──────────────┘  instructions └────────────┬─────────────┘    │
│                                              │                   │
│  ┌──────────────┐                            │ chrome.runtime   │
│  │ Popup UI     │ ◀──────────────────────────┤                   │
│  └──────────────┘                            │                   │
│                                              │                   │
│  ┌──────────────┐                            │                   │
│  │ Side Panel / │ ◀── fetch() to API ────────┘                   │
│  │ Library App  │                                                 │
│  └──────────────┘                                                │
└──────────────────────────────────────────────┬───────────────────┘
                                               │ HTTP (localhost or VPS)
                                               │ X-API-Key header
                                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    SELF-HOSTED BACKEND  (Docker Compose)         │
│                                                                  │
│   ┌────────────────────────────────┐  ┌──────────────────────┐  │
│   │  Hono API Server               │  │  PostgreSQL 16       │  │
│   │  Node.js  port 3001            │  │  + pgvector          │  │
│   │                                │  │  port 5432           │  │
│   │  POST /sources                 │  │                      │  │
│   │  POST /cards                   │  │  sources             │  │
│   │  POST /search                  │  │  cards               │  │
│   │  GET  /cards                   │  │  card_embeddings     │  │
│   │  GET  /cards/:id               │  │  tags                │  │
│   │  DELETE /cards/:id             │  │  card_tags           │  │
│   │                                │  │                      │  │
│   └───────────────┬────────────────┘  └──────────────────────┘  │
│                   │   pg driver                  ▲               │
│                   └──────────────────────────────┘               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                                               │
                                               │ fetch() via background worker
                                               ▼
                                  ┌────────────────────────┐
                                  │   Anthropic API        │
                                  │   /v1/messages         │
                                  │   (agent LLM calls)    │
                                  └────────────────────────┘
```

---

## File & Folder Structure

```
watchnt/
│
├── docker-compose.yml             # Spins up Postgres + API server together
├── .env.example                   # All configurable values documented here
├── .env                           # Actual secrets — gitignored
│
├── /extension                     # The Chrome extension
│   │
│   ├── manifest.json
│   │
│   ├── /background
│   │   ├── index.js               # Entry point; registers all listeners
│   │   ├── orchestrator.js        # Runs the agent pipeline end-to-end
│   │   ├── queue.js               # FIFO job queue for transcript processing
│   │   └── session.js             # Per-tab session state manager
│   │
│   ├── /agents
│   │   ├── index.js               # Agent registry + runPipeline()
│   │   ├── captureAgent.js        # Cleans + normalises raw transcript
│   │   ├── contextAgent.js        # Identifies content type, topic, entities
│   │   ├── extractionAgent.js     # Key insights, quotes, concepts
│   │   ├── actionAgent.js         # Tasks, decisions, follow-ups
│   │   ├── cardAgent.js           # Structures output into knowledge cards
│   │   ├── organiserAgent.js      # Tags, categories, cross-links
│   │   └── indexAgent.js          # Generates embeddings + POSTs to API
│   │
│   ├── /content
│   │   ├── youtube.js             # YouTube transcript + metadata reader
│   │   ├── meet.js                # (Post-MVP) Google Meet live captions
│   │   ├── generic.js             # Fallback: <track> WebVTT, aria-live
│   │   └── bridge.js              # postMessage ↔ chrome.runtime bridge
│   │
│   ├── /storage
│   │   ├── api.js                 # Thin fetch() wrapper → Hono API server
│   │   ├── local.js               # chrome.storage.local typed wrapper
│   │   └── embeddings.js          # generateEmbedding() + semanticSearch()
│   │
│   ├── /popup
│   │   ├── index.html
│   │   ├── popup.js               # Reads chrome.storage.local, renders status
│   │   └── popup.css
│   │
│   ├── /sidepanel
│   │   ├── index.html
│   │   ├── App.jsx
│   │   ├── /components
│   │   │   ├── SearchBar.jsx
│   │   │   ├── KnowledgeCard.jsx
│   │   │   ├── CardGrid.jsx
│   │   │   ├── FilterBar.jsx
│   │   │   ├── SourceBadge.jsx
│   │   │   └── EmptyState.jsx
│   │   └── /hooks
│   │       ├── useSearch.js       # Calls POST /search via api.js
│   │       ├── useCards.js        # Calls GET /cards via api.js
│   │       └── useCapture.js      # Listens for live capture status events
│   │
│   ├── /shared
│   │   ├── constants.js
│   │   ├── logger.js
│   │   ├── llm.js                 # callLLM(prompt, schema) → JSON via Anthropic
│   │   └── utils.js
│   │
│   └── /assets
│       ├── icon-16.png
│       ├── icon-48.png
│       └── icon-128.png
│
├── /server                        # Hono API server (Node.js)
│   │
│   ├── index.js                   # Entry point — creates Hono app, mounts routes
│   ├── db.js                      # postgres (pg) pool init + query helper
│   ├── auth.js                    # Static API key middleware
│   │
│   ├── /routes
│   │   ├── sources.js             # POST /sources
│   │   ├── cards.js               # GET /cards, GET /cards/:id, POST /cards, DELETE /cards/:id
│   │   └── search.js              # POST /search  (vector similarity query)
│   │
│   ├── /db
│   │   ├── schema.sql             # Full CREATE TABLE statements
│   │   ├── migrations/
│   │   │   ├── 001_init.sql
│   │   │   └── 002_vector.sql
│   │   └── seed.sql               # (optional) dev seed data
│   │
│   ├── package.json
│   └── Dockerfile
│
└── /scripts
    ├── build-extension.js         # esbuild bundler for /extension
    └── package-extension.js       # Zips /extension/dist for Chrome Web Store
```

---

## Layer-by-Layer Breakdown

### 1. Extension Shell

**File:** `extension/manifest.json`

Manifest V3. Declares the minimum permission set needed:

```json
{
  "manifest_version": 3,
  "name": "Watchn't",
  "permissions": ["storage", "tabs", "sidePanel", "scripting"],
  "host_permissions": ["https://www.youtube.com/*", "http://localhost/*"],
  "background": { "service_worker": "background/index.js" },
  "content_scripts": [
    {
      "matches": ["https://www.youtube.com/watch*"],
      "js": ["content/bridge.js", "content/youtube.js"]
    }
  ],
  "action": { "default_popup": "popup/index.html" },
  "side_panel": { "default_path": "sidepanel/index.html" }
}
```

`http://localhost/*` is required in `host_permissions` so the background worker can reach the self-hosted API. For a remote VPS, replace with your domain. The extension never makes requests to any other external URL except `api.anthropic.com`.

---

### 2. Content Scripts

**Files:** `extension/content/youtube.js`, `bridge.js`, `generic.js`

Run inside the page's DOM context. Read-only — they never write to the page, never call the API, never touch storage.

#### `youtube.js`

- Observes `ytd-watch-flexy` mounting to detect video page load
- Reads video title, channel, and video ID from DOM + URL
- Polls `ytd-transcript-segment-renderer` elements for transcript text
- Tracks `<video>.currentTime` to attach timestamps to each segment
- Sends `TRANSCRIPT_CHUNK` messages to the background worker every 50 segments
- Sends `VIDEO_ENDED` when `<video>` fires its `ended` event

#### `bridge.js`

Translates between `window.postMessage` (page context) and `chrome.runtime.sendMessage` (extension context). Content scripts straddle both — this bridge keeps the boundary explicit.

#### `generic.js` (post-MVP)

Reads `<track kind="captions">` / WebVTT and `aria-live` regions for non-YouTube pages.

---

### 3. Background Service Worker

**Files:** `extension/background/index.js`, `orchestrator.js`, `queue.js`, `session.js`

The service worker is the **single orchestration point**. No other layer drives logic — everything flows through here.

#### `index.js`

Registers listeners on startup:

- `chrome.runtime.onMessage` → routes `TRANSCRIPT_CHUNK` and `VIDEO_ENDED` from content scripts
- `chrome.tabs.onUpdated` → creates a new session when a YouTube watch URL is loaded
- `chrome.tabs.onRemoved` → cleans up orphaned sessions

#### `session.js`

Maintains a `Map<tabId, SessionState>` in memory, checkpointed to `chrome.storage.local`:

```js
{
  tabId,
  videoId,
  title,
  channel,
  url,
  startedAt,
  chunks: [],             // raw segments accumulated during playback
  status: 'capturing' | 'processing' | 'done' | 'error'
}
```

#### `queue.js`

Async FIFO queue. Accepts completed sessions from `index.js` and feeds them to the orchestrator one at a time. Max 1 active pipeline, up to 5 queued. Prevents parallel LLM calls overwhelming the API.

#### `orchestrator.js`

Pulls a job and runs the full pipeline in sequence:

```
captureAgent → contextAgent → extractionAgent → actionAgent
    → cardAgent → organiserAgent → indexAgent
```

Each agent receives the enriched payload from the previous one. If any agent throws, the orchestrator marks the session as `error` and moves to the next job — no partial writes.

---

### 4. Agent Pipeline

**Files:** `extension/agents/*.js`

Each agent is a pure async function:

```js
async function runAgent(input: AgentInput): Promise<AgentOutput>
```

All agents call `shared/llm.js` → `callLLM(systemPrompt, userContent, outputSchema)` which calls the Anthropic API and validates the returned JSON against the expected schema before returning. Agents never call the storage API — that is exclusively `indexAgent`'s job.

See [Agent Definitions](#agent-definitions) for individual specs.

---

### 5. Storage Layer

**Files:** `extension/storage/api.js`, `local.js`, `embeddings.js`

Two persistence targets with different roles:

| Store                    | What lives here                             | Accessed by                       |
| ------------------------ | ------------------------------------------- | --------------------------------- |
| `chrome.storage.local`   | Active sessions, queue, user prefs, API key | Background worker, popup          |
| **Self-hosted Postgres** | Finalised knowledge cards, sources, tags    | API server only                   |
| **pgvector**             | Embeddings per card                         | API server only (`/search` route) |

#### `api.js`

Thin `fetch()` wrapper around the Hono server. Reads `apiHost` and `apiKey` from `chrome.storage.local` on each call:

```js
async function apiCall(method, path, body) {
  const { apiHost, apiKey } = await chrome.storage.local.get([
    "apiHost",
    "apiKey",
  ]);
  return fetch(`${apiHost}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export const api = {
  post: (path, body) => apiCall("POST", path, body),
  get: (path) => apiCall("GET", path),
  del: (path) => apiCall("DELETE", path),
};
```

**Why a wrapper instead of the Supabase client:** the Supabase JS SDK is 200KB+ and depends on Supabase's auth model. A 30-line fetch wrapper does everything needed here.

#### `local.js`

Typed accessors for `chrome.storage.local`. Provides `get`, `set`, `remove`, and `onChange(key, callback)` for reactive popup updates.

#### `embeddings.js`

- `generateEmbedding(text)` — calls Anthropic's embeddings API (or any OpenAI-compatible endpoint) to produce a float vector
- `semanticSearch(queryText, limit)` — generates an embedding for the query, then calls `POST /search` on the API server

---

### 6. Popup UI

**Files:** `extension/popup/`

Status panel only — no logic lives here. Reads `chrome.storage.local` and reflects the current state:

| State      | What shows                                       |
| ---------- | ------------------------------------------------ |
| First run  | `apiHost` + `apiKey` + `anthropicKey` setup form |
| Capturing  | "Capturing — [video title]" + live segment count |
| Processing | "Processing — [agent name]" + step progress bar  |
| Done       | "✓ [N] cards saved" + "Open Library" button      |
| Error      | Error message + "Retry" button                   |
| Idle       | "Open Library" button only                       |

---

### 7. Knowledge Library App (Side Panel / Tab)

**Files:** `extension/sidepanel/`

React app rendered in Chrome's Side Panel. Talks exclusively to the API server via `storage/api.js`.

#### Key components

**`SearchBar.jsx`**
Debounced input (300ms). On submit, calls `useSearch` which calls `POST /search`. Falls back to `GET /cards?q=` (Postgres full-text) for queries under 3 words.

**`KnowledgeCard.jsx`**
Renders one card: title, source badge, summary, collapsible insights list, collapsible action items, tags, timestamp, and a "Jump to source" link that opens YouTube at `t=startTime`.

**`FilterBar.jsx`**
Filters by: content type, tag, date range, source channel. Passes query params to `GET /cards`.

**`useSearch.js`**
Calls `api.post('/search', { query, limit })`. Returns ranked cards. On error falls back to text search.

**`useCards.js`**
Calls `api.get('/cards?page=N&filter=...')`. Handles pagination with an infinite-scroll trigger.

---

### 8. API Server (Hono/Node)

**Files:** `server/`

A lightweight HTTP server using [Hono](https://hono.dev) — ~15KB, zero dependencies besides `pg`. Runs on Node.js 20. This is the **only process that touches Postgres directly**.

#### `index.js`

```js
import { Hono } from "hono";
import { authMiddleware } from "./auth.js";
import sourcesRoutes from "./routes/sources.js";
import cardsRoutes from "./routes/cards.js";
import searchRoutes from "./routes/search.js";

const app = new Hono();
app.use("/*", authMiddleware);
app.route("/sources", sourcesRoutes);
app.route("/cards", cardsRoutes);
app.route("/search", searchRoutes);

export default app;
```

#### `auth.js`

Reads `API_KEY` from env. Rejects any request where `X-API-Key` header doesn't match. Single static key — no JWT, no sessions, no user management at MVP.

```js
export const authMiddleware = async (c, next) => {
  if (c.req.header("X-API-Key") !== process.env.API_KEY) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
};
```

#### `db.js`

Creates a `pg.Pool` from env vars (`POSTGRES_HOST`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`). Exports a single `query(sql, params)` helper.

#### `routes/sources.js`

- `POST /sources` — upserts a source record (video metadata), returns `sourceId`

#### `routes/cards.js`

- `GET /cards` — paginated list with optional filters (`?type=tutorial&tag=AI&page=1`)
- `GET /cards/:id` — single card with full insights/actions payload
- `POST /cards` — bulk insert cards array + embeddings (called by `indexAgent`)
- `DELETE /cards/:id` — removes card + embedding

#### `routes/search.js`

- `POST /search` — accepts `{ embedding: float[], limit: number }`, runs the pgvector cosine similarity query, returns ranked card rows

```js
const results = await db.query(
  `
  SELECT c.*, 1 - (e.embedding <=> $1) AS score
  FROM cards c
  JOIN card_embeddings e ON e.card_id = c.id
  WHERE 1 - (e.embedding <=> $1) > $2
  ORDER BY score DESC
  LIMIT $3
`,
  [pgvector.toSql(embedding), MATCH_THRESHOLD, limit],
);
```

---

### 9. Database (PostgreSQL + pgvector)

Runs as a Docker container. No managed service, no cloud. Data lives on a Docker volume mounted at `./data/postgres`.

The `pgvector` extension is enabled in the init script. All schema setup runs automatically on first boot via the `/docker-entrypoint-initdb.d/` convention.

---

### 10. Docker Compose

**File:** `docker-compose.yml`

```yaml
version: "3.9"

services:
  db:
    image: pgvector/pgvector:pg16
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
      - ./server/db/schema.sql:/docker-entrypoint-initdb.d/001_schema.sql
    ports:
      - "5432:5432" # unexpose in production; only api needs it
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build: ./server
    restart: unless-stopped
    environment:
      POSTGRES_HOST: db
      POSTGRES_PORT: 5432
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      API_KEY: ${API_KEY}
      PORT: 3001
    ports:
      - "3001:3001"
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:
```

**`.env` (gitignored):**

```
POSTGRES_DB=watchnt
POSTGRES_USER=watchnt
POSTGRES_PASSWORD=change_me_strong_password
API_KEY=generate_a_long_random_string_here
```

**To start everything:**

```bash
docker compose up -d
```

Then enter `http://localhost:3001` and your `API_KEY` in the extension popup once — done.

---

## Agent Definitions

Each agent calls `callLLM(systemPrompt, userContent, outputSchema)` → returns validated JSON.

### `captureAgent`

**Input:** Raw transcript segments array from session
**Job:** Strip filler words, fix run-on speaker turns, segment into coherent paragraph blocks (~300–500 tokens each), attach start/end timestamps
**Output:** `{ cleanedBlocks: [{ text, startTime, endTime }] }`

### `contextAgent`

**Input:** First 2 cleaned blocks + video metadata (title, channel)
**Job:** Identify content type (tutorial / interview / lecture / talk), primary topic, likely audience, key named entities
**Output:** `{ contentType, primaryTopic, audience, entities: [] }`

### `extractionAgent`

**Input:** All cleaned blocks + context output
**Job:** Extract the most important insights, notable quotes, frameworks, and defined concepts
**Output:** `{ insights: [{ text, blockIndex, importance: 1-5 }], concepts: [], quotes: [] }`

### `actionAgent`

**Input:** All cleaned blocks + insights
**Job:** Detect action items, decisions made, questions raised, follow-up resources mentioned
**Output:** `{ actions: [{ text, owner?, deadline? }], decisions: [], questions: [], resources: [{ title, url? }] }`

### `cardAgent`

**Input:** Context + insights + actions
**Job:** Structure everything into 1–5 knowledge cards. Each card is one coherent unit — a concept, a framework, a decision, or a key section
**Output:** `{ cards: [{ title, summary, insights: [], actions: [], concepts: [], sourceSegment: { start, end } }] }`

### `organiserAgent`

**Input:** Cards array + context
**Job:** Assign tags, suggest a primary category, flag potential cross-links based on entity overlap
**Output:** `{ cards: [...cardsWithTags], category }`

### `indexAgent`

**Input:** Final cards + source metadata
**Job:** For each card, call `embeddings.generateEmbedding()`, then call `api.post('/sources', ...)` and `api.post('/cards', [...cardsWithEmbeddings])` in one request
**Output:** `{ sourceId, cardIds: [], status: 'indexed' }`

---

## State Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                      STATE OWNERSHIP MAP                           │
│                                                                    │
│  chrome.storage.local  (device-local, survives restarts)          │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  activeSessions: Map<tabId, SessionState>                  │   │
│  │  processingQueue: SessionState[]                           │   │
│  │  captureStatus: { tabId, agentStep, progress }             │   │
│  │  userConfig: {                                             │   │
│  │    apiHost: 'http://localhost:3001',  ← user configures    │   │
│  │    apiKey:  '...',                    ← stored locally     │   │
│  │    anthropicKey: '...',               ← never leaves device│   │
│  │    autoCapture: true                                       │   │
│  │  }                                                         │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  In-memory only  (background service worker lifetime)             │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  agentPipelineState (current run only, not persisted)      │   │
│  │  queueLock: boolean                                        │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  PostgreSQL  (permanent, on your machine / VPS)                   │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  sources       — one row per video / meeting               │   │
│  │  cards         — one row per knowledge card                │   │
│  │  card_embeddings — one vector row per card                 │   │
│  │  tags          — tag vocabulary                            │   │
│  │  card_tags     — many-to-many join                         │   │
│  └────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

**Key principle:** API keys (Anthropic + self-hosted API key) are stored in `chrome.storage.local` and read at call time. They never appear in source code, never touch the server, and never leave the browser.

---

## Data Flow — End to End

```
1. USER OPENS youtube.com/watch?v=...
   └─▶ chrome.tabs.onUpdated fires in background/index.js
       └─▶ session.js creates SessionState for this tabId
       └─▶ content/youtube.js begins polling the transcript DOM

2. CONTENT SCRIPT READS TRANSCRIPT
   └─▶ youtube.js collects ytd-transcript-segment-renderer nodes
   └─▶ Every 50 segments or on VIDEO_ENDED:
       chrome.runtime.sendMessage({ type: 'TRANSCRIPT_CHUNK', segments, metadata })

3. BACKGROUND WORKER RECEIVES MESSAGE
   └─▶ index.js routes to session.js → appends chunks to session
   └─▶ on VIDEO_ENDED: pushes session to queue.js
   └─▶ Updates captureStatus in chrome.storage.local (popup re-renders)

4. QUEUE PROCESSES SESSION
   └─▶ queue.js dequeues next job
   └─▶ orchestrator.js starts the agent pipeline

5. AGENT PIPELINE (background worker)
   captureAgent
     └─▶ callLLM() → Anthropic API → cleaned blocks

   contextAgent
     └─▶ callLLM() → Anthropic API → content type + entities

   extractionAgent
     └─▶ callLLM() → Anthropic API → insights + quotes

   actionAgent
     └─▶ callLLM() → Anthropic API → actions + decisions

   cardAgent
     └─▶ callLLM() → Anthropic API → structured cards

   organiserAgent
     └─▶ callLLM() → Anthropic API → cards with tags + category

   indexAgent
     └─▶ embeddings.generateEmbedding(cardText) per card → Anthropic API
     └─▶ api.post('/sources', sourceMetadata) → Hono server → Postgres
     └─▶ api.post('/cards', cardsWithEmbeddings) → Hono server → Postgres
     └─▶ Session marked 'done', removed from queue

6. USER OPENS SIDE PANEL
   └─▶ App.jsx mounts
   └─▶ useCards calls api.get('/cards') → GET /cards on Hono → Postgres query
   └─▶ CardGrid renders

7. USER SEARCHES
   └─▶ SearchBar → useSearch debounce fires
   └─▶ embeddings.generateEmbedding(queryText) → Anthropic API → vector
   └─▶ api.post('/search', { embedding, limit: 20 })
       → Hono POST /search
       → pgvector cosine similarity query against card_embeddings
       → returns ranked card rows
   └─▶ CardGrid re-renders with semantic results
```

---

## Database Schema

```sql
-- server/db/schema.sql
-- Runs automatically on first docker compose up

CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────────
-- Sources: one row per video / meeting
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sources (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  platform      TEXT        NOT NULL,        -- 'youtube' | 'meet' | 'podcast'
  source_url    TEXT        NOT NULL UNIQUE,
  title         TEXT,
  channel       TEXT,
  duration_sec  INTEGER,
  captured_at   TIMESTAMPTZ DEFAULT now(),
  content_type  TEXT,                        -- 'tutorial' | 'interview' | 'lecture'
  primary_topic TEXT,
  metadata      JSONB       DEFAULT '{}'
);

-- ─────────────────────────────────────────
-- Cards: one row per knowledge card
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cards (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id    UUID        REFERENCES sources(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  summary      TEXT,
  insights     JSONB       DEFAULT '[]',
  actions      JSONB       DEFAULT '[]',
  concepts     JSONB       DEFAULT '[]',
  source_start INTEGER,                      -- seconds into video
  source_end   INTEGER,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cards_source_id  ON cards(source_id);
CREATE INDEX IF NOT EXISTS idx_cards_created_at ON cards(created_at DESC);

-- Full-text search index (fallback for short queries)
ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, ''))
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_cards_fts ON cards USING GIN(search_vector);

-- ─────────────────────────────────────────
-- Embeddings: vector per card
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS card_embeddings (
  id        UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id   UUID    REFERENCES cards(id) ON DELETE CASCADE UNIQUE,
  embedding vector(1536)             -- dimensions must match chosen model
);

-- IVFFlat index for approximate nearest-neighbour search
CREATE INDEX IF NOT EXISTS idx_card_embeddings_vector
  ON card_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ─────────────────────────────────────────
-- Tags
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS card_tags (
  card_id UUID REFERENCES cards(id)  ON DELETE CASCADE,
  tag_id  UUID REFERENCES tags(id)   ON DELETE CASCADE,
  PRIMARY KEY (card_id, tag_id)
);
```

---

## API Routes

| Method   | Path         | Body / Params                                                                                                             | Returns                          |
| -------- | ------------ | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `POST`   | `/sources`   | `{ platform, sourceUrl, title, channel, durationSec, contentType, primaryTopic, metadata }`                               | `{ id }`                         |
| `POST`   | `/cards`     | `{ sourceId, cards: [{ title, summary, insights, actions, concepts, sourceStart, sourceEnd, tags: [], embedding: [] }] }` | `{ cardIds: [] }`                |
| `GET`    | `/cards`     | `?page&limit&type&tag&q`                                                                                                  | `{ cards: [], total }`           |
| `GET`    | `/cards/:id` | —                                                                                                                         | Full card object                 |
| `DELETE` | `/cards/:id` | —                                                                                                                         | `{ deleted: true }`              |
| `POST`   | `/search`    | `{ embedding: float[], limit: number, threshold?: number }`                                                               | `{ results: [{ card, score }] }` |

All routes require `X-API-Key` header. All responses are JSON. All errors return `{ error: string }` with appropriate HTTP status.

---

## Service Connection Map

```
┌──────────────────┐   chrome.runtime.sendMessage   ┌─────────────────────┐
│ Content Scripts  │ ─────────────────────────────▶  │ Background Worker   │
│ (youtube.js etc) │ ◀───────────────────────────── │ (orchestrator)      │
└──────────────────┘  chrome.tabs.sendMessage        └──────────┬──────────┘
                                                                │
               ┌────────────────────────────────────────────────┤
               │                                                │
               ▼                                                ▼
   ┌───────────────────────┐                      ┌────────────────────────┐
   │ chrome.storage.local  │                      │  Anthropic API         │
   │                       │                      │  api.anthropic.com     │
   │  sessions, queue,     │                      │  /v1/messages          │
   │  config, API keys     │                      │  (LLM + embeddings)    │
   └───────────────────────┘                      └────────────────────────┘
               │
               │ api.js reads apiHost + apiKey from storage
               │ fetch() with X-API-Key header
               ▼
   ┌─────────────────────────────────────────────────────────┐
   │               SELF-HOSTED STACK  (Docker Compose)       │
   │                                                         │
   │   ┌───────────────────────────┐                        │
   │   │  Hono API  :3001          │                        │
   │   │                           │  pg driver (internal)  │
   │   │  /sources  /cards         │ ─────────────────────▶ │
   │   │  /search                  │                        │
   │   │  auth middleware          │  ┌─────────────────┐   │
   │   └───────────────────────────┘  │  PostgreSQL 16  │   │
   │                                  │  + pgvector     │   │
   │                                  │  :5432          │   │
   │                                  └─────────────────┘   │
   └─────────────────────────────────────────────────────────┘
               ▲
               │ same api.js fetch() calls
               │
   ┌───────────┴──────────┐
   │  Side Panel App      │
   │  (React / hooks)     │
   └──────────────────────┘
```

**Rules:**

- Content scripts → background worker only (no direct API access)
- Background worker → Anthropic API (LLM + embeddings)
- Background worker → self-hosted API (write: sources, cards)
- Side panel → self-hosted API (read: cards, search)
- Self-hosted API → Postgres (only process that touches the DB)
- Postgres port `5432` is **not exposed** to the network in production — only the Hono container reaches it via Docker's internal network

---

## Deployment Options

| Option                                       | Command                           | Notes                                                                               |
| -------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------- |
| **Local machine**                            | `docker compose up -d`            | Extension uses `http://localhost:3001`. Zero cost.                                  |
| **Home server / NAS**                        | Same compose file, different host | Set `apiHost` in extension to local network IP                                      |
| **$5–6/mo VPS** (Hetzner, Fly, DigitalOcean) | `docker compose up -d` on VPS     | Set `apiHost` to VPS IP or domain. Put Nginx in front with HTTPS.                   |
| **HTTPS on VPS**                             | Add Caddy or Nginx to compose     | Required if you want to access from non-localhost. Free TLS via Caddy's auto-HTTPS. |

**Adding Caddy (optional, for HTTPS on VPS):**

```yaml
# Add to docker-compose.yml
caddy:
  image: caddy:2-alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./Caddyfile:/etc/caddy/Caddyfile
    - caddy_data:/data
  depends_on: [api]

# Caddyfile
your-domain.com {
  reverse_proxy api:3001
}
```

---

## Expansion Targets Post-MVP

| Target                      | Extension change                                                           | Server change                                 | Notes                                                                                       |
| --------------------------- | -------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Google Meet**             | Add `meet.js` content script; read `aria-live` captions                    | No change                                     | Add `meet.google.com/*` to host_permissions                                                 |
| **Podcasts / WebVTT**       | `generic.js` reads `<track>` elements                                      | No change                                     | Works on Spotify Web, web podcast players                                                   |
| **Browser audio**           | Background worker uses `tabCapture` API → Whisper (self-hosted via Ollama) | Add `/transcribe` route calling local Whisper | Keeps audio processing fully local                                                          |
| **Multilingual**            | Add lang detection in `contextAgent`                                       | No change                                     | Add translation step pre-extraction; use multilingual embedding model                       |
| **Multi-user**              | Add user login to extension                                                | Add user table + JWT auth to API              | Postgres already structured for per-user rows                                               |
| **Export**                  | Side panel export button                                                   | `GET /cards/export?format=md\|json` route     | Bundle as Obsidian vault or Notion import                                                   |
| **Ollama LLM (100% local)** | `shared/llm.js` → call `http://localhost:11434`                            | No change                                     | Replace Anthropic calls with local Llama 3 or Mistral. Eliminates last external dependency. |
