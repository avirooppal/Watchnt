# Watchn't — Unified Build Plan

> All features — YouTube, Google Meet, Podcasts, Audio Capture, Multilingual, Multi-User, Export, Ollama — are built in a single sequence.
> No post-MVP. No phases to "come back to later."
> Hand one task at a time to the engineering LLM. Test before moving on.

---

## How to Use This Plan

- Tasks are numbered. Complete them strictly in order.
- Each task has a **What**, **Instructions**, **Start state**, **End state**, and **Test**.
- The engineering LLM produces only what the task asks for. Nothing more.
- "Test" steps are things you run or check yourself before handing off the next task.

---

## Phase 0 — Repo & Environment

---

### Task 001 — Initialise the monorepo

**What:** Create the root folder structure and root-level config files. No code yet.

**Instructions:**

- Create empty directories: `extension/`, `server/`, `scripts/`, `data/`
- Create root `package.json`: `name: "watchnt"`, `private: true`, `workspaces: ["extension", "server"]`, scripts: `{ "pull-models": "bash scripts/pull-models.sh" }`
- Create `.gitignore` ignoring: `node_modules/`, `dist/`, `.env`, `data/`
- Create `.env.example` with all configuration keys:
  ```
  POSTGRES_DB=watchnt
  POSTGRES_USER=watchnt
  POSTGRES_PASSWORD=changeme
  API_KEY=replace_with_long_random_string
  JWT_SECRET=replace_with_long_random_string
  OLLAMA_HOST=http://transcriber:11434
  OLLAMA_MODEL=llama3.1
  LLM_PROVIDER=anthropic
  ```
- Create an empty `.env` file (user fills in)

**Start state:** Empty folder
**End state:** Root scaffold with directories and config files
**Test:** `ls` shows `extension/`, `server/`, `scripts/`, `data/`, `.gitignore`, `.env.example`, `package.json`

---

### Task 002 — Write the Docker Compose file

**What:** Define the full three-service stack: Postgres, API server, and Ollama.

**Instructions:**

- Create `docker-compose.yml` at root with three services:
- **`db`**: image `pgvector/pgvector:pg16`, env vars from `.env`, mounts `./data/postgres:/var/lib/postgresql/data` and `./server/db/schema.sql:/docker-entrypoint-initdb.d/001_schema.sql`, healthcheck using `pg_isready`
- **`api`**: `build: ./server`, depends on `db` healthy, env vars for Postgres connection + `API_KEY` + `JWT_SECRET` + `PORT=3001` + `OLLAMA_HOST` + `OLLAMA_MODEL` + `LLM_PROVIDER`, exposes port `3001`
- **`transcriber`**: image `ollama/ollama`, exposes port `11434`, mounts `./data/ollama:/root/.ollama`, healthcheck using `curl -f http://localhost:11434/api/tags`
- Do NOT write `server/Dockerfile` yet — that is Task 016

**Start state:** Task 001 complete
**End state:** `docker-compose.yml` exists with all three services
**Test:** `docker compose config` runs without errors

---

### Task 003 — Write the database schema

**What:** Write the full SQL schema covering all features: users, sources, cards, embeddings, tags, with language and user scoping built in from the start.

**Instructions:**

- Create `server/db/schema.sql`
- Must include in order:
  1. `CREATE EXTENSION IF NOT EXISTS vector;`
  2. `users` table: `id UUID PK DEFAULT gen_random_uuid()`, `email TEXT UNIQUE NOT NULL`, `password_hash TEXT NOT NULL`, `created_at TIMESTAMPTZ DEFAULT now()`
  3. `sources` table: `id UUID PK`, `user_id UUID REFERENCES users(id) ON DELETE CASCADE`, `platform TEXT NOT NULL` (youtube/meet/podcast/audio), `source_url TEXT NOT NULL`, `title TEXT`, `channel TEXT`, `duration_sec INTEGER`, `captured_at TIMESTAMPTZ DEFAULT now()`, `content_type TEXT`, `primary_topic TEXT`, `detected_language TEXT DEFAULT 'en'`, `metadata JSONB DEFAULT '{}'`. Unique constraint on `(user_id, source_url)`
  4. `cards` table: `id UUID PK`, `source_id UUID REFERENCES sources(id) ON DELETE CASCADE`, `user_id UUID REFERENCES users(id) ON DELETE CASCADE`, `title TEXT NOT NULL`, `summary TEXT`, `insights JSONB DEFAULT '[]'`, `actions JSONB DEFAULT '[]'`, `concepts JSONB DEFAULT '[]'`, `source_start INTEGER`, `source_end INTEGER`, `created_at TIMESTAMPTZ DEFAULT now()`
  5. Index on `cards(source_id)`, `cards(user_id)`, `cards(created_at DESC)`
  6. Generated `tsvector` column on `cards` with a GIN index for full-text search
  7. `card_embeddings` table: `id UUID PK`, `card_id UUID REFERENCES cards(id) ON DELETE CASCADE UNIQUE`, `embedding vector(768)` — using 768 dimensions to be compatible with both `nomic-embed-text` (Ollama) and prompt-based Anthropic embeddings
  8. IVFFlat index on `card_embeddings(embedding vector_cosine_ops)` with `lists = 100`
  9. `tags` table: `id UUID PK`, `name TEXT UNIQUE NOT NULL`
  10. `card_tags` join table: `card_id + tag_id` composite PK, both FK with CASCADE
- All statements use `IF NOT EXISTS`

**Start state:** Task 002 complete
**End state:** `server/db/schema.sql` with all tables
**Test:** `docker compose up db -d`, then `docker exec -it <db_container> psql -U watchnt -d watchnt -c "\dt"` — lists: `users`, `sources`, `cards`, `card_embeddings`, `tags`, `card_tags`

---

### Task 004 — Write the model pull script

**What:** Create the script that downloads both Whisper and the LLM into the Ollama container.

**Instructions:**

- Create `scripts/pull-models.sh`:
  ```bash
  #!/bin/bash
  set -e
  echo "Pulling Whisper model..."
  docker compose exec transcriber ollama pull whisper
  echo "Pulling nomic-embed-text embedding model..."
  docker compose exec transcriber ollama pull nomic-embed-text
  echo "Pulling LLM (llama3.1 — swap for mistral or qwen2.5 on lower-RAM machines)..."
  docker compose exec transcriber ollama pull llama3.1
  echo "All models ready."
  ```
- Make it executable: `chmod +x scripts/pull-models.sh`
- Add a `README.md` at root that documents: (1) copy `.env.example` to `.env` and fill in values, (2) `docker compose up -d`, (3) `npm run pull-models` once, (4) hardware requirements: 8GB RAM minimum for llama3.1 7B

**Start state:** Task 003 complete
**End state:** `scripts/pull-models.sh` and `README.md` exist
**Test:** `bash scripts/pull-models.sh --help` doesn't crash (or just verify the file is executable and syntactically valid with `bash -n scripts/pull-models.sh`)

---

## Phase 1 — API Server

---

### Task 005 — Initialise the server package

**What:** Create `server/package.json` and install all server dependencies.

**Instructions:**

- Create `server/package.json`:
  - `"type": "module"`, `"main": "index.js"`
  - `"scripts": { "start": "node index.js", "dev": "node --watch index.js" }`
  - dependencies: `hono`, `@hono/node-server`, `pg`, `pgvector`, `bcrypt`, `jsonwebtoken`
  - devDependencies: `dotenv`
- Create `server/.env` for local dev (without Docker): mirror `.env.example` plus `POSTGRES_HOST=localhost`

**Start state:** Task 004 complete
**End state:** `server/package.json` exists
**Test:** `cd server && npm install` — `node_modules/hono`, `node_modules/bcrypt`, `node_modules/jsonwebtoken` all exist

---

### Task 006 — Write the database connection module

**What:** Single Postgres pool used by all routes.

**Instructions:**

