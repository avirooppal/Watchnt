# Watchn't

Browser-native, bot-free agentic knowledge capture platform.

## Setup Instructions

1. Copy `.env.example` to `.env` and fill in your actual values (e.g., API keys, passwords).
2. Start the services:
   ```bash
   docker compose up -d
   ```
3. Pull the required models (run this once):
   ```bash
   npm run pull-models
   ```
4. **Hardware Requirements**: You need a minimum of 8GB RAM to run the `llama3.1` 7B model locally. If you have lower RAM, you can swap it for `mistral` or `qwen2.5` in your `.env` and `pull-models.sh`.
