# Watchn't AI Meeting Copilot — MVP Build Plan

> **Goal:** Build a fully functional open-source Meeting Copilot incrementally, where each task is:
>
> - Small enough to complete in one session
> - Independently testable
> - Focused on a single concern
> - Safe to commit after completion
>
> Each task should end in a working, verifiable state.

---

# Phase 0 — Project Setup

---

## Task 0.1 — Create Monorepo

### Goal

Initialize the project structure.

### Do

- Create root folder
- Create frontend/
- Create backend/
- Create docs/
- Create meetings/
- Create models/
- Create docker/

### Test

Project opens successfully in VSCode.

---

## Task 0.2 — Initialize Git

### Goal

Create repository.

### Do

- git init
- create .gitignore
- initial commit

### Test

```
git status
```

returns clean working tree.

---

## Task 0.3 — Create README

### Goal

Document project.

### Do

Add:

- project name
- architecture
- stack
- setup steps

### Test

README renders correctly.

---

## Task 0.4 — Create Backend

### Goal

Initialize FastAPI.

### Do

Install

- FastAPI
- Uvicorn

Create

```
backend/main.py
```

Return

```
Hello Watchn't
```

### Test

Visit

```
localhost:8000
```

Returns JSON.

---


# Phase 1 — Backend Foundation

---

## Task 1.1 — Environment Config

### Goal

Load .env.

### Do

Create

```
config.py
```

Read

- Whisper model
- LLM provider
- SMTP config

### Test

Print loaded config.

---

## Task 1.2 — Create API Router

### Goal

Modular routing.

### Do

Create

```
api/

```

Register router.

### Test

```
GET /health
```

returns

```
OK
```

---

## Task 1.3 — SQLite Connection

### Goal

Connect database.

### Do

Create

```
database/db.py
```

Initialize SQLite.

### Test

Database file appears.

---

## Task 1.4 — Meeting Model

### Goal

Create first table.

Fields

- id
- title
- created_at

### Test

Insert one row.

---

## Task 1.5 — Create Meeting Endpoint

### Goal

Create meeting.

Endpoint

```
POST /meeting
```

### Test

Meeting saved.

---

## Task 1.6 — List Meetings

Endpoint

```
GET /meetings
```

### Test

Returns created meeting.

---

# Phase 2 — Recording

---

## Task 2.1 — Microphone Permission

### Goal

Ask browser permission.

### Test

Permission popup appears.

---

## Task 2.2 — Recorder Hook

Create

```
useRecorder.ts
```

### Test

Recording starts.

---

## Task 2.3 — Stop Recording

### Test

Recording stops.

---

## Task 2.4 — Download Audio

### Goal

Save recording locally.

### Test

.wav downloads.

---

## Task 2.5 — Upload Audio

Endpoint

```
POST /upload
```

### Test

Backend receives file.

---

## Task 2.6 — Save Audio

Store

```
meetings/meeting-id/audio.wav
```

### Test

File exists.

---

# Phase 3 — Whisper

---

## Task 3.1 — Install Faster Whisper

### Goal

Verify installation.

### Test

Imports successfully.

---

## Task 3.2 — Load Model

Load

```
base
```

### Test

Model initializes.

---

## Task 3.3 — Transcribe Audio

Input

```
audio.wav
```

Output

```
text
```

### Test

Transcript printed.

---

## Task 3.4 — Return JSON

Return

```
segments
timestamps
```

### Test

API returns JSON.

---

## Task 3.5 — Save Transcript

Save

```
transcript.json
```

### Test

File created.

---

# Phase 4 — Frontend Transcript

---

## Task 4.1 — Upload Audio

Connect frontend.

### Test

Upload succeeds.

---

## Task 4.2 — Display Transcript

### Test

Transcript visible.

---

## Task 4.3 — Transcript Component

Move into

```
TranscriptPanel
```

### Test

Still renders.

---

# Phase 5 — Meeting Summaries

---

## Task 5.1 — Create LLM Service

Create

```
llm_service.py
```

### Test

Returns hello.

---

## Task 5.2 — Ollama Connector

Connect local Ollama.

### Test

Generate response.

---

## Task 5.3 — Summary Prompt

Prompt

```
Summarize meeting.
```

### Test

Summary returned.

---

## Task 5.4 — Summary Endpoint

```
POST /summary
```

### Test

Returns summary.

---

## Task 5.5 — Save Summary

Store

```
summary.md
```

### Test

File exists.

---

## Task 5.6 — Summary UI