- Create `server/db.js`
- Import `pg`, create a `Pool` from env vars: `POSTGRES_HOST`, `POSTGRES_PORT` (default 5432), `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- Export `query(sql, params)` async function and the `pool` itself (for transactions)
- On pool error: log to stderr, do not crash

**Start state:** Task 005 complete
**End state:** `server/db.js` exports `query` and `pool`
**Test:** Create a throwaway `server/test-db.js` that calls `query('SELECT NOW()')` and logs the result. Run with db container up. Delete after.

---

### Task 007 — Write JWT auth middleware and helpers

**What:** JWT-based auth — middleware, register, and login helpers. This replaces the static API key model entirely.

**Instructions:**

- Create `server/auth.js`
- Import `bcrypt`, `jsonwebtoken`, `query` from `db.js`
- Export `jwtMiddleware`: reads `Authorization: Bearer <token>` header, verifies against `process.env.JWT_SECRET`, attaches `userId` to Hono context via `c.set('userId', payload.sub)`, returns `401` if missing or invalid. Skip auth for `GET /health`.
- Export `registerUser({ email, password })`: validates email + password present, hashes password with `bcrypt.hash(password, 12)`, inserts into `users`, returns `{ id, email }`
- Export `loginUser({ email, password })`: finds user by email, compares hash with `bcrypt.compare`, throws `401` if invalid, returns a signed JWT with `{ sub: user.id, email }`, `expiresIn: '30d'`

**Start state:** Task 006 complete
**End state:** `server/auth.js` exports middleware + two helpers
**Test:** No isolated test yet — tested in Task 017.

---

### Task 008 — Write the `/auth` routes

**What:** Register and login endpoints.

**Instructions:**

- Create `server/routes/auth.js`
- Export a Hono router
- `POST /register`: calls `registerUser()`, returns `201 { id, email, token }` — signs a JWT immediately on register so the user is logged in
- `POST /login`: calls `loginUser()`, returns `200 { token }`
- Both routes return `400 { error }` on missing fields, `401 { error }` on bad credentials, `409 { error }` on duplicate email for register
- These routes do NOT require JWT middleware — they are the auth entry points

**Start state:** Task 007 complete
**End state:** `server/routes/auth.js`
**Test:** Tested in Task 017.

---

### Task 009 — Write the `/sources` route

**What:** Create and upsert video/meeting/podcast source records.

**Instructions:**

- Create `server/routes/sources.js`
- Export a Hono router
- `POST /`:
  - Requires JWT middleware (userId from context)
  - Accepts: `{ platform, sourceUrl, title, channel, durationSec, contentType, primaryTopic, detectedLanguage, metadata }`
  - Validates `platform` and `sourceUrl` present
  - Upserts on `(user_id, source_url)` conflict — updates all non-key fields
  - Returns `201 { id }`

**Start state:** Task 008 complete
**End state:** `server/routes/sources.js`
**Test:** Tested in Task 017.

---

### Task 010 — Write the `/cards` route

**What:** Bulk insert, paginated list, single fetch, and delete for knowledge cards.

**Instructions:**

- Create `server/routes/cards.js`
- Export a Hono router
- All handlers require JWT (userId from context). All queries include `WHERE user_id = $N`.
- `POST /` — bulk insert:
  - Accepts `{ sourceId, cards: [{ title, summary, insights, actions, concepts, sourceStart, sourceEnd, tags: string[], embedding: number[] }] }`
  - In a transaction: insert each card with `user_id`, upsert tags by name, insert `card_tags`, insert embeddings via `pgvector.toSql(embedding)` into `card_embeddings`
  - Returns `201 { cardIds: [] }`
- `GET /` — paginated list:
  - Params: `page` (default 1), `limit` (default 20, max 100), `type`, `tag`, `q` (full-text), `lang` (filter `sources.detected_language`)
  - JOINs with `sources` to return source title + channel + platform alongside each card
  - Returns `200 { cards: [], total }`
- `GET /:id` — returns full card with source info and tags array, `404` if not found or wrong user
- `DELETE /:id` — deletes card, cascades to embeddings and card_tags, `200 { deleted: true }`

**Start state:** Task 009 complete
**End state:** `server/routes/cards.js`
**Test:** Tested in Task 017.

---

### Task 011 — Write the `/search` route

**What:** Vector similarity search using pgvector.

**Instructions:**

- Create `server/routes/search.js`
- Export a Hono router
- `POST /`:
  - Requires JWT (userId from context)
  - Accepts `{ embedding: number[], limit?: number, threshold?: number }`
  - Defaults: `limit = 20`, `threshold = 0.5`
  - Query:
    ```sql
    SELECT c.*, s.title AS source_title, s.channel, s.platform, s.source_url,
           1 - (e.embedding <=> $1) AS score
    FROM cards c
    JOIN card_embeddings e ON e.card_id = c.id
    JOIN sources s ON s.id = c.source_id
    WHERE c.user_id = $2
      AND 1 - (e.embedding <=> $1) > $3
    ORDER BY score DESC
    LIMIT $4
    ```
  - Use `pgvector.toSql(embedding)` for `$1`
  - Returns `200 { results: [{ ...card, score }] }`

**Start state:** Task 010 complete
**End state:** `server/routes/search.js`
**Test:** Tested in Task 017.

---

### Task 012 — Write the `/transcribe` route

**What:** Accepts base64 audio, calls local Ollama Whisper, returns transcript segments.

**Instructions:**

- Create `server/routes/transcribe.js`
- Export a Hono router
- `POST /`:
  - Requires JWT
  - Accepts `{ audio: string (base64), mimeType: string, durationSec: number }`
  - Validates all fields present
  - Decodes base64 to `Buffer`, writes to `/tmp/watchnt-<randomId>.webm`
  - POSTs to `${process.env.OLLAMA_HOST}/api/transcribe` with `{ model: "whisper", path: "/tmp/watchnt-<id>.webm" }`
  - Maps response to `{ transcript: string, segments: [{ startTime, endTime, text }] }`
  - Cleans up temp file in `finally`
  - Returns `200 { transcript, segments }` or `503 { error: "Transcriber unavailable" }` if Ollama is unreachable
  - Returns `501 { error: "Transcription unavailable" }` if `OLLAMA_HOST` is not configured

**Start state:** Task 011 complete
**End state:** `server/routes/transcribe.js`
**Test:** Tested in Task 017.

---

### Task 013 — Write the `/llm` proxy route

**What:** Proxies LLM calls from the extension to local Ollama — mirrors the Anthropic response shape exactly.

**Instructions:**

- Create `server/routes/llm.js`
- Export a Hono router
- `POST /`:
  - Requires JWT
  - Accepts `{ system: string, user: string }`
  - Calls `POST ${process.env.OLLAMA_HOST}/api/chat` with:
    ```json
    { "model": "<OLLAMA_MODEL>", "messages": [{ "role": "system", "content": system }, { "role": "user", "content": user }], "stream": false }
    ```
  - Wraps Ollama's response into Anthropic's shape: `{ content: [{ type: "text", text: "<ollama message content>" }] }`
  - Returns `200` with that shape
  - Returns `503` if Ollama unreachable, `501` if `OLLAMA_HOST` not set

**Start state:** Task 012 complete
**End state:** `server/routes/llm.js`
**Test:** Tested in Task 017.

---

### Task 014 — Write the `/embed` route

**What:** Generates embeddings using Ollama's `nomic-embed-text` model (768 dimensions).

**Instructions:**

- Create `server/routes/embed.js`
- Export a Hono router
- `POST /`:
  - Requires JWT
  - Accepts `{ text: string }`
  - Calls `POST ${process.env.OLLAMA_HOST}/api/embeddings` with `{ model: "nomic-embed-text", prompt: text }`
  - Returns `200 { embedding: number[] }` (768-dimensional vector)
  - Returns `503` if Ollama unreachable, `501` if not configured

**Start state:** Task 013 complete
**End state:** `server/routes/embed.js`
**Test:** Tested in Task 017.

---

### Task 015 — Write the `/export` route

**What:** Exports a user's full library as JSON or Obsidian-compatible Markdown.

**Instructions:**

- Create `server/routes/export.js`
- Export a Hono router
- `GET /`:
  - Requires JWT
  - Query params: `format` (`'json'` or `'markdown'`, default `'json'`), `sourceId` (optional — export one source only)
  - Fetches all cards + source info + tags for the authenticated user (filtered by `sourceId` if provided)
  - For `json`: sets `Content-Disposition: attachment; filename="watchnt-export.json"`, returns full array
  - For `markdown`: builds one `.md` block per card:

    ```
    # [title]
    **Source:** [source title] — [channel]
    **Platform:** [platform]  **Language:** [detected_language]
    **Tags:** #tag1 #tag2
    **Captured:** [created_at date]

    ## Summary
    [summary]

    ## Key Insights
    - [insight 1]

    ## Actions
    - [ ] [action 1]

    [Jump to source: source_url?t=source_start]
    ---
    ```

  - Concatenates all blocks, sets `Content-Disposition: attachment; filename="watchnt-export.md"`

**Start state:** Task 014 complete
**End state:** `server/routes/export.js`
**Test:** Tested in Task 017.

---

### Task 016 — Write the server entry point and Dockerfile

**What:** Wire all routes into the Hono app and write the Docker build file.

**Instructions:**

- Create `server/index.js`:
  - `GET /health` — returns `200 { status: 'ok' }` — NO auth required — register BEFORE the JWT middleware
  - Apply `jwtMiddleware` globally to all other routes
  - Mount: `/auth` (no JWT — auth routes handle their own logic), `/sources`, `/cards`, `/search`, `/transcribe`, `/llm`, `/embed`, `/export`
  - Start server on `process.env.PORT || 3001`
  - Log `Watchn't API listening on port X` on startup
  - Note: `/auth` routes bypass JWT — implement this by registering auth routes before the global middleware, or by checking path in middleware
- Create `server/Dockerfile`:
  - Base: `node:20-alpine`
  - `WORKDIR /app`
  - Copy `package.json` + `package-lock.json`, run `npm ci --omit=dev`
  - Copy remaining source files
  - `CMD ["node", "index.js"]`

