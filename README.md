# Watchn't AI Meeting Copilot

An Open Source, BYOK (Bring Your Own Keys), Zero-Cost AI Meeting Copilot that records, transcribes, and summarizes meetings locally.

## Architecture

The application uses a separated frontend and backend architecture:
- **Browser:** Records audio and streams it to the backend.
- **FastAPI Backend:** Handles audio processing, orchestration, and real-time streaming via WebSockets.
- **Services:** Local transcription via Faster-Whisper, summarization and action item extraction via BYOK LLMs (Ollama, Gemini, etc.), and email dispatch.
- **Storage:** Local filesystem for audio/transcripts, SQLite for meeting metadata, and ChromaDB for vector embeddings.

## Tech Stack

- **Frontend:** Next.js + React + Tailwind
- **Backend API:** FastAPI
- **Realtime API:** FastAPI WebSockets
- **Audio Processing:** Browser MediaRecorder API, FFmpeg
- **Speech-to-Text:** Faster-Whisper
- **LLM:** Ollama / BYOK providers
- **Vector DB:** ChromaDB
- **Database:** SQLite

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- FFmpeg (for audio processing)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd WatchNT
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   python -m venv venv
   # On Windows: venv\Scripts\activate
   # On Mac/Linux: source venv/bin/activate
   pip install fastapi uvicorn
   # Additional requirements will be added as services are built
   uvicorn main:app --reload
   ```

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
