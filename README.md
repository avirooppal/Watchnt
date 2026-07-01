# WatchNT AI Meeting Copilot

An Open Source, BYOK (Bring Your Own Keys), Zero-Cost AI Meeting Copilot that records, transcribes, and summarizes meetings locally.

## Architecture

The application is built with a separated architecture:
- **Browser Extension:** The primary interface. Injects a Copilot Bot into Google Meet, Zoom, or Teams, and uses an offscreen document to capture high-quality tab audio.
- **Next.js Dashboard:** A premium, read-only web interface (accessible at `http://localhost:3000`) for reviewing past meetings, transcripts, and action items.
- **FastAPI Backend:** Handles audio processing and AI pipelines. It executes tasks sequentially: transcription -> summarization -> action item extraction.
- **Storage:** Local filesystem for audio and transcripts, and SQLite for metadata.

## Tech Stack

- **Dashboard:** Next.js + React + TailwindCSS
- **Extension:** React + Vite + CRXJS (Manifest V3)
- **Backend API:** FastAPI (Python 3.10)
- **Speech-to-Text:** Faster-Whisper
- **LLM:** Ollama (running locally on the host)
- **Database:** SQLite
- **Orchestration:** Docker Compose

## Setup Instructions

### Prerequisites
- Docker & Docker Compose
- Node.js (for building the extension)
- Ollama (installed locally on your machine, with the `llama3.2` model pulled: `ollama run llama3.2`)

### 1. Run the Dashboard & Backend (Docker)
The core infrastructure is containerized and orchestrated via Docker Compose.

```bash
git clone <repository-url>
cd WatchNT

# Build and start the containers
docker compose up --build
```
This will start:
- Backend API on `http://localhost:8000`
- Dashboard on `http://localhost:3000`

### 2. Install the Browser Extension
1. Open a new terminal and navigate to the extension directory:
   ```bash
   cd WatchNT/extension
   npm install
   npm run build
   ```
2. Open your Chromium-based browser (Chrome, Edge, Brave).
3. Navigate to `chrome://extensions/`.
4. Enable **Developer Mode** (top right corner).
5. Click **Load unpacked** and select the `WatchNT/extension/dist` folder.
6. The WatchNT extension is now installed. Pin it to your browser toolbar!

### 3. Usage
1. Join a meeting on Google Meet, Zoom, or Microsoft Teams.
2. Click the WatchNT extension icon in your toolbar and click **Start AI Capture**.
3. A premium bot UI will appear in your meeting window indicating that recording is active.
4. When finished, click **Stop Capturing**.
5. The audio will automatically upload to your local backend and be processed through the AI pipeline.
6. Open `http://localhost:3000` in your browser to view your summarized meeting, full transcript, and extracted action items!