**Start state:** Tasks 008–015 complete
**End state:** `server/index.js` and `server/Dockerfile` exist
**Test:** `docker compose up --build -d` — all three services start. `curl http://localhost:3001/health` returns `{"status":"ok"}`.

---

### Task 017 — Integration test the full API stack

**What:** Verify every route works end-to-end before writing any extension code.

**Instructions:**

- No new code. Verification task only.
- Run these checks in order:

```bash
# 1. Health — no auth
curl http://localhost:3001/health
# Expect: {"status":"ok"}

# 2. Register
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"testpass123"}'
# Expect: 201 {"id":"...","email":"...","token":"eyJ..."}
# Save the token as TOKEN

# 3. Reject unauthenticated request
curl http://localhost:3001/cards
# Expect: 401

# 4. Create a source
curl -X POST http://localhost:3001/sources \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"platform":"youtube","sourceUrl":"https://youtube.com/watch?v=test","title":"Test Video","channel":"Test"}'
# Expect: 201 {"id":"<sourceId>"}

# 5. Insert a card with a 768-length zeroed vector
curl -X POST http://localhost:3001/cards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"sourceId\":\"<sourceId>\",\"cards\":[{\"title\":\"Test\",\"summary\":\"A summary\",\"insights\":[],\"actions\":[],\"concepts\":[],\"sourceStart\":0,\"sourceEnd\":60,\"tags\":[\"test\"],\"embedding\":[$(python3 -c 'print(",".join(["0.0"]*768))')]}]}"
# Expect: 201 {"cardIds":["<cardId>"]}

# 6. List cards
curl http://localhost:3001/cards \
  -H "Authorization: Bearer $TOKEN"
# Expect: 200 {"cards":[{...}],"total":1}

# 7. Filter by language
curl "http://localhost:3001/cards?lang=en" \
  -H "Authorization: Bearer $TOKEN"
# Expect: 200 with the card (source has default detected_language 'en')

# 8. Search
curl -X POST http://localhost:3001/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"embedding\":[$(python3 -c 'print(",".join(["0.0"]*768))')],\"threshold\":0.0}"
# Expect: 200 {"results":[{...,"score":1}]}

# 9. Export JSON
curl "http://localhost:3001/export?format=json" \
  -H "Authorization: Bearer $TOKEN" -o export.json
# Expect: valid JSON file with cards array

# 10. Export Markdown
curl "http://localhost:3001/export?format=markdown" \
  -H "Authorization: Bearer $TOKEN" -o export.md
# Expect: valid .md file

# 11. LLM proxy (only if Ollama + model is ready; skip otherwise and test post pull-models)
curl -X POST http://localhost:3001/llm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"system":"Reply only in JSON.","user":"{\"hello\":\"world\"}"}'
# Expect: 200 {"content":[{"type":"text","text":"{...}"}]}

# 12. Delete card
curl -X DELETE http://localhost:3001/cards/<cardId> \
  -H "Authorization: Bearer $TOKEN"
# Expect: 200 {"deleted":true}

# 13. User isolation — register second user, verify they see no cards
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"other@test.com","password":"testpass123"}'
# Save token as TOKEN2
curl http://localhost:3001/cards -H "Authorization: Bearer $TOKEN2"
# Expect: 200 {"cards":[],"total":0}
```

**Start state:** Task 016 complete
**End state:** All checks pass
**Test:** The checks above are the test.

---

## Phase 2 — Extension Shell

---

### Task 018 — Initialise the extension package

**What:** Create `extension/package.json` and install build tooling.

**Instructions:**

- Create `extension/package.json`: `"private": true`, `"type": "module"`, scripts: `{ "build": "node ../scripts/build-extension.js", "watch": "node ../scripts/build-extension.js --watch" }`
- Install devDependencies: `esbuild`, `react`, `react-dom`

**Start state:** Task 017 complete
**End state:** `extension/package.json` + `node_modules/` exist
**Test:** `cd extension && npm install` completes. `node_modules/esbuild` exists.

---

### Task 019 — Write the esbuild config

**What:** Bundle all extension entry points in one script.

**Instructions:**

- Create `scripts/build-extension.js`
- Use esbuild JS API. Entry points:
  - `extension/src/background/index.js` → `extension/dist/background/index.js` (`format: 'iife'`)
  - `extension/src/content/youtube.js` → `extension/dist/content/youtube.js` (`format: 'iife'`)
  - `extension/src/content/bridge.js` → `extension/dist/content/bridge.js` (`format: 'iife'`)
  - `extension/src/content/meet.js` → `extension/dist/content/meet.js` (`format: 'iife'`)
  - `extension/src/content/generic.js` → `extension/dist/content/generic.js` (`format: 'iife'`)
  - `extension/src/content/audio-capture.js` → `extension/dist/content/audio-capture.js` (`format: 'iife'`)
  - `extension/src/popup/popup.js` → `extension/dist/popup/popup.js` (`format: 'iife'`)
  - `extension/src/sidepanel/App.jsx` → `extension/dist/sidepanel/app.js` (`format: 'esm'`)
- All: `bundle: true`, `platform: 'browser'`
- Watch mode if `process.argv.includes('--watch')`
- After build: use `fs.cpSync` to copy `extension/src/assets/` → `extension/dist/assets/`, `extension/manifest.json` → `extension/dist/manifest.json`, `extension/src/popup/index.html` + `popup.css` → `extension/dist/popup/`, `extension/src/sidepanel/index.html` → `extension/dist/sidepanel/`

**Start state:** Task 018 complete
**End state:** `scripts/build-extension.js` exists
**Test:** Create a placeholder `extension/src/background/index.js` with `console.log('bg')`. Run `node scripts/build-extension.js`. Verify `extension/dist/background/index.js` exists. Delete placeholder.

---

### Task 020 — Write `manifest.json`

**What:** Manifest V3 with all platforms and permissions declared upfront.

**Instructions:**

- Create `extension/manifest.json` (in `extension/` root, not `src/`)
- Manifest V3, `name: "Watchn't"`, `version: "0.1.0"`
- `permissions`: `["storage", "tabs", "sidePanel", "scripting", "tabCapture"]`
- `host_permissions`:
  ```
  "https://www.youtube.com/*",
  "https://meet.google.com/*",
  "https://open.spotify.com/*",
  "https://podcasts.google.com/*",
  "https://*.buzzsprout.com/*",
  "https://*.simplecast.com/*",
  "http://localhost/*"
  ```
- `background`: `{ "service_worker": "background/index.js", "type": "module" }`
- `content_scripts`:
  - YouTube: matches `https://www.youtube.com/watch*`, js: `["content/bridge.js", "content/youtube.js"]`, `run_at: "document_idle"`
  - Meet: matches `https://meet.google.com/*`, js: `["content/bridge.js", "content/meet.js"]`, `run_at: "document_idle"`
  - Generic (podcasts/other): matches Spotify + Buzzsprout + Simplecast + Google Podcasts, js: `["content/bridge.js", "content/generic.js"]`, `run_at: "document_idle"`
- `action`: `{ "default_popup": "popup/index.html" }`
- `side_panel`: `{ "default_path": "sidepanel/index.html" }`
- `icons`: `{ "16": "assets/icon-16.png", "48": "assets/icon-48.png", "128": "assets/icon-128.png" }`

**Start state:** Task 019 complete
**End state:** `extension/manifest.json` exists
**Test:** Build extension, load unpacked from `extension/dist/` in Chrome. Extension loads with no manifest errors.

---

### Task 021 — Create placeholder icons

**What:** Three valid PNG icons so Chrome doesn't show broken images.

**Instructions:**

