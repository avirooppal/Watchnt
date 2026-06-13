# Watchn't

Watchn't automatically turns everything you watch, listen to, and discuss into organized notes, insights, action items, and searchable knowledge so you never have to manually take notes again.

<img width="1892" height="855" alt="image" src="https://github.com/user-attachments/assets/d82fa907-2992-4f7a-bd80-8afb1a26620f" />



## Features

- **Automated Knowledge Capture:** Click "Capture" on any supported platform (YouTube, Google Meet, Podcasts) to begin extracting insights.
- **AI-Powered Extraction:** Generates summaries, key insights, action items, and core concepts automatically using LLMs (Ollama, OpenRouter, Anthropic, Gemini).
- **Semantic Search:** Uses vector embeddings (`pgvector`) to let you search your library by meaning and concept, not just exact keywords.
- **Privacy First:** Designed to run 100% locally on your machine via Docker and Ollama.
- **Export Ready:** Export your knowledge base as JSON or Markdown with one click.

## Architecture

Watchn't consists of three main components:

1. **Browser Extension:** A React-based Chrome extension that injects an overlay into supported sites, captures DOM data/audio, and provides a dashboard library.
2. **Node.js API:** A local backend that orchestrates the AI pipeline (summarization, extraction, indexing) and manages the PostgreSQL database.
3. **Transcript Service:** A lightweight Python FastAPI service that fetches YouTube transcripts reliably.

---

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

- **Node.js** (v18+)
- **Docker & Docker Compose** (for running the database and local services)
- **Ollama** (if you want to run local models)
- **Google Chrome** or a Chromium-based browser

## Local Development Setup

### 1. Clone & Install Dependencies

First, install the NPM dependencies for both the backend and the extension.

```bash
# Install backend dependencies
cd server
npm install

# Install extension dependencies
cd ../extension
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory (where `docker-compose.yml` is located). Watchn't requires the following environment variables:

```env
# Database Credentials
POSTGRES_USER=watchnt
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=watchnt

# JWT and API Auth (For local usage)
API_KEY=local_dev_key
JWT_SECRET=super_secret_jwt_key

# Local AI Configuration
OLLAMA_HOST=http://host.docker.internal:11434
OLLAMA_MODEL=llama3

# Default LLM Provider (ollama, openrouter, anthropic, gemini)
LLM_PROVIDER=ollama
```

### 3. Start the Docker Services

Boot up the PostgreSQL database (with `pgvector`), the Node API, and the Python Transcript Service using Docker Compose:

```bash
docker compose up -d
```

_Note: Make sure your native port 5432 is free, or Docker will conflict with an existing PostgreSQL installation._

### 4. Build the Extension

The extension uses `esbuild` and React. Build the extension into the `dist/` folder:

```bash
cd extension
npm run build
```

_(You can also use `npm run watch` to automatically rebuild the extension when you change React files)._

### 5. Load the Extension into Chrome

1. Open Google Chrome and navigate to `chrome://extensions/`
2. Enable **"Developer mode"** in the top right corner.
3. Click **"Load unpacked"** in the top left.
4. Select the `extension/dist` folder located inside your Watchn't project directory.

---

## Using Watchn't

1. Open a YouTube video, a Google Meet call, or a podcast.
2. You will see a small **Watchn't** overlay in the corner of the screen.
3. Click **"Capture"** to start parsing the content.
4. Open the Extension Dashboard (by clicking the Watchn't icon in your Chrome toolbar) to see your extracted knowledge cards, search your library, and configure your AI model settings.

## Troubleshooting

- **"Ollama Unreachable" Error:** Ensure that your local Ollama app is running. Furthermore, ensure you have pulled the necessary embedding model by running:
  ```bash
  docker compose exec transcriber ollama pull nomic-embed-text
  ```
- **"Empty Library" after capturing:** The AI pipeline runs asynchronously in the background and takes 10-20 seconds to process a transcript. Try refreshing your dashboard.
- **Search returns 500 Error:** Ensure your `pgvector` extension is properly loaded in PostgreSQL and that the embedding model successfully generated vectors.

## License

MIT
