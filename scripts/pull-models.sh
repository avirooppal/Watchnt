#!/bin/bash
set -e
echo "Pulling Whisper model..."
docker compose exec transcriber ollama pull whisper
echo "Pulling nomic-embed-text embedding model..."
docker compose exec transcriber ollama pull nomic-embed-text
echo "Pulling LLM (llama3.1 — swap for mistral or qwen2.5 on lower-RAM machines)..."
docker compose exec transcriber ollama pull llama3.1
echo "All models ready."
