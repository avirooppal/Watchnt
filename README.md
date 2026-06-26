# Watchn't Copilot - Developer Documentation

Watchn't automatically turns everything you watch, listen to, and discuss into organized notes, insights, action items, and searchable knowledge so you never have to manually take notes again.

## V2 Architecture

Watchn't is built on a scalable, offline-capable V2 architecture utilizing the following components:

1. **Frontend Extension:** A React-based Manifest V3 Chrome extension that captures DOM data and local audio, featuring full offline resilience.
2. **FastAPI Web Server:** The primary API gateway handling HTTP ingress and WebSocket events.
3. **Celery AI Worker:** A robust background queue processing heavy ML workloads (transcription, diarization, LLM extraction).
4. **Data Layer:** PostgreSQL with `pgvector` for semantic search, Redis for Celery brokering, and MinIO for audio blob storage.

---

## Prerequisites

Ensure you have the following installed on your host machine:

- **Node.js** (v18+) and **pnpm** (For the Frontend Monorepo)
- **Python** (v3.11+) and **Poetry** (For the Backend API/Workers)
- **Docker & Docker Compose** (For databases and ML containerization)
- **Google Chrome** (For testing the extension)

---

## Getting Started

### 1. Build the Extension (Frontend)

The frontend is managed as a Turborepo monorepo.

```bash
# Install dependencies
pnpm install

# Build the extension for production
pnpm --filter extension run build

# Alternatively, run in watch mode for development
pnpm --filter extension run dev
```

To load the extension into Chrome:
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right.
3. Click "Load unpacked" and select the `apps/extension/dist` directory.

### 2. Start the Backend Infrastructure (Docker)

The entire backend (Postgres, Redis, MinIO, FastAPI, and Celery) has been containerized for local development.

```bash
# Start all services in the background
make dev
```

The FastAPI Swagger UI will be available at: `http://localhost:8000/docs`

### 3. Monitoring and Logging

If you encounter errors in the ML pipeline or want to track the transcription process, you can tail the logs via the provided Makefile commands:

```bash
# Tail all container logs
make dev-logs

# Tail only the FastAPI web server
make dev-logs-api

# Tail only the Celery AI worker
make dev-logs-worker
```

### 4. Stopping the Environment

To gracefully shut down the development environment without losing database state:

```bash
make dev-stop
```

To completely destroy the environment and wipe all local databases and object storage:

```bash
make dev-clean
```

---

## Directory Structure

- `apps/`
  - `extension/`: The React/Vite Manifest V3 Chrome Extension.
  - `web/`: Next.js Web Dashboard (To be built).
- `packages/`: Shared TS/JS monorepo configurations.
- `server/`: The Python Backend.
  - `app/api/`: FastAPI route handlers.
  - `app/workers/`: Celery tasks for Audio Transcription and Speaker Diarization.
  - `app/ai/`: Prompts and LLM interfaces via `litellm`.
  - `app/services/`: Export generators (Markdown, PDF, JSON).

---

## License

MIT
