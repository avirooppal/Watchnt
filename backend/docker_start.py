"""Explicit Docker setup: cache models before accepting meeting traffic."""
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

import httpx

from database.db import SessionLocal, init_db
from database.models import Settings
from schemas.config import SettingsUpdate
from services.providers.transcription_factory import TranscriptionProviderFactory

OLLAMA_URL = "http://ollama:11434/api/generate"


def configure(db):
    settings = db.get(Settings, "default")
    if settings is None:
        settings = Settings(
            id="default", ollama_base_url=OLLAMA_URL,
            llm_model=os.environ.get("WATCHNT_DEFAULT_LLM_MODEL", "qwen3:1.7b"),
        )
        db.add(settings)
        db.flush()
    elif settings.llm_provider == "ollama":
        url = urlparse(settings.ollama_base_url or "http://localhost:11434/api/generate")
        if url.hostname in {"localhost", "127.0.0.1", "::1", "host.docker.internal"} and url.port in {None, 11434}:
            settings.ollama_base_url = OLLAMA_URL
    db.commit()
    db.refresh(settings)
    return settings


def ensure_ollama(base_url, model):
    SettingsUpdate(ollama_base_url=base_url)
    api_root = base_url.rsplit("/", 1)[0]
    with httpx.Client(timeout=120, trust_env=False) as client:
        response = client.post(api_root + "/show", json={"model": model})
        if response.status_code == 200:
            print(f"Ollama model cached: {model}", flush=True)
            return
        if response.status_code != 404:
            response.raise_for_status()
        print(f"Downloading Ollama model: {model} (first startup can take several minutes)", flush=True)
        last_progress = None
        success = False
        with client.stream("POST", api_root + "/pull", json={"model": model, "stream": True}) as response:
            response.raise_for_status()
            for line in response.iter_lines():
                if not line:
                    continue
                event = json.loads(line)
                if event.get("error"):
                    raise RuntimeError(event["error"])
                status = event.get("status", "")
                percent = int(100 * event.get("completed", 0) / event["total"]) if event.get("total") else 0
                progress = (status, percent // 10)
                if progress != last_progress:
                    print(f"Ollama: {status} {percent}%", flush=True)
                    last_progress = progress
                success = status == "success"
        if not success:
            raise RuntimeError("Ollama model download ended before success; restart to retry")


def warm_ollama(base_url, model):
    print(f"Loading Ollama {model} on CPU; large models can take several minutes", flush=True)
    with httpx.Client(timeout=600, trust_env=False) as client:
        response = client.post(base_url, json={"model": model, "stream": False, "keep_alive": -1})
        response.raise_for_status()
        if response.json().get("error"):
            raise RuntimeError(response.json()["error"])
    print("Ollama ready", flush=True)


def ensure_whisper(model):
    from faster_whisper.utils import download_model
    from services.providers.transcription.local_whisper import load_model
    print(f"Preparing Whisper {model}; missing weights will be downloaded once", flush=True)
    try:
        cached = Path(download_model(model, local_files_only=True))
        required = ("model.bin", "config.json", "tokenizer.json")
        if not all((cached / name).is_file() for name in required) or not any(cached.glob("vocabulary.*")):
            raise FileNotFoundError("Whisper cache is incomplete")
    except OSError:
        download_model(model)
    load_model(model)
    print("Whisper ready", flush=True)


def prepare():
    Path("/app/data").mkdir(parents=True, exist_ok=True)
    Path(os.environ.get("MEETINGS_DIR", "/app/meetings")).mkdir(parents=True, exist_ok=True)
    init_db()
    with SessionLocal() as db:
        settings = configure(db)
        model = TranscriptionProviderFactory.create(settings).model_size
        ensure_whisper(model)
        if settings.llm_provider == "ollama":
            ensure_ollama(settings.ollama_base_url, settings.llm_model or "llama3")
            warm_ollama(settings.ollama_base_url, settings.llm_model or "llama3")
    print("WatchNT ready at http://localhost:8000", flush=True)


if __name__ == "__main__":
    prepare()
    os.execvp(sys.executable, [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0",
                              "--port", "8000", "--ws-max-size", "1536000"])