Display summary.

### Test

Visible.

---

# Phase 6 — Action Items

---

## Task 6.1 — Prompt

Prompt

```
Extract action items.
```

### Test

Returns JSON.

---

## Task 6.2 — API

```
POST /actions
```

### Test

Works.

---

## Task 6.3 — Save JSON

Save

```
actions.json
```

### Test

Exists.

---

## Task 6.4 — UI

Display checklist.

### Test

Checklist visible.

---

# Phase 7 — Email

---

## Task 7.1 — Email Template

Generate HTML.

### Test

HTML renders.

---

## Task 7.2 — SMTP

Connect SMTP.

### Test

Login works.

---

## Task 7.3 — Send Email

Endpoint

```
POST /email
```

### Test

Email received.

---

# Phase 8 — Realtime

---

## Task 8.1 — WebSocket Server

Create socket.

### Test

Connection established.

---

## Task 8.2 — Frontend Socket

Connect.

### Test

Messages received.

---

## Task 8.3 — Audio Chunks

Send chunks.

### Test

Backend receives chunks.

---

## Task 8.4 — Stream Whisper

Transcribe chunk.

### Test

Partial transcript.

---

## Task 8.5 — Live Transcript

Render partial text.

### Test

Updates continuously.

---

# Phase 9 — State Management

---

## Task 9.1 — Zustand Store

Create store.

### Test

State updates.

---

## Task 9.2 — Recording State

Store recording.

### Test

Button updates.

---

## Task 9.3 — Transcript State

Store transcript.

### Test

Persists.

---

## Task 9.4 — Summary State

Store summary.

### Test

Displayed.

---

# Phase 10 — Local Storage

---

## Task 10.1 — Meeting Folder

Create

```
meetings/{id}
```

### Test

Folder created.

---

## Task 10.2 — Metadata

Save

```
metadata.json
```

### Test

Exists.

---

## Task 10.3 — Save Everything

Save

- audio
- transcript
- summary
- actions

### Test

Files exist.

---

# Phase 11 — Dashboard

---

## Task 11.1 — Meeting List

Display meetings.

### Test

Visible.

---

## Task 11.2 — Meeting Detail

Open meeting.

### Test

Loads.

---

## Task 11.3 — Download Transcript

Button.

### Test

Downloads.

---

## Task 11.4 — Download Summary

Button.

### Test

Downloads.

---

# Phase 12 — Polish

---

## Task 12.1 — Loading States

Add loaders.

### Test

Visible.

---

## Task 12.2 — Error Handling

Display errors.

### Test

Readable.

---

## Task 12.3 — Empty States

Handle no meetings.

### Test

Friendly UI.

---

## Task 12.4 — Settings Page

Allow user to configure

- Whisper model
- Ollama URL
- Gemini key
- SMTP

### Test

Settings persist.

---

# Phase 13 — Docker

---

## Task 13.1 — Backend Dockerfile

### Test

Container starts.

---

## Task 13.2 — Frontend Dockerfile

### Test

Container starts.

---

## Task 13.3 — Docker Compose

Run

- frontend
- backend

### Test

One command starts both.

---

# Phase 14 — MVP Verification

---

## Task 14.1 — Record Meeting

**Expected Result**

- Recording completes
- Audio saved

---

## Task 14.2 — Generate Transcript

**Expected Result**

Transcript generated correctly.

---

## Task 14.3 — Generate Summary

**Expected Result**

Meeting summary appears.

---

## Task 14.4 — Extract Action Items

**Expected Result**

Checklist generated.

---

## Task 14.5 — Send Follow-up Email

**Expected Result**

Recipient receives formatted summary email.

---

## Task 14.6 — View Meeting History

**Expected Result**

Past meetings can be reopened with transcripts, summaries, and action items.

---

# Definition of Done (MVP)

A build is considered MVP-complete when the following end-to-end workflow succeeds without manual intervention:

1. User opens the web application.
2. User starts a meeting recording.
3. Audio is captured and saved locally.
4. Audio is transcribed with Faster-Whisper.
5. Transcript is persisted to disk and SQLite.
6. A local or BYOK LLM generates a meeting summary.
7. Action items are extracted into structured JSON.
8. Summary and action items are displayed in the UI.
9. A follow-up email can be previewed and sent via a configured SMTP provider.
10. The completed meeting appears in the meeting history and can be reopened later.

At this point, Watchn't functions as a fully offline-capable, open-source, zero-cost (BYOK) AI Meeting Copilot MVP.
