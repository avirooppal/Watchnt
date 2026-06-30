# Watchn't AI Meeting Copilot

### Open Source • BYOK • Zero-Cost Architecture

> **Goal**
>
> Build a completely free AI Meeting Copilot that can:
>
> - Record meetings
> - Transcribe speech
> - Generate summaries
> - Extract action items
> - Send follow-up emails
> - Support real-time assistance
>
> Everything should be:
>
> - ✅ Open Source
> - ✅ Self-hostable
> - ✅ BYOK (Bring Your Own Keys)
> - ✅ No paid infrastructure required

---

# Tech Stack

| Layer            | Technology                                      |
| ---------------- | ----------------------------------------------- |
| Frontend         | Next.js + React + Tailwind                      |
| Backend API      | FastAPI                                         |
| Realtime API     | FastAPI WebSockets                              |
| Recording        | Browser MediaRecorder API                       |
| Audio Processing | FFmpeg                                          |
| Speech-to-Text   | Faster-Whisper                                  |
| LLM              | Ollama / LM Studio / OpenRouter / Gemini (BYOK) |
| Embeddings       | BAAI bge-small-en-v1.5                          |
| Vector DB        | ChromaDB                                        |
| Storage          | Local Filesystem                                |
| Database         | SQLite                                          |
| Queue            | AsyncIO Background Tasks                        |
| Email            | SMTP / Resend / Gmail API (BYOK)                |
| Authentication   | Better Auth / Clerk (optional)                  |
| Deployment       | Docker Compose                                  |

---

# High Level Architecture

```

Browser
│
│ Record Audio
│
▼
FastAPI
│
├── Meeting Service
├── Audio Service
├── Transcription Service
├── AI Service
├── Email Service
├── Realtime Service
│
▼
SQLite
Local Storage
ChromaDB

```

---

# Complete Folder Structure

```

watchnt/

│
├── frontend/
│
│   ├── app/
│   │
│   ├── components/
│   │
│   ├── hooks/
│   │
│   ├── lib/
│   │
│   ├── services/
│   │
│   ├── store/
│   │
│   ├── styles/
│   │
│   └── public/
│
│
├── backend/
│
│   ├── api/
│   │
│   ├── core/
│   │
│   ├── services/
│   │
│   ├── models/
│   │
│   ├── schemas/
│   │
│   ├── workers/
│   │
│   ├── prompts/
│   │
│   ├── storage/
│   │
│   ├── websocket/
│   │
│   ├── utils/
│   │
│   ├── database/
│   │
│   ├── config/
│   │
│   ├── tests/
│   │
│   └── main.py
│
│
├── docker/
│
├── models/
│
├── meetings/
│
├── docs/
│
├── docker-compose.yml
│
├── requirements.txt
│
├── .env.example
│
└── README.md

```

---

# Backend Architecture

```

backend/

├── api/
│
│   meeting.py
│   realtime.py
│   upload.py
│   transcription.py
│   summary.py
│   email.py
│
├── services/
│
│   recorder.py
│   whisper_service.py
│   llm_service.py
│   summarizer.py
│   action_items.py
│   email_service.py
│   vector_service.py
│   meeting_service.py
│   realtime_service.py
│
├── websocket/
│
│   manager.py
│   connection.py
│
├── workers/
│
│   transcription_worker.py
│   summarization_worker.py
│
├── prompts/
│
│   summarize.md
│   action_items.md
│   email.md
│
├── models/
│
│   meeting.py
│   transcript.py
│   action_item.py
│
├── schemas/
│
│   meeting.py
│   transcript.py
│
├── storage/
│
│   audio/
│   transcripts/
│   summaries/
│
├── database/
│
│   db.py
│   models.py
│
└── main.py

```

---

# Frontend Architecture

```

frontend/

app/

meeting/

dashboard/

settings/

components/

MeetingRecorder.tsx

TranscriptPanel.tsx

SummaryPanel.tsx

ActionItems.tsx

RealtimeCaptions.tsx

EmailDialog.tsx

Timer.tsx

AudioWave.tsx

services/

api.ts

meeting.ts

realtime.ts

hooks/

useRecorder.ts

useMicrophone.ts

useWebsocket.ts

useMeeting.ts

store/

meetingStore.ts

settingsStore.ts

```

---

# Core Services

---

## 1. Recorder Service

Responsible for

- microphone permission
- recording audio
- chunking audio
- uploading chunks

Output

```

audio.wav

```

---

## 2. Whisper Service

Input

```

audio.wav

```

Uses

```

Faster Whisper

```

Outputs

```

timestamp
speaker
text

```

Example

```

00:00:01

Hello everyone.

00:00:05

Let's discuss the sprint.

```

---

## 3. Realtime Service

Receives

```

Audio Chunks

```

↓

Streams into Whisper

↓

Returns captions instantly

↓

Frontend updates transcript

Uses

```

WebSockets

```

---

## 4. Summarization Service

Consumes

```

Transcript

```

Prompt

```

Summarize this meeting.

Return:

Overview

Decisions

Risks

Next Steps

```

Uses

```

Gemma 3
Llama 3
Qwen
Mistral

```

via

```

Ollama

```

or

```

Gemini API

```

---

## 5. Action Item Extractor

Prompt

```

Extract:

Owner

Task

Deadline

Priority

```

Returns

```

[
{
owner:"",
task:"",
deadline:"",
priority:""
}
]

```

---

## 6. Email Service

Receives

```

Summary

Action Items

```

Generates HTML

Uses

```

SMTP

or

Resend

or

Gmail API

```

Sends automatically

---

## 7. Vector Service

Stores

```

Transcript

Summary

Notes

```

Into

