<div align="center">
  <img src="logo.png" alt="WatchNT Logo" width="150" height="150" />
  <h1>WatchNT</h1>
  <p>An Open Source, BYOK (Bring Your Own Keys), Zero-Cost AI Meeting Copilot that records, transcribes, and summarizes meetings locally.</p>

  <p>
    <a href="https://github.com/avirooppal/Watchnt/issues"><img alt="Issues" src="https://img.shields.io/github/issues/avirooppal/Watchnt"/></a>
    <a href="https://github.com/avirooppal/Watchnt/network/members"><img alt="Forks" src="https://img.shields.io/github/forks/avirooppal/Watchnt"/></a>
    <a href="https://github.com/avirooppal/Watchnt/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/avirooppal/Watchnt"/></a>
    <a href="https://github.com/avirooppal/Watchnt/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/github/license/avirooppal/Watchnt"/></a>
  </p>
  
  [![WatchNT AI Meeting Copilot Demo](https://markdown-videos-api.jorgenkh.no/youtube/gLmGs812cEA)](https://www.youtube.com/watch?v=gLmGs812cEA&autoplay=1)
</div>

<hr />

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Setup Instructions](#setup-instructions)
  - [Prerequisites](#prerequisites)
  - [Backend Deployment (Docker)](#1-backend-deployment-docker)
  - [Extension Installation](#2-extension-installation)
- [Usage Guide](#usage-guide)
- [Contributing](#contributing)
- [License](#license)

## Features
- **Local Processing**: Transcribe and summarize meetings locally without transmitting sensitive data to third-party servers.
- **BYOK (Bring Your Own Keys)**: Fully open source architecture allowing integration with custom LLM providers.
- **Cross-Platform Compatibility**: Operates seamlessly across Google Meet, Zoom, and Microsoft Teams via a Chromium-based browser extension.
- **Live Capturing**: Leverages modern web APIs to capture high-quality tab audio and real-time caption streams.
- **Meeting Organization**: Includes a comprehensive dashboard with folder-based organization, meeting libraries, and status tracking.

## Architecture

The system is composed of two primary components:

- **Browser Extension (Frontend):** Serves as the primary user interface. It injects a recording bot into the active meeting tab to capture audio and real-time captions. It also provides a robust React-based dashboard for reviewing past meetings, transcripts, and generated action items.
- **FastAPI Service (Backend):** Manages the AI processing pipeline. It executes asynchronous background tasks strictly following the sequence: Audio Processing -> Transcription -> Summarization -> Action Item Extraction -> Email Generation.
- **Data Persistence:** Utilizes the local filesystem for storing raw audio and transcripts, backed by a SQLite database for structural metadata and folder relationships.

## Tech Stack

- **Dashboard & Extension:** React, Vite, TailwindCSS, CRXJS (Manifest V3)
- **Backend API:** FastAPI (Python 3.10)
- **Speech-to-Text:** Faster-Whisper
- **LLM Integration:** Ollama (Local execution)
- **Database:** SQLite
- **Orchestration:** Docker Compose

## Setup Instructions

### Prerequisites
- Docker and Docker Compose installed
- Node.js (v18 or higher recommended for building the extension)
- Ollama (installed locally on the host machine, with the desired model pulled, e.g., `ollama run llama3.2`)

### 1. Backend Deployment (Docker)
The core infrastructure is containerized for standardized deployment via Docker Compose.

```bash
git clone https://github.com/avirooppal/Watchnt.git
cd Watchnt

# Build and initialize the containers in detached mode
docker compose up --build -d
```
The backend API will initialize and bind to `http://localhost:8000`.

### 2. Extension Installation
1. Open a terminal and navigate to the extension build directory:
   ```bash
   cd Watchnt/extension
   npm install
   npm run build
   ```
2. Open a Chromium-based browser (Chrome, Edge, Brave).
3. Navigate to `chrome://extensions/`.
4. Enable **Developer Mode** (located in the top right corner).
5. Select **Load unpacked** and choose the compiled `Watchnt/extension/dist` directory.
6. The WatchNT extension is now active. Pin it to the browser toolbar for quick access.

## Usage Guide
1. Join an active meeting on Google Meet, Zoom, or Microsoft Teams.
2. Select the WatchNT extension icon from the toolbar and initialize the recording sequence.
3. An integrated UI will appear within the meeting window, displaying the active recording status and real-time processing metrics.
4. Upon concluding the meeting, select **Stop Recording**.
5. The extension will automatically dispatch the captured data to the local backend, initiating the AI processing pipeline.
6. Access the Dashboard from the extension popup to view the generated summary, full transcript, extracted action items, and manage meeting folders.

## Contributing
Contributions, issue reports, and feature requests are welcome. Please refer to the [issues page](https://github.com/avirooppal/Watchnt/issues) for active discussions and bug tracking.

## License
This project is open-source and distributed under the MIT License.
