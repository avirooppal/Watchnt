<div align="center">
  <img src="logo.png" alt="WatchNT Logo" width="150" height="150" />
  <h1>WatchNT AI Meeting Copilot</h1>
  <p>An Open Source, BYOK (Bring Your Own Keys), Zero-Cost AI Meeting Copilot that records, transcribes, and summarizes meetings locally.</p>

  <p>
    <a href="https://github.com/avirooppal/Watchnt/issues"><img alt="Issues" src="https://img.shields.io/github/issues/avirooppal/Watchnt"/></a>
    <a href="https://github.com/avirooppal/Watchnt/network/members"><img alt="Forks" src="https://img.shields.io/github/forks/avirooppal/Watchnt"/></a>
    <a href="https://github.com/avirooppal/Watchnt/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/avirooppal/Watchnt"/></a>
    <a href="https://github.com/avirooppal/Watchnt/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/github/license/avirooppal/Watchnt"/></a>
  </p>

  <br />
  
  <video src="https://github.com/avirooppal/Watchnt/raw/main/watchnt.mp4" controls="controls" width="100%" style="max-width: 800px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"></video>
  
  <br />
</div>

<hr />

## 📖 Table of Contents
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Setup Instructions](#-setup-instructions)
  - [Prerequisites](#prerequisites)
  - [1. Run the Dashboard & Backend (Docker)](#1-run-the-dashboard--backend-docker)
  - [2. Install the Browser Extension](#2-install-the-browser-extension)
  - [3. Usage](#3-usage)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features
- **Local Processing**: Transcribe and summarize meetings locally without sending data to third parties.
- **BYOK (Bring Your Own Keys)**: Fully open source, plug in your own models.
- **Cross-Platform Support**: Works seamlessly on Google Meet, Zoom, and Microsoft Teams via a browser extension.
- **High-Quality Audio Capture**: Uses offscreen documents to capture pristine tab audio.

## 🏗 Architecture

- **Browser Extension:** The primary interface. Injects a Copilot Bot into Google Meet, Zoom, or Teams, and uses an offscreen document to capture high-quality tab audio. It also provides the dashboard interface for reviewing past meetings, transcripts, and action items.
- **FastAPI Backend:** Handles audio processing and AI pipelines. It executes tasks sequentially: transcription -> summarization -> action item extraction.
- **Storage:** Local filesystem for audio and transcripts, and SQLite for metadata.

## 💻 Tech Stack

- **Dashboard & Extension:** React + Vite + TailwindCSS + CRXJS (Manifest V3)
- **Backend API:** FastAPI (Python 3.10)
- **Speech-to-Text:** Faster-Whisper
- **LLM:** Ollama (running locally on the host)
- **Database:** SQLite
- **Orchestration:** Docker Compose

## 🚀 Setup Instructions

### Prerequisites
- Docker & Docker Compose
- Node.js (for building the extension)
- Ollama (installed locally on your machine, with the `llama3.2` model pulled: `ollama run llama3.2`)

### 1. Run the Dashboard & Backend (Docker)
The core infrastructure is containerized and orchestrated via Docker Compose.

```bash
git clone https://github.com/avirooppal/Watchnt.git
cd WatchNT

# Build and start the containers
docker compose up --build
```
This will start:
- Backend API on `http://localhost:8000`
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
6. Open the Dashboard from your extension menu to view your summarized meeting, full transcript, and extracted action items!

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/avirooppal/Watchnt/issues).

## 📝 License
This project is open-source and available under the MIT License.