- Create `extension/src/assets/`
- Generate three solid-colour PNGs: 16×16, 48×48, 128×128 pixels. Any solid colour. Any tool (even a script using Node's Canvas API or just copying placeholder PNGs).

**Start state:** Task 020 complete
**End state:** Three PNGs in `extension/src/assets/`
**Test:** Rebuild + reload extension. Toolbar shows the icon without a broken image.

---

## Phase 3 — Shared Utilities

---

### Task 022 — Write `shared/constants.js`

**What:** All string constants for the entire extension in one file.

**Instructions:**

- Create `extension/src/shared/constants.js`
- Export:
  - `PLATFORMS`: `{ YOUTUBE: 'youtube', MEET: 'meet', PODCAST: 'podcast', AUDIO: 'audio' }`
  - `AGENT_STEPS`: `{ CAPTURE: 'capture', CONTEXT: 'context', TRANSLATION: 'translation', EXTRACTION: 'extraction', ACTION: 'action', CARD: 'card', ORGANISER: 'organiser', INDEX: 'index' }`
  - `SESSION_STATUS`: `{ IDLE: 'idle', CAPTURING: 'capturing', QUEUED: 'queued', PROCESSING: 'processing', DONE: 'done', ERROR: 'error' }`
  - `MESSAGE_TYPES`: `{ TRANSCRIPT_CHUNK: 'TRANSCRIPT_CHUNK', VIDEO_ENDED: 'VIDEO_ENDED', STATUS_UPDATE: 'STATUS_UPDATE', OPEN_SIDEPANEL: 'OPEN_SIDEPANEL', AUDIO_CHUNK: 'AUDIO_CHUNK', START_AUDIO_CAPTURE: 'START_AUDIO_CAPTURE', STOP_AUDIO_CAPTURE: 'STOP_AUDIO_CAPTURE' }`
  - `STORAGE_KEYS`: `{ SESSIONS: 'sessions', QUEUE: 'queue', CONFIG: 'config', CAPTURE_STATUS: 'captureStatus' }`
  - `LLM_PROVIDERS`: `{ ANTHROPIC: 'anthropic', OLLAMA: 'ollama' }`

**Start state:** Task 021 complete
**End state:** `extension/src/shared/constants.js`
**Test:** `node --input-type=module <<< "import * as c from './extension/src/shared/constants.js'; console.log(Object.keys(c))"` — lists all 6 exported objects.

---

### Task 023 — Write `shared/logger.js`

**What:** Structured logger with level prefixes, silenceable in production.

**Instructions:**

- Create `extension/src/shared/logger.js`
- Export object with `log`, `warn`, `error`, `debug` methods
- Each prepends `[Watchnt][LEVEL]` to the message
- `debug` is a no-op when `process.env.NODE_ENV === 'production'`
- Spread all arguments to underlying `console` method

**Start state:** Task 022 complete
**End state:** `extension/src/shared/logger.js`
**Test:** `node --input-type=module <<< "import logger from './extension/src/shared/logger.js'; logger.log('test', {a:1})"` — outputs `[Watchnt][LOG] test { a: 1 }`.

---

### Task 024 — Write `shared/utils.js`

**What:** Pure utility functions with no browser dependencies.

**Instructions:**

- Create `extension/src/shared/utils.js`
- Export:
  - `chunkArray(arr, size)` — splits array into chunks
  - `formatTimestamp(seconds)` — `HH:MM:SS` string
  - `cleanText(str)` — trims, collapses spaces, removes zero-width chars
  - `truncate(str, maxLength)` — appends `...` if truncated
  - `sleep(ms)` — promise that resolves after ms
  - `generateId()` — 16-char random hex string
  - `buildQueryString(obj)` — converts `{ a: 1, b: 'x' }` to `?a=1&b=x`, skipping null/undefined values

**Start state:** Task 023 complete
**End state:** `extension/src/shared/utils.js`
**Test:** Import in Node and call each function with one sample input. All return expected output.

---

### Task 025 — Write `shared/llm.js`

**What:** The single LLM call wrapper — routes to Anthropic or Ollama based on config.

**Instructions:**

- Create `extension/src/shared/llm.js`
- Export `callLLM({ system, user })` async function:
  - Reads `llmProvider` and `anthropicKey` from `getConfig()` (import from `storage/local.js`)
  - If `llmProvider === 'ollama'` (or `anthropicKey` is not set):
    - Calls `api.post('/llm', { system, user })` (import `api` from `storage/api.js`)
    - Response shape: `{ content: [{ type: 'text', text: '...' }] }`
  - If `llmProvider === 'anthropic'` (default):
    - Fetches directly to `https://api.anthropic.com/v1/messages` with `x-api-key: anthropicKey`, `anthropic-version: "2023-06-01"`
    - Body: `{ model: "claude-sonnet-4-20250514", max_tokens: 4096, system, messages: [{ role: 'user', content: user }] }`
  - In both cases: extracts `content[0].text`, strips markdown code fences, parses JSON, returns parsed object
  - If JSON parse fails: throws with the raw text in the error message
  - If HTTP fails: throws with status + response body

**Start state:** Task 024 complete
**End state:** `extension/src/shared/llm.js`
**Test:** Cannot test in isolation (uses chrome.storage). Tested end-to-end in Phase 7.

---

## Phase 4 — Storage Layer

---

### Task 026 — Write `storage/local.js`

**What:** All `chrome.storage.local` access in one typed module.

**Instructions:**

- Create `extension/src/storage/local.js`
- Export:
  - `getConfig()` → stored config object or `{}`
  - `setConfig(partial)` → merges partial into existing config
  - `getSessions()` → `Map<tabId, SessionState>` reconstructed from storage
  - `setSession(tabId, session)` → upserts by tabId
  - `removeSession(tabId)` → deletes by tabId
  - `getCaptureStatus()` → current status or `null`
  - `setCaptureStatus(status)` → overwrites
  - `onChange(key, callback)` → wraps `chrome.storage.onChanged`, filtered by `STORAGE_KEYS` key

**Start state:** Task 025 complete
**End state:** `extension/src/storage/local.js`
**Test:** Cannot test in Node. Tested in Phase 6.

---

### Task 027 — Write `storage/api.js`

**What:** fetch() wrapper that handles both API key (legacy dev) and JWT auth, pointing to the self-hosted API.

**Instructions:**

- Create `extension/src/storage/api.js`
- Internal `apiCall(method, path, body)`:
  - Reads `apiHost` and `authToken` from `getConfig()`
  - Sets header `Authorization: Bearer ${authToken}` if token exists
  - Sets `Content-Type: application/json`
  - Throws descriptive error if response not ok
  - Returns parsed JSON
- Export `api` object: `{ get(path), post(path, body), delete(path) }`
- Export `checkApiConnection()`: calls `GET /health`, returns `true` on `{ status: 'ok' }`, `false` otherwise
- Export `authApi` object with same shape but targeting `/auth/*` without the JWT header (used for login/register before a token exists)

**Start state:** Task 026 complete
**End state:** `extension/src/storage/api.js`
**Test:** Tested as part of popup setup flow in Phase 8.

---

### Task 028 — Write `storage/embeddings.js`

**What:** Embedding generation and semantic search — routes to Ollama or Anthropic based on config.

**Instructions:**

- Create `extension/src/storage/embeddings.js`
- Export `generateEmbedding(text)`:
  - Reads `llmProvider` and `anthropicKey` from config
  - If `llmProvider === 'ollama'` or no `anthropicKey`: calls `api.post('/embed', { text })`, returns `response.embedding` (768-dim vector)
  - If `llmProvider === 'anthropic'`: calls the Anthropic API with a prompt instructing it to return ONLY a JSON array of 768 floats representing the semantic embedding. Parse, validate length 768, return.
  - NOTE: 768 dimensions are used in both paths for schema compatibility
- Export `semanticSearch(queryText, limit = 20)`:
  - Calls `generateEmbedding(queryText)`
  - Calls `api.post('/search', { embedding, limit, threshold: 0.5 })`
  - Returns `results` array

**Start state:** Task 027 complete
**End state:** `extension/src/storage/embeddings.js`
**Test:** Tested end-to-end in Phase 7.

---

## Phase 5 — Content Scripts

---

### Task 029 — Write `content/bridge.js`

**What:** Message bridge between page context and extension context.

**Instructions:**

- Create `extension/src/content/bridge.js`
- Listen for `window.postMessage` where `event.source === window` and `event.data.source === 'watchnt-page'` — forward to background via `chrome.runtime.sendMessage`
- Listen for `chrome.runtime.onMessage` — forward to page via `window.postMessage` with `source: 'watchnt-extension'`

**Start state:** Task 028 complete
**End state:** `extension/src/content/bridge.js`
**Test:** Load extension, open YouTube, open DevTools console, run `window.postMessage({ source: 'watchnt-page', type: 'TEST' }, '*')`. In background service worker DevTools, verify message arrived.

---

### Task 030 — Write `content/youtube.js` — metadata reader

**What:** Reads video metadata from the YouTube DOM.

**Instructions:**

- Create `extension/src/content/youtube.js`
- Export `readVideoMetadata()`:
  - `videoId` from `window.location.search` (`?v=`)
  - `title` from `document.querySelector('h1.ytd-watch-metadata')` or equivalent
  - `channel` from `document.querySelector('ytd-channel-name yt-formatted-string')` or equivalent
  - `url` from `window.location.href`
  - Returns `{ platform: 'youtube', videoId, title, channel, url }` — fields may be `null`
- At bottom: call `readVideoMetadata()` and `console.log('[Watchnt] Metadata:', result)`

**Start state:** Task 029 complete
**End state:** First half of `content/youtube.js`
**Test:** Rebuild + reload. Open a YouTube video. DevTools console shows `[Watchnt] Metadata: { videoId: ..., title: ..., channel: ..., url: ... }`.

---

### Task 031 — Write `content/youtube.js` — transcript reader

**What:** Adds transcript polling and capture lifecycle to `youtube.js`.

**Instructions:**

- Extend `extension/src/content/youtube.js`
- `waitForTranscriptPanel()`: `MutationObserver` on `document.body` waiting for `ytd-transcript-renderer`, 30-second timeout resolves with `null`
- `collectTranscriptSegments(transcriptEl)`: queries `ytd-transcript-segment-renderer`, returns `[{ startTime: number, text: string }]`
- `startCapture()`:
  - Calls `readVideoMetadata()`
  - Sends `{ type: MESSAGE_TYPES.TRANSCRIPT_CHUNK, phase: 'start', metadata }` via `chrome.runtime.sendMessage`
  - `setInterval` every 10s: collects new segments (not already sent), sends `TRANSCRIPT_CHUNK`
  - On `<video>.ended`: sends `VIDEO_ENDED`, clears interval
- Call `startCapture()` at bottom; import `MESSAGE_TYPES` from `shared/constants.js`

**Start state:** Task 030 complete
**End state:** `content/youtube.js` complete
**Test:** Rebuild + reload. Open a YouTube video with transcript panel open. Background service worker console shows `TRANSCRIPT_CHUNK` messages every 10s. `VIDEO_ENDED` on end.

---

### Task 032 — Write `content/meet.js`

**What:** Reads live captions from a Google Meet call.

**Instructions:**

- Create `extension/src/content/meet.js`
- `readMeetMetadata()`: reads meeting title from `document.title`, URL from `window.location.href`, returns `{ platform: 'meet', title, url, channel: null }`
- `observeCaptions()`:
  - `MutationObserver` on `document.body` waiting for Meet's captions container (`div[jsname="tgaKEf"]` or closest reliable selector — verify by inspecting a live call)
  - On each new caption child node: reads speaker name (if present) and caption text, pushes to a local buffer
  - Flushes buffer as `TRANSCRIPT_CHUNK` every 30 seconds via `chrome.runtime.sendMessage`
- `startMeetCapture()`:
  - Sends `TRANSCRIPT_CHUNK` with `phase: 'start'` + metadata
  - Calls `observeCaptions()`
  - Polls `window.location.href` every 3 seconds — when URL no longer matches `meet.google.com/*/` (meeting ended or left), sends `VIDEO_ENDED`
- Call `startMeetCapture()` at bottom; import `MESSAGE_TYPES`, `PLATFORMS` from `shared/constants.js`

**Start state:** Task 031 complete
**End state:** `extension/src/content/meet.js`
**Test:** Join a solo Google Meet test call. Enable captions (CC button). Background service worker console shows `TRANSCRIPT_CHUNK` messages every 30 seconds. On leaving the call, `VIDEO_ENDED` appears.

---

### Task 033 — Write `content/generic.js`

**What:** Reads captions from any page that exposes `<track>` WebVTT or `aria-live` regions.

**Instructions:**

- Create `extension/src/content/generic.js`
- `findCaptionTrack()`: queries `track[kind="captions"], track[kind="subtitles"]`, returns first found or `null`
- `readTrackCues(trackEl)`: maps `trackEl.track.cues` to `[{ startTime, endTime, text }]`
- `observeAriaLive()`: finds `[aria-live="polite"], [aria-live="assertive"]`, observes mutations, buffers text, flushes every 30 seconds as `TRANSCRIPT_CHUNK`
- `startGenericCapture()`:
  - Reads metadata from `document.title` + `window.location.href`, platform `'podcast'`
  - Sends `TRANSCRIPT_CHUNK` with `phase: 'start'`
  - If `<track>` found: read all existing cues, send them, attach `cuechange` listener for new cues
  - Else: call `observeAriaLive()`
  - `window.beforeunload` → sends `VIDEO_ENDED`
- Call `startGenericCapture()` at bottom

**Start state:** Task 032 complete
**End state:** `extension/src/content/generic.js`
**Test:** Navigate to a podcast site injected by the manifest (e.g. Spotify Web on a podcast episode with captions enabled). Background console shows the script loading and `TRANSCRIPT_CHUNK` messages arriving.

---

### Task 034 — Write `content/audio-capture.js`

**What:** Programmatically-injected script that records tab audio and streams it to the background worker.

**Instructions:**

- Create `extension/src/content/audio-capture.js`
- NOTE: this script is NOT in `content_scripts` in manifest — it is injected on demand via `chrome.scripting.executeScript`
- `startAudioCapture()`:
  - Calls `chrome.tabCapture.capture({ audio: true, video: false })` → `MediaStream`
  - Creates `MediaRecorder` with `mimeType: 'audio/webm;codecs=opus'`
  - Every 60 seconds: converts accumulated `Blob` to base64 via `FileReader`, sends `{ type: MESSAGE_TYPES.AUDIO_CHUNK, audio: base64, mimeType: 'audio/webm', durationSec: 60 }` via `chrome.runtime.sendMessage`
  - On stop: sends final partial chunk + `VIDEO_ENDED`
- `stopAudioCapture()`: stops `MediaRecorder`, releases stream
- Attach both to `window.__watchnt = { startAudioCapture, stopAudioCapture }` so the background worker can call them after injection

**Start state:** Task 033 complete
**End state:** `extension/src/content/audio-capture.js`
**Test:** Tested in Phase 6 Task 038.

---

## Phase 6 — Background Worker

---

### Task 035 — Write `background/session.js`

**What:** Per-tab session state — in-memory + persisted to `chrome.storage.local`.

**Instructions:**

- Create `extension/src/background/session.js`
- In-memory `Map<tabId, SessionState>`
- Export:
  - `createSession(tabId, metadata)` — creates with `status: SESSION_STATUS.CAPTURING`, `chunks: []`, `startedAt: Date.now()`, persists to storage
  - `appendChunks(tabId, segments)` — appends to `session.chunks`, persists
  - `getSession(tabId)` — returns session or `null`
  - `setStatus(tabId, status, extra?)` — updates status + any extra fields, persists, sends `STATUS_UPDATE` message via `chrome.runtime.sendMessage`
  - `removeSession(tabId)` — removes from map + storage
  - `getAllSessions()` — returns array of all sessions
  - `restoreSessions()` — rehydrates in-memory map from `chrome.storage.local` on startup

**Start state:** Task 034 complete
**End state:** `extension/src/background/session.js`
**Test:** Tested in Task 037.

---

### Task 036 — Write `background/queue.js`

**What:** FIFO job queue — processes one pipeline at a time.

**Instructions:**

- Create `extension/src/background/queue.js`
- In-memory `jobQueue` array, `isProcessing` boolean
- Export:
  - `enqueue(session)` — pushes to queue, calls `processNext()` if not processing
  - `processNext()` — if processing or empty, returns; sets `isProcessing = true`, dequeues, calls `onJob(job)`, then `isProcessing = false`, calls `processNext()` again
  - `setJobHandler(fn)` — registers `onJob`
  - `getQueueLength()` — returns queue length

**Start state:** Task 035 complete
**End state:** `extension/src/background/queue.js`
**Test:** In a throwaway Node file, import queue, register a handler that logs + resolves after 100ms, enqueue 3 items, verify they're processed one at a time in order.

---

### Task 037 — Write `background/index.js`

**What:** Service worker entry — routes all messages and tab events.

**Instructions:**

- Create `extension/src/background/index.js`
- On startup (top-level): call `restoreSessions()`, call `setJobHandler(runPipeline)` (import from orchestrator — stub for now)
- On `chrome.runtime.onInstalled`: call `restoreSessions()`
- On `chrome.runtime.onMessage`:
  - `TRANSCRIPT_CHUNK` + `phase: 'start'`: call `createSession(sender.tab.id, message.metadata)`
  - `TRANSCRIPT_CHUNK` + segments: call `appendChunks(sender.tab.id, message.segments)`
  - `VIDEO_ENDED`: call `setStatus(tabId, SESSION_STATUS.QUEUED)`, then `enqueue(getSession(tabId))`
  - `AUDIO_CHUNK`: call `api.post('/transcribe', { audio, mimeType, durationSec })`, on success call `appendChunks(tabId, response.segments)`, on failure log and continue
  - `START_AUDIO_CAPTURE`: call `chrome.scripting.executeScript({ target: { tabId }, files: ['content/audio-capture.js'] })`, then `createSession(tabId, { platform: 'audio', title: tab.title, url: tab.url })`
  - `STOP_AUDIO_CAPTURE`: call `chrome.scripting.executeScript` to run `window.__watchnt.stopAudioCapture()` in the tab
  - `OPEN_SIDEPANEL`: call `chrome.sidePanel.open({ tabId: sender.tab.id })`
- On `chrome.tabs.onUpdated`: create session for YouTube watch URLs + Meet URLs; remove stale sessions on navigation away
- On `chrome.tabs.onRemoved`: call `removeSession(tabId)`

**Start state:** Task 036 complete
**End state:** `extension/src/background/index.js`
**Test:** Rebuild + reload. Open a YouTube video, watch background console — `createSession` and `appendChunks` log. End video — session queued.

---

### Task 038 — Write `background/orchestrator.js` (stub)

**What:** A placeholder pipeline that logs and waits — replaced in Phase 7.

**Instructions:**

- Create `extension/src/background/orchestrator.js`
- Export `runPipeline(session)`: log `[Watchnt][Orchestrator] Starting pipeline for: ${session.title}`, call `sleep(2000)`, log `[Watchnt][Orchestrator] Pipeline complete (stub)`, return

**Start state:** Task 037 complete
**End state:** `extension/src/background/orchestrator.js` (stub)
**Test:** Rebuild + reload. Open YouTube, seek to end. Background console shows orchestrator stub start + complete.

---

## Phase 7 — Agents

Each agent is wired into the orchestrator immediately after being written, so each one is testable on real content before the next is built.

---

### Task 039 — Write `agents/captureAgent.js`

**What:** Cleans and segments raw transcript chunks.

**Instructions:**

- Create `extension/src/agents/captureAgent.js`
- Export `runCaptureAgent(session)`:
  - Merges `session.chunks` into a time-ordered string
  - Calls `callLLM` with system prompt: remove filler words, fix run-ons, group into ~300–400 word blocks, return JSON `{ cleanedBlocks: [{ text, startTime, endTime }] }`
  - Validates `cleanedBlocks` is a non-empty array
  - Returns validated output

**Start state:** Task 038 complete
**End state:** `extension/src/agents/captureAgent.js`
**Test:** Replace orchestrator stub body with `const result = await runCaptureAgent(session); console.log(result)`. Run on a real YouTube video. Output has clean blocks with timestamps.

---

### Task 040 — Write `agents/contextAgent.js`

**What:** Identifies content type, topic, entities, and spoken language.

**Instructions:**

- Create `extension/src/agents/contextAgent.js`
- Export `runContextAgent({ session, cleanedBlocks })`:
  - Passes first 2 blocks + video title + channel to `callLLM`
  - System prompt: return JSON `{ contentType, primaryTopic, audience, entities: string[], detectedLanguage: string (ISO 639-1), languageConfidence: number (0-1) }`
  - Valid `contentType`: `tutorial`, `interview`, `lecture`, `talk`, `podcast`, `other`
  - Validate shape, return

**Start state:** Task 039 complete
**End state:** `extension/src/agents/contextAgent.js`
**Test:** Add to orchestrator after captureAgent. Verify it correctly identifies language and content type.

---

### Task 041 — Write `agents/translationAgent.js`

**What:** Translates non-English blocks to English before extraction — skips the LLM call for English content.

**Instructions:**

- Create `extension/src/agents/translationAgent.js`
- Export `runTranslationAgent({ cleanedBlocks, detectedLanguage, languageConfidence })`:
  - If `detectedLanguage === 'en'` OR `languageConfidence < 0.7`: return `{ cleanedBlocks }` unchanged — no LLM call
  - Otherwise: call `callLLM` with a prompt that translates each block's `text` field from `detectedLanguage` to English, preserving `startTime` and `endTime`
  - Returns `{ cleanedBlocks }` in the same shape

**Start state:** Task 040 complete
**End state:** `extension/src/agents/translationAgent.js`
**Test:** Add to orchestrator after contextAgent. Process a non-English video with captions. Log output — all block texts should be in English.

---

### Task 042 — Write `agents/extractionAgent.js`

**What:** Extracts insights, quotes, and concepts from the (now English) blocks.

**Instructions:**

- Create `extension/src/agents/extractionAgent.js`
- Export `runExtractionAgent({ cleanedBlocks, context })`:
  - Passes all block texts + context to `callLLM`
  - System prompt: extract max 10 insights, max 5 notable quotes, key concepts/terms with definitions. Return JSON: `{ insights: [{ text, blockIndex, importance: 1-5 }], quotes: [{ text, blockIndex }], concepts: [{ term, definition }] }`
  - Validate and return

**Start state:** Task 041 complete
**End state:** `extension/src/agents/extractionAgent.js`
**Test:** Add to orchestrator. Log output. Insights are meaningful and relevant to the video.

---

### Task 043 — Write `agents/actionAgent.js`

**What:** Detects tasks, decisions, questions, and resources.

**Instructions:**

- Create `extension/src/agents/actionAgent.js`
- Export `runActionAgent({ cleanedBlocks, insights })`:
  - Passes blocks + insights to `callLLM`
  - System prompt: find explicit action items, decisions made/announced, questions raised but unanswered, external resources/tools/links mentioned. Return JSON: `{ actions: [{ text, owner: string|null, deadline: string|null }], decisions: string[], questions: string[], resources: [{ title, url: string|null }] }`
  - Validate and return

**Start state:** Task 042 complete
**End state:** `extension/src/agents/actionAgent.js`
**Test:** Add to orchestrator. For a tutorial video, verify steps and tools are surfaced as actions.

---

### Task 044 — Write `agents/cardAgent.js`

**What:** Structures all prior outputs into 1–5 knowledge cards.

**Instructions:**

- Create `extension/src/agents/cardAgent.js`
- Export `runCardAgent({ context, insights, actions, cleanedBlocks })`:
  - Passes all prior outputs to `callLLM`
  - System prompt: create 1–5 knowledge cards, each representing one coherent unit. Return JSON: `{ cards: [{ title, summary, insights: string[], actions: string[], concepts: string[], sourceStart: number, sourceEnd: number }] }`
  - Validate: `cards` non-empty, each has `title` and `summary`
  - Return validated cards

**Start state:** Task 043 complete
**End state:** `extension/src/agents/cardAgent.js`
**Test:** Add to orchestrator. Log cards. Verify 1–5 cards with clear titles and meaningful summaries.

---

### Task 045 — Write `agents/organiserAgent.js`

**What:** Assigns tags and a category to each card.

**Instructions:**

- Create `extension/src/agents/organiserAgent.js`
- Export `runOrganiserAgent({ cards, context })`:
  - Passes cards + context to `callLLM`
  - System prompt: assign 2–5 tags per card (lowercase, short phrases), and one primary category from `["engineering", "design", "business", "science", "health", "finance", "productivity", "other"]`. Return JSON: `{ cards: [...cardsWithTags], category: string }`
  - Merge tags into each card object
  - Validate and return

**Start state:** Task 044 complete
**End state:** `extension/src/agents/organiserAgent.js`
**Test:** Add to orchestrator. Each card has `tags` array. Response has `category`.

---

### Task 046 — Write `agents/indexAgent.js`

**What:** Generates embeddings and writes everything to the API — the final agent in the pipeline.

**Instructions:**

- Create `extension/src/agents/indexAgent.js`
- Export `runIndexAgent({ session, context, cards, category })`:
  1. Call `api.post('/sources', { platform: session.platform, sourceUrl: session.url, title: session.title, channel: session.channel, contentType: context.contentType, primaryTopic: context.primaryTopic, detectedLanguage: context.detectedLanguage })` — store `sourceId`
  2. For each card: call `generateEmbedding(card.title + ' ' + card.summary + ' ' + card.insights.join(' '))` — attach as `card.embedding`
  3. Call `api.post('/cards', { sourceId, cards })` — store `cardIds`
  4. Return `{ sourceId, cardIds, status: 'indexed' }`
  - Log each step

**Start state:** Task 045 complete
**End state:** `extension/src/agents/indexAgent.js`
**Test:** Add to orchestrator. Process a real YouTube video. `curl http://localhost:3001/cards -H "Authorization: Bearer $TOKEN"` returns the cards.

---

### Task 047 — Write `agents/index.js` and complete the orchestrator

**What:** Wire all 8 agents into the production pipeline, replacing the stub.

**Instructions:**

- Create `extension/src/agents/index.js`:
  - Import all 8 agents
  - Export `runPipeline(session)`:
    ```
    captureAgent → contextAgent → translationAgent → extractionAgent
    → actionAgent → cardAgent → organiserAgent → indexAgent
    ```
  - Before each step: call `setCaptureStatus({ tabId: session.tabId, step: AGENT_STEPS.X, progress: N/8 })`
  - On success: `setStatus(tabId, SESSION_STATUS.DONE)`, `removeSession(tabId)`
  - On any error: `setStatus(tabId, SESSION_STATUS.ERROR, { errorMessage: err.message })`, do NOT rethrow — let the queue continue
- Update `background/orchestrator.js` to simply re-export `runPipeline` from `agents/index.js`

**Start state:** Task 046 complete
**End state:** Full 8-agent pipeline running
**Test:** Open a YouTube video with transcript. Seek to end. Background console shows all 8 agent steps logging. `GET /cards` returns real knowledge cards from the video.

---

## Phase 8 — Popup UI

---

### Task 048 — Write popup HTML and CSS

**What:** Static structure and styles for the popup — covers all states including login and audio capture.

**Instructions:**

- Create `extension/src/popup/index.html`:
  - Shell with title "Watchn't", links `popup.css`, loads `popup.js`
  - `<div id="app">` containing:
    - `<div id="login-view">` — email/password form + register link
    - `<div id="setup-view">` — API host + LLM provider selection (shown after login, first run)
    - `<div id="status-view">` — live capture status + audio capture toggle
    - `<div id="idle-view">` — "Open Library" button
- Create `extension/src/popup/popup.css`:
  - Dark background `#0f0f0f`, white text, width 320px, no external fonts
  - Style: all four views, progress bar, status badges (capturing/processing/done/error), primary button, radio groups, toggle button for audio capture

**Start state:** Task 047 complete
**End state:** HTML + CSS in `extension/src/popup/`
**Test:** Build + load extension. Click toolbar icon. Popup opens with no console errors.

---

### Task 049 — Write `popup/popup.js`

**What:** Full popup logic — login, setup, status display, audio capture toggle.

**Instructions:**

- Create `extension/src/popup/popup.js`
- On load:
  1. `getConfig()` — if no `authToken`, show `#login-view`, hide others
  2. If `authToken` exists but no `apiHost` or `llmProvider`, show `#setup-view`
  3. Else: check current tab URL — YouTube or Meet → show `#status-view`; other → show `#idle-view`
  4. Read `captureStatus` and render step + progress bar in `#status-view`
- Login form submit: calls `authApi.post('/auth/login', { email, password })`, stores `authToken` via `setConfig`, re-renders. "Register" link calls `/auth/register` instead.
- Setup form:
  - `apiHost` input (default `http://localhost:3001`)
  - Radio group: "LLM Provider — ◉ Anthropic API ○ Local (Ollama)"
  - When Anthropic selected: show `anthropicKey` input
  - When Ollama selected: hide key input, show "Make sure `docker compose up` is running"
  - Submit: calls `checkApiConnection()` — show error if fails; else `setConfig({ apiHost, llmProvider, anthropicKey })`, advance to status or idle view
- `#status-view` audio capture toggle:
  - Shows only when current tab is NOT YouTube or Meet
  - "Enable Audio Capture" → sends `START_AUDIO_CAPTURE`, button becomes "Stop Audio Capture"
  - "Stop Audio Capture" → sends `STOP_AUDIO_CAPTURE`
- `#idle-view` "Open Library" button → sends `OPEN_SIDEPANEL`
- `chrome.storage.onChanged` listener → re-renders status in real time

**Start state:** Task 048 complete
**End state:** Fully functional popup
**Test:**

- First load: shows login form
- After login + setup: shows correct view based on current tab
- On YouTube during capture: shows Capturing → Processing (step names) → Done
- On a non-YouTube/Meet page: shows "Enable Audio Capture" toggle
- Clicking "Open Library" opens the side panel

---

## Phase 9 — Side Panel (Knowledge Library)

---

### Task 050 — Write side panel HTML shell and mount React

**What:** Entry point for the library app.

**Instructions:**

- Create `extension/src/sidepanel/index.html`: dark background `#0f0f0f`, `<div id="root"></div>`, script tag for `app.js` (type module)
- Create `extension/src/sidepanel/App.jsx`: minimal React component rendering `<h1>Watchn't</h1><p>Library loading...</p>`. Mount to `#root`.

**Start state:** Task 049 complete
**End state:** Side panel opens and renders "Library loading..."
**Test:** Click "Open Library". Side panel opens. No console errors.

---

### Task 051 — Write `hooks/useCards.js`

**What:** Paginated card fetching with filter support.

**Instructions:**

- Create `extension/src/sidepanel/hooks/useCards.js`
- Export `useCards(filters)`:
  - `filters`: `{ type, tag, q, lang, page }`
  - On mount + filter change: calls `api.get('/cards?' + buildQueryString(filters))`
  - Manages `cards`, `total`, `loading`, `error` state
  - `loadMore()`: increments page, appends results
  - Returns `{ cards, total, loading, error, loadMore }`

**Start state:** Task 050 complete
**End state:** `useCards.js`
**Test:** Use in `App.jsx`, `console.log` the cards. Open side panel after processing at least one video. Cards appear in console.

---

### Task 052 — Write `hooks/useSearch.js`

**What:** Semantic search with full-text fallback.

**Instructions:**

- Create `extension/src/sidepanel/hooks/useSearch.js`
- Export `useSearch()`:
  - State: `query`, `results`, `loading`, `error`
  - `search(queryText)`:
    - `< 3` chars: `api.get('/cards?q=' + queryText)` (full-text)
    - `≥ 3` chars: `semanticSearch(queryText)` from `storage/embeddings.js`
    - Sets `results`
  - Debounce: 400ms via `useEffect` + `setTimeout`
  - Returns `{ query, setQuery, results, loading, error }`

**Start state:** Task 051 complete
**End state:** `useSearch.js`
**Test:** Wire into `App.jsx` with plain `<input>`, log results. Type a concept from a processed video. Results appear.

---

### Task 053 — Write `components/KnowledgeCard.jsx`

**What:** Renders a single knowledge card with all sections.

**Instructions:**

- Create `extension/src/sidepanel/components/KnowledgeCard.jsx`
- Props: `{ card }` — card includes `title`, `summary`, `insights`, `actions`, `concepts`, `source_start`, `source_end`, `created_at`, `source_title`, `channel`, `platform`, `source_url`
- Render:
  - Title (bold, large)
  - Source badge (see below) — platform + channel
  - Summary paragraph
  - Collapsible "Key Insights" (toggle on click)
  - Collapsible "Actions" (toggle on click, renders as `[ ]` checkboxes visually)
  - Tags row — small pill badges
  - Timestamp: `from [HH:MM:SS] → [HH:MM:SS]`
  - "Jump to source" link: for YouTube → `source_url + &t=source_start`; for Meet/podcast/audio → omit the link, show platform label only
- Platform badge colours: YouTube → red, Meet → green, Podcast → purple, Audio → orange
- Use inline styles only — no external CSS

**Start state:** Task 052 complete
**End state:** `KnowledgeCard.jsx`
**Test:** Hardcode a mock card in `App.jsx`. All sections render. Collapsible sections toggle. YouTube card shows jump link. Meet card does not.

---

### Task 054 — Write `components/SearchBar.jsx`

**What:** Full-width search input with loading state.

**Instructions:**

- Create `extension/src/sidepanel/components/SearchBar.jsx`
- Props: `{ value, onChange, loading }`
- Full-width dark `<input>`, placeholder "Search your knowledge...", subtle spinner when `loading`, hint text: "Semantic search — try concepts, not just keywords"
- Inline styles, dark theme

**Start state:** Task 053 complete
**End state:** `SearchBar.jsx`
**Test:** Add to `App.jsx`. Visual check.

---

### Task 055 — Write `components/FilterBar.jsx`

**What:** Filter controls for content type, tag, and language.

**Instructions:**

- Create `extension/src/sidepanel/components/FilterBar.jsx`
- Props: `{ filters, onChange }` where `filters = { type, tag, lang }`
- Renders:
  - `<select>` for content type: All, Tutorial, Interview, Lecture, Talk, Podcast, Other
  - `<select>` for language: All Languages, English, French, Spanish, German, Portuguese, Japanese, Chinese, Other
  - Text input for tag filter
- Calls `onChange({ type, tag, lang })` on any change
- Dark theme inline styles

**Start state:** Task 054 complete
**End state:** `FilterBar.jsx`
**Test:** Add to `App.jsx`. Change each control. Verify `onChange` fires with correct values.

---

### Task 056 — Write `components/EmptyState.jsx`

**What:** Empty library state with onboarding message.

**Instructions:**

- Create `extension/src/sidepanel/components/EmptyState.jsx`
- No props
- Centred layout: simple inline SVG icon (book, brain, or similar), heading "No knowledge captured yet.", subline "Open a YouTube video, start a Google Meet call, or enable Audio Capture on any page."
- Inline styles, dark theme

**Start state:** Task 055 complete
**End state:** `EmptyState.jsx`
**Test:** Render temporarily in `App.jsx`. Visual check.

---

### Task 057 — Assemble the full `App.jsx`

**What:** Wire all components, hooks, and the export button into the final side panel.

**Instructions:**

- Rewrite `extension/src/sidepanel/App.jsx` fully:
  - State: `searchQuery`, `filters` (type/tag/lang), `exportDropdownOpen`
  - `useSearch()` and `useCards(filters)` — show search results when query is non-empty, else card list
  - Layout:
    - **Top bar**: `<SearchBar>` + "Export" button
    - **Below search**: `<FilterBar>` (hidden during active search)
    - **Main**: spinner | error message | `<EmptyState>` | card grid
  - Card grid: simple CSS grid wrapper inline (no separate component)
  - Infinite scroll: `IntersectionObserver` on a sentinel div → calls `loadMore()`
  - Export dropdown (shown when button clicked):
    - "Export as JSON" → `api.get('/export?format=json')` → blob download as `watchnt-export.json`
    - "Export as Markdown" → `api.get('/export?format=markdown')` → blob download as `watchnt-export.md`
    - Use `URL.createObjectURL` + programmatic `<a>` click, revoke after
    - Show "Downloading..." while in flight

**Start state:** Tasks 051–056 complete
**End state:** Complete, functional side panel
**Test:**

- Cards from processed videos render
- Search returns semantic results
- Filters narrow the list by type, language, and tag
- Scrolling to bottom loads more cards
- Export JSON → file downloads with valid JSON
- Export Markdown → file downloads with `.md` content

---

## Phase 10 — End-to-End Verification

---

### Task 058 — Full E2E smoke test: YouTube

**What:** Cold-start verification of the core YouTube flow.

**Instructions:**

- No new code. Verification task.

1. `docker compose down -v` — wipe all data
2. `docker compose up --build -d`
3. `npm run pull-models` (if Ollama LLM is desired; skip if using Anthropic only)
4. Rebuild extension: `node scripts/build-extension.js`
5. Reload extension in Chrome
6. Click toolbar icon → login form appears
7. Register a new account → logged in
8. Setup form: enter `apiHost`, choose LLM provider, enter key if Anthropic
9. Open side panel → `<EmptyState>` showing
10. Navigate to a YouTube video with transcript (tech talk or tutorial)
11. Open transcript panel via `...` menu
12. Seek to end of video
13. Popup cycles: Capturing → Processing (each agent step named) → Done
14. Side panel shows knowledge cards
15. Click a card — insights and actions expand
16. Search a concept from the video — relevant card surfaces
17. Click "Jump to source" — YouTube opens at correct timestamp
18. Export as JSON — file downloads with cards

**Start state:** All prior tasks complete
**End state:** All 18 steps pass
**Test:** The 18 steps above.

---

### Task 059 — E2E test: Google Meet

**What:** Verify Meet capture produces cards.

**Instructions:**

- No new code.

1. Start a solo Google Meet test call (`meet.google.com/new`)
2. Enable live captions (CC button in Meet toolbar)
3. Talk or play audio for 1–2 minutes
4. Leave the meeting
5. Popup shows Processing → Done
6. Side panel shows cards with green "Google Meet" badge
7. Cards have no "Jump to source" link
8. `GET /cards` returns cards with `platform: 'meet'`

**Start state:** Task 058 complete
**End state:** Meet cards appear in the library
**Test:** The 8 steps above.

---

### Task 060 — E2E test: Podcast / generic capture

**What:** Verify generic WebVTT or aria-live capture works on a supported podcast site.

**Instructions:**

- No new code.

1. Navigate to a podcast episode on Spotify Web or another injected site that has captions
2. Enable captions if available
3. Play for 2 minutes
4. Close the tab
5. Cards appear in side panel with purple "Podcast" badge

**Start state:** Task 059 complete
**End state:** Podcast cards appear in the library
**Test:** `GET /cards` returns cards with `platform: 'podcast'`

---

### Task 061 — E2E test: Audio capture

**What:** Verify manual audio capture on a non-captioned page produces cards.

**Instructions:**

- No new code.

1. Navigate to any page with audio playing (Vimeo video, embedded audio, etc.)
2. Click toolbar icon → "Enable Audio Capture" button visible
3. Click it
4. Let audio play for 2+ minutes
5. Click "Stop Audio Capture"
6. Popup cycles to Done
7. Side panel shows cards with orange "Audio" badge

**Start state:** Task 060 complete
**End state:** Audio capture cards appear in library
**Test:** `GET /cards` returns cards with `platform: 'audio'`

---

### Task 062 — E2E test: Multilingual content

**What:** Verify non-English content is detected, translated, and cards appear in English.

**Instructions:**

- No new code.

1. Find a YouTube video with captions in a non-English language (French, Spanish, German, etc.)
2. Open transcript panel
3. Seek to end
4. Cards appear in English in the side panel
5. Check the source row: `detected_language` is the correct ISO code (not `'en'`)
6. In side panel, use language filter — filter by the source language shows the card; filter by English does not

**Start state:** Task 061 complete
**End state:** Multilingual pipeline works end-to-end
**Test:** The 6 steps above.

---

### Task 063 — E2E test: Multi-user isolation

**What:** Verify two users on the same instance see only their own data.

**Instructions:**

- No new code.

1. In Chrome, logged in as User A, process a YouTube video → cards appear
2. Open an incognito window, load the extension, register User B
3. User B opens side panel → `<EmptyState>` (no cards from User A visible)
4. User B processes a different video → only User B's cards appear
5. Back in User A's window → only User A's cards appear
6. User A exports → only User A's cards in the export file

**Start state:** Task 062 complete
**End state:** Data isolation confirmed across two users
**Test:** The 6 steps above.

---

### Task 064 — E2E test: Ollama full-local mode

**What:** Verify the system works entirely offline with Ollama.

**Instructions:**

- No new code.

1. In popup setup, switch LLM provider to "Local (Ollama)" — remove Anthropic key
2. Disconnect from the internet (or block `api.anthropic.com` in `/etc/hosts`)
3. Process a YouTube video end-to-end
4. Cards appear — quality may differ from Anthropic but structure is correct
5. Search works (embeddings generated locally via nomic-embed-text)
6. Reconnect internet, switch back to Anthropic → verify it works again

**Start state:** Task 063 complete (Ollama models pulled via `npm run pull-models`)
**End state:** Full pipeline works without Anthropic
**Test:** The 6 steps above.

---

### Task 065 — Error handling audit

**What:** Verify the system degrades gracefully across all common failure modes.

**Instructions:**

- No new code unless a gap is found. Test each scenario:

1. **API server down**: `docker compose stop api` → process a video → popup shows Error, not silent failure → `docker compose start api` → extension recovers
2. **Bad credentials**: change `authToken` in storage to garbage → next API call shows auth error in popup → re-login fixes it
3. **YouTube video with no transcript**: the `waitForTranscriptPanel()` timeout fires → system stays idle, no crash
4. **LLM API error**: set wrong `anthropicKey` → pipeline fails at captureAgent → Error status in popup with message → fixing key and reprocessing works
5. **Ollama down**: switch to Ollama mode, stop transcriber container → processing fails gracefully → switching back to Anthropic works
6. **Audio capture on unsupported page**: click "Enable Audio Capture" on a page with no audio → MediaRecorder produces empty chunks → VIDEO_ENDED eventually fires → pipeline runs (may produce empty/minimal cards)

- For each: error must be visible to the user (not silent), and the extension must recover cleanly.

**Start state:** Task 064 complete
**End state:** All 6 failure modes produce visible errors and clean recovery
**Test:** The 6 scenarios above.

---

### Task 066 — Build and package the extension

**What:** Production build + distributable zip.

**Instructions:**

- Create `scripts/package-extension.js`:
  - Sets `NODE_ENV=production` (strips `logger.debug` calls via esbuild define)
  - Runs the build
  - Zips `extension/dist/` into `watchnt-extension-v0.1.0.zip` at repo root using Node's `fs` + a zip library (install `archiver` as a root devDependency)
  - Logs zip file size
- Add `"package": "node scripts/package-extension.js"` to root `package.json`
- Verify zip contains: `manifest.json`, `background/index.js`, `content/bridge.js`, `content/youtube.js`, `content/meet.js`, `content/generic.js`, `content/audio-capture.js`, `popup/`, `sidepanel/`, `assets/`

**Start state:** Task 065 complete
**End state:** `watchnt-extension-v0.1.0.zip` — distributable extension
**Test:** Unzip to a fresh folder. Load unpacked in Chrome. Run the YouTube E2E smoke test (Task 058 steps 6–18). Everything passes on the packaged build.

---

## Summary Table

| Phase                 | Tasks   | Deliverable                                                                                                    |
| --------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| 0 — Repo & Env        | 001–004 | Monorepo, Docker Compose (Postgres + API + Ollama), schema (all tables), model pull script                     |
| 1 — API Server        | 005–017 | Full API: JWT auth, sources, cards, search, transcribe, LLM proxy, embed, export                               |
| 2 — Extension Shell   | 018–021 | Extension scaffold, build pipeline, manifest (all platforms), icons                                            |
| 3 — Shared Utilities  | 022–025 | Constants (all), logger, utils, LLM wrapper (Anthropic + Ollama routing)                                       |
| 4 — Storage Layer     | 026–028 | local.js, api.js (JWT), embeddings.js (Anthropic + Ollama routing)                                             |
| 5 — Content Scripts   | 029–034 | YouTube, Google Meet, Generic/WebVTT, Audio capture                                                            |
| 6 — Background Worker | 035–038 | Session management, queue, full message routing (all platforms + audio), orchestrator stub                     |
| 7 — Agents            | 039–047 | All 8 agents: capture, context (+ language detection), translation, extraction, action, card, organiser, index |
| 8 — Popup UI          | 048–049 | Login, setup (LLM toggle), status, audio capture toggle                                                        |
| 9 — Side Panel        | 050–057 | Full library: search, filters (type/lang/tag), all card types, export (JSON + Markdown)                        |
| 10 — Verification     | 058–066 | E2E tests: YouTube, Meet, Podcast, Audio, Multilingual, Multi-user, Ollama, error handling, packaged zip       |

**Total: 66 tasks. Everything ships.**
