# PROJECT.md — Watchn't V2

> **Document Type**: Product & Project Definition  
> **Status**: Approved  
> **Version**: 2.0.0  
> **Last Updated**: June 26, 2026  
> **Source of Truth**: [`SPEC.md`](./SPEC.md)

---

## Table of Contents

1. [Vision](#1-vision)
2. [Mission](#2-mission)
3. [Product Philosophy](#3-product-philosophy)
4. [Design Principles](#4-design-principles)
5. [Goals](#5-goals)
6. [Non-Goals](#6-non-goals)
7. [User Personas](#7-user-personas)
8. [Primary Workflows](#8-primary-workflows)
9. [Success Metrics](#9-success-metrics)
10. [Product Scope](#10-product-scope)
11. [Future Vision](#11-future-vision)

---

## 1. Vision

Watchn't is an AI Meeting Copilot that functions as an intelligent employee attending every meeting. It listens, understands, remembers, and distills the content of conversations into structured, searchable, and actionable organizational memory.

The long-term vision is a system that allows any person or team to ask questions like "What did we decide about the Q3 roadmap?" or "Which open action items are assigned to Sarah?" and receive accurate, sourced answers drawn from months of meeting history — without requiring anyone to take notes, write summaries, or maintain a knowledge base manually.

Watchn't treats captured knowledge as a first-class asset. Every meeting is an input. The output is a growing, queryable organizational brain.

---

## 2. Mission

Build the most capable, privacy-respecting, open-source AI Meeting Copilot available.

The product must:

- Work entirely through a Chrome extension — no bots joining video calls.
- Process audio locally or via user-controlled APIs, never routing data through Watchn't infrastructure.
- Give users complete ownership of their data, including the ability to export, delete, and self-host.
- Support any LLM provider the user configures, including locally-running models.

This is not a SaaS product with a lock-in strategy. It is a professional tool built for teams that take privacy, data ownership, and vendor independence seriously.

---

## 3. Product Philosophy

### Server-Side Intelligence

All AI processing — transcription, diarization, summarization, embedding — runs on the server (or on the user's own self-hosted server). The browser is a thin client responsible only for audio capture and UI rendering. This separation ensures that browser resource limits, extension sandboxing, and tab lifecycle do not affect the quality or completeness of AI output.

### Python Backend, TypeScript Frontend

The AI and ML ecosystem is Python-first. Using Python for all backend services eliminates the need for cross-language bridges or separate microservice processes for AI workloads. The frontend (web app and extension) is TypeScript to preserve type safety across the stack without introducing Python to the client layer.

### Schema-First API Design

All API contracts are defined as Pydantic models before any implementation begins. This means the API surface is always documented, always typed, and always enforced. No implicit duck-typing, no undocumented payloads.

### Explicit Over Implicit

Every behavior must be traceable from the source code. No hidden state, no magic frameworks, no convention-over-configuration that obscures what is actually happening. If behavior is not obvious from reading the code, it must be documented in a comment.

### Fail Loud, Recover Gracefully

Errors must be logged with full context and surfaced to operators. Partial failures — a single audio chunk failing to transcribe, a diarization job timing out — must not corrupt the broader meeting record. The system should degrade gracefully and retry where appropriate.

### Composition Over Inheritance

Business logic is implemented through dependency injection and service composition. Class inheritance is never used for business logic. Every service is independently testable by injecting mocked dependencies.

---

## 4. Design Principles

The following principles govern every product and engineering decision. When two principles conflict, resolve the conflict explicitly and document why.

| # | Principle | What It Means in Practice |
|---|---|---|
| 1 | **User owns their data** | All meeting data is stored on infrastructure the user controls. No Watchn't servers ever receive or process user audio or transcripts. |
| 2 | **Privacy by default** | No analytics, no telemetry, no third-party tracking embedded in the product. Opt-in only. |
| 3 | **Vendor independence** | No hard dependency on any single LLM provider, cloud provider, or hosted service. Every external dependency must be swappable. |
| 4 | **Progressive disclosure** | The default experience is simple. Power features are available but not imposed on new users. |
| 5 | **Reliability over features** | A feature that works 100% of the time beats three features that each work 80% of the time. |
| 6 | **Testability at boundaries** | Test the interfaces between modules, not the internal implementation. Tests are the primary consumer of the public API. |
| 7 | **Ship behind flags** | Features ship behind feature flags. Long-lived branches do not exist. The main branch is always deployable. |
| 8 | **Explicit error contracts** | Every error has a named type, a human-readable message, and an HTTP status code. No generic 500 errors in production. |

---

## 5. Goals

### V2 MVP Goals

These goals define what success looks like at the V2 MVP milestone. All engineering decisions should be evaluated against whether they advance or impede these goals.

**G1 — End-to-End Meeting Processing**  
A user should be able to start the Chrome extension, join a video call, and have the system automatically produce a complete meeting record (transcript + speaker labels + summary + action items + decisions) within 60 seconds of the meeting ending.

**G2 — Semantic Search**  
A user should be able to search their meeting history using natural language and receive relevant, ranked results with snippet highlights. Search should work across all meetings the user has captured.

**G3 — RAG Chat**  
A user should be able to ask questions about their meeting history in a chat interface and receive accurate, grounded answers with citations pointing to the source meetings.

**G4 — Email Reports**  
After each meeting, participants should automatically receive an HTML email containing the summary, action items, and decisions from that meeting.

**G5 — Reliable Infrastructure**  
The system should handle concurrent meetings, large audio files, and background processing without data loss. Every meeting that is captured should be processed to completion, even if individual steps require retries.

**G6 — Self-Hostable**  
The entire system should be deployable with `docker compose up`. No cloud accounts, external SaaS dependencies, or paid services should be required for the system to function at baseline.

---

## 6. Non-Goals

The following are explicitly out of scope for V2 MVP. They are not rejected permanently — they are deferred to allow the team to focus on the core value proposition.

| Non-Goal | Rationale | Target Version |
|---|---|---|
| Mobile native app | The web app with responsive layout is sufficient for V2. Native apps add significant maintenance surface. | V3 |
| Zoom / Teams bot integration | Bot-based capture is complex (platform approval, bot management). Extension-first is the right initial scope. | V3 |
| Multi-language real-time translation | Translation requires a separate pipeline with significant latency implications. | V3+ |
| Custom LLM fine-tuning | Fine-tuning adds operational complexity and cost. Prompt engineering is sufficient for V2. | V3+ |
| SOC2 / HIPAA compliance | Compliance programs require dedicated legal and engineering investment. | V3 |
| Multi-tenant organizations | Single-user and small team usage is the V2 target. Org-level features are V3. | V3 |
| Admin panel | No admin-facing tooling is required for V2. Direct database access is acceptable for operators. | V3 |
| Real-time multi-language transcription | Single language (English) transcription is the V2 baseline. | V3 |
| Chrome extension AI processing | The extension is a thin capture client. No AI runs in the extension. | By design |

---

## 7. User Personas

### Persona 1 — The Independent Professional

**Name**: Alex  
**Role**: Freelance consultant, solo founder, or independent knowledge worker  
**Context**: Attends 5–15 meetings per week across multiple clients or projects. Takes notes manually or relies on memory. Frequently forgets what was decided in meetings from two weeks ago.

**Pain Points**:
- Note-taking interrupts active listening.
- Action items assigned to them are scattered across chat messages, emails, and their own notes.
- Can't recall specific conversations when writing follow-up emails.

**What Watchn't gives them**:
- Automatic capture without disrupting their meeting flow.
- A single searchable archive of every conversation.
- Action items automatically attributed to them and summarized post-meeting.

**Privacy posture**: Moderate concern. Wants their meeting data on their own machine, not in a cloud they don't control.

---

### Persona 2 — The Engineering Lead

**Name**: Jordan  
**Role**: Senior engineer or engineering manager at a startup or mid-size company  
**Context**: Attends planning meetings, architecture reviews, 1:1s, and cross-functional syncs. Needs to track technical decisions across time. Frustrated when revisiting decisions that were "already decided" in meetings no one documented.

**Pain Points**:
- Technical decisions are made verbally and never written down.
- New team members have no institutional memory to reference.
- Post-meeting summaries produced by team members are inconsistent in quality.

**What Watchn't gives them**:
- Automatic extraction of decisions from meetings, stored with context.
- Searchable record of technical discussions across quarters.
- A consistent summary format every time, regardless of who attended.

**Privacy posture**: High concern. Wants self-hosted deployment, no data leaving company infrastructure.

---

### Persona 3 — The Privacy-Conscious Team

**Name**: A team of 3–10 people  
**Role**: Research teams, legal teams, healthcare-adjacent teams, or any group handling sensitive conversations  
**Context**: Cannot use commercial SaaS meeting tools because of data governance requirements. Currently not recording meetings at all, or using local recordings with no processing.

**Pain Points**:
- No commercially acceptable tool exists for their sensitivity level.
- Manual transcription is too slow and expensive.
- Without structured summaries, knowledge stays in the heads of meeting participants.

**What Watchn't gives them**:
- Fully self-hosted deployment with no external API calls required (local LLM + local Whisper).
- Audit-able open-source codebase.
- Data never leaves their infrastructure.

**Privacy posture**: Maximum. Requires air-gap capability or fully local model stack.

---

## 8. Primary Workflows

### Workflow 1 — Capture and Process a Meeting

This is the core loop. Everything else in the product depends on it working reliably.

```
1. User opens Chrome extension and clicks "Start Capture"
2. Extension begins capturing tab audio via chrome.tabCapture
3. Audio is chunked into 10-second WebM blobs
4. Each chunk is streamed to the server via POST /api/v1/meetings/{id}/audio
5. Server stores chunks in MinIO and enqueues transcription tasks
6. Transcription worker processes each chunk with faster-whisper
7. Transcript segments appear in real-time in the web app sidebar
8. Diarization worker labels speakers on each segment
9. Speaker-attributed segments update in the sidebar
10. User ends the meeting — extension sends meeting end signal
11. Intelligence pipeline runs: summary + action items + decisions (parallel)
12. Results are stored and pushed to the frontend via WebSocket
13. Embedding worker chunks and embeds the full transcript
14. Notification worker sends email report to participants
```

### Workflow 2 — Search Meeting History

```
1. User opens the search page
2. User types a natural language query (e.g., "what did we decide about the API rate limits?")
3. Frontend debounces 300ms and sends POST /api/v1/search
4. Server generates an embedding for the query
5. pgvector cosine similarity search finds the top 10 matching chunks
6. Results are joined with meeting metadata and ranked by recency + similarity
7. Frontend displays results with meeting title, date, speaker, and snippet
8. User clicks a result to navigate to the meeting detail at the relevant timestamp
```

### Workflow 3 — Chat with Meeting Memory

```
1. User opens the Chat page
2. User types a question (e.g., "What open action items are assigned to Sarah across all meetings?")
3. Server generates an embedding for the question
4. Top 10 matching chunks are retrieved from pgvector
5. Chunks are assembled as context with source citations
6. LLM call is made with system prompt + context + conversation history
7. Response streams back via Server-Sent Events (SSE)
8. Frontend renders markdown response incrementally
9. Each cited chunk links back to the source meeting
```

### Workflow 4 — Export a Meeting

```
1. User navigates to a meeting detail page
2. User clicks "Export"
3. User selects format: Markdown / JSON / PDF
4. For large meetings, export is generated as a Celery background task
5. Download link is provided when ready
6. For email export, the system sends the report to configured recipients
```

---

## 9. Success Metrics

These metrics define whether V2 MVP is succeeding. They should be measured at the end of each sprint and tracked over time.

### Core Reliability Metrics

| Metric | Target | Why It Matters |
|---|---|---|
| Meeting processing success rate | ≥ 99% | A meeting that fails to process is data loss. This is the most important metric. |
| Transcription accuracy (WER) | ≤ 10% | Below this threshold, summaries and search quality degrade significantly. |
| End-to-end processing latency | ≤ 60s after meeting end | Users expect near-immediate results. |
| Audio capture dropout rate | ≤ 1% of chunks | Dropped chunks create gaps in transcripts. |

### Performance Metrics

| Metric | Target | Measurement Method |
|---|---|---|
| API response time (p95) | < 200ms | FastAPI middleware timing |
| Search latency (p95) | < 500ms | End-to-end including embedding generation |
| Transcription: 10s chunk | < 5s processing time | Worker task timing |
| Full intelligence pipeline | < 30s total | Celery task group timing |
| Web app initial load (LCP) | < 2s | Lighthouse CI |
| WebSocket message delay | < 100ms | Client-side measurement |

### User Experience Metrics

| Metric | Target | Notes |
|---|---|---|
| Action item extraction precision | ≥ 85% | Measured against human-labeled test set |
| Summary relevance score | ≥ 4/5 | User rating in post-meeting survey |
| Search result relevance (NDCG@5) | ≥ 0.75 | Offline evaluation with labeled queries |

---

## 10. Product Scope

### In Scope for V2 MVP

- Chrome extension for audio capture from browser tabs
- FastAPI backend for all processing and data storage
- Real-time transcript display via WebSocket
- Automated transcription (faster-whisper)
- Automated speaker diarization (pyannote.audio)
- Post-meeting intelligence pipeline (summary, action items, decisions)
- Semantic search across all captured meetings
- RAG chat with meeting memory
- Email reports post-meeting (SendGrid or Resend)
- Export to Markdown, JSON, PDF
- Full self-hostable deployment via Docker Compose
- Basic user authentication (email + password + JWT)
- Personal API key for extension authentication
- Configurable LLM provider via litellm

### Out of Scope for V2 MVP

See [Section 6 — Non-Goals](#6-non-goals) for the full list with rationale.

---

## 11. Future Vision

### V3 Targets

- **Bot-based capture**: Join Zoom and Teams calls as an AI participant. This expands capture to calls where the user is not the one hosting the tab.
- **Organization accounts**: Multi-user teams with shared meeting history, role-based access, and admin controls.
- **Knowledge graph with Neo4j**: Replace the simplified tag-based graph with a true graph database enabling relationship queries (e.g., "all decisions connected to Project Atlas").
- **Compliance mode**: SOC2 and HIPAA-adjacent audit logging, data retention policies, and access controls.
- **Custom prompt templates per organization**: Allow teams to define their own summary structure, action item format, and terminology.
- **Webhook ecosystem**: Publish meeting events (meeting.ended, action_item.created) to user-configured webhook endpoints for Zapier, n8n, or custom integrations.

### Long-Term Vision (V4+)

- **Proactive intelligence**: The system surfaces relevant past decisions before a meeting begins based on the meeting agenda and attendee list.
- **Cross-meeting analytics**: Trend analysis across meetings — which topics consume the most time, which action items recur without resolution, which decisions get revisited.
- **Autonomous follow-up**: Draft follow-up emails and Jira tickets from meeting output with one-click approval.
- **Local-only mode**: Full offline capability with a local Whisper model, local embedding model, and local LLM — zero external API calls required.
- **Multi-language support**: Real-time transcription and summarization in the user's language.
- **Plugin SDK**: Allow third parties to build Watchn't plugins that respond to meeting events and extend the intelligence pipeline.

The long-term aspiration is a system that becomes an indispensable institutional memory layer for any team — the place where all organizational knowledge eventually lives, not because it was manually curated, but because it was automatically captured from the conversations that created it.

---

## Related Documents

- [`SPEC.md`](./SPEC.md) — Master engineering specification (source of truth)
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System architecture and component design
- [`DECISIONS.md`](./DECISIONS.md) — Architectural decision records
- [`ROADMAP.md`](./ROADMAP.md) — Milestone-based feature roadmap
- [`CODING_STANDARDS.md`](./CODING_STANDARDS.md) — Code style and conventions
- [`SECURITY.md`](./SECURITY.md) — Threat model and security architecture
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — Contribution guidelines