```

ChromaDB

```

Allows

```

Ask AI

"What did Sarah promise?"

"What was decided?"

"When is launch?"

```

---

# Data Flow

```

Meeting Starts

↓

Recorder

↓

Audio File

↓

Whisper

↓

Transcript

↓

SQLite

↓

LLM

↓

Summary

↓

Action Items

↓

Email

↓

Archive

```

---

# Real-time Flow

```

Microphone

↓

Browser

↓

WebSocket

↓

FastAPI

↓

Whisper

↓

Partial Transcript

↓

Browser

↓

Live Captions

↓

LLM

↓

Live Suggestions

```

---

# Database Schema

## meetings

```

id

title

date

duration

summary

created_at

```

---

## transcript

```

id

meeting_id

timestamp

speaker

text

```

---

## action_items

```

id

meeting_id

owner

task

deadline

completed

```

---

# State Management

## Frontend State

```

Meeting Status

Recording State

Transcript

Live Transcript

Summary

Email Draft

Settings

```

Stored using

```

Zustand

```

---

## Backend State

```

Meeting Session

Connected Clients

Recording Status

Worker Queue

Current Transcript

```

Stored in

```

Memory

```

Persistent state

```

SQLite

```

---

# Service Communication

```

Frontend

↓

REST API

↓

Meeting Service

↓

Recorder Service

↓

Whisper

↓

LLM

↓

Email

↓

Database

```

Realtime

```

Frontend

↓

WebSocket

↓

Realtime Service

↓

Whisper

↓

Frontend

```

---

# API Structure

## Meetings

```

POST /meetings/start

POST /meetings/stop

GET /meetings

GET /meeting/{id}

DELETE /meeting/{id}

```

---

## Recording

```

POST /audio/upload

POST /audio/chunk

```

---

## Transcription

```

POST /transcribe

GET /transcript/{id}

```

---

## Summary

```

POST /summary

GET /summary/{id}

```

---

## Action Items

```

GET /actions/{meeting}

PUT /actions/{id}

```

---

## Email

```

POST /email/send

POST /email/preview

```

---

## WebSocket

```

/ws/audio

/ws/transcript

/ws/live

```

---

# Local Storage

```

meetings/

meeting_001/

audio.wav

transcript.json

summary.md

actions.json

email.html

metadata.json

```

---

# Configuration

```

.env

WHISPER_MODEL=base

OLLAMA_URL=http://localhost:11434

OPENROUTER_KEY=

GEMINI_KEY=

SMTP_HOST=

SMTP_PORT=

SMTP_USER=

SMTP_PASS=

CHROMA_PATH=./chroma

DATABASE_URL=sqlite:///watchnt.db

```

Everything is optional.

User only fills what they use.

---

# AI Models

## Speech Recognition

```

Faster Whisper

```

Models

- tiny
- base
- small
- medium
- large-v3

---

## Local LLM

```

Ollama

```

Recommended

- Gemma 3 12B
- Llama 3.2
- Qwen 3
- Mistral
- Phi-4-mini

---

## Embeddings

```

BAAI/bge-small-en-v1.5

```

Free

Runs locally

---

# Background Workers

## Worker 1

```

Transcription Queue

```

---

## Worker 2

```

Summarization Queue

```

---

## Worker 3

```

Email Queue

```

---

# Security

- API Keys stored in `.env`
- BYOK only
- No user data leaves the machine unless the chosen LLM or email provider requires it
- Local SQLite database
- Local audio storage
- Optional encryption for stored meeting data
- CORS protection
- Rate limiting for public deployments

---

# Future Features

- Speaker diarization
- Calendar integration (Google/Outlook)
- Meeting reminders
- AI-generated agendas
- Semantic search across meetings
- RAG over historical meetings
- Live coaching ("You haven't heard from Alex yet")
- Slack/Discord/Teams notifications
- Export to Markdown, PDF, DOCX, and Notion
- Multi-language transcription and translation
- MCP server integration for AI agent workflows

---

# Scalability Path

### Phase 1 (MVP)

- Single user
- Local storage
- SQLite
- Faster-Whisper
- Ollama
- SMTP

### Phase 2

- Multi-user authentication
- PostgreSQL
- Redis cache
- Background worker queue (RQ/Celery)
- Shared meeting history

### Phase 3

- Distributed transcription workers
- Object storage (S3-compatible)
- Kubernetes deployment
- Horizontal WebSocket scaling
- Enterprise SSO and audit logs

---

# Complete System Flow

```

                +--------------------+
                |    Next.js UI      |
                +---------+----------+
                          |
                   REST / WebSocket
                          |
                          ▼
                +--------------------+
                |      FastAPI       |
                +---------+----------+
                          |
      +-------------------+-------------------+
      |                   |                   |
      ▼                   ▼                   ▼
Recorder Service   Whisper Service     Meeting Service
      |                   |                   |
      ▼                   ▼                   ▼
 Audio Storage      Transcript DB       SQLite Metadata
                          |
                          ▼
                  Summarization Service
                          |
              +-----------+------------+
              |                        |
              ▼                        ▼
      Action Item Service      Vector Service
              |                        |
              ▼                        ▼
        Email Service          ChromaDB (RAG)
              |
              ▼
      SMTP / Gmail / Resend
              |
              ▼
         Meeting Recipients

```

This architecture provides a **100% free-to-build, open-source, BYOK** meeting copilot. All core AI components (speech recognition, local LLM inference, embeddings, vector search, storage, and orchestration) can run entirely on your own machine with no mandatory recurring costs. External APIs (e.g., Gemini, OpenRouter, Resend, Gmail SMTP) are optional and only used if you choose to supply your own API keys.
