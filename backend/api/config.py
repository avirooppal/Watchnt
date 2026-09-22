from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import SessionLocal
from database.models import Settings
from schemas.config import SettingsResponse, SettingsUpdate
import httpx
import os
import tempfile

from core.deps import get_db

router = APIRouter()
def _get_or_create_settings(db: Session) -> Settings:
    settings = db.query(Settings).filter(Settings.id == "default").first()
    if not settings:
        settings = Settings(id="default")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.get("/config", response_model=SettingsResponse)
def get_config(db: Session = Depends(get_db)):
    return _get_or_create_settings(db)

@router.post("/config", response_model=SettingsResponse)
def update_config(update: SettingsUpdate, db: Session = Depends(get_db)):
    settings = _get_or_create_settings(db)
    
    update_data = update.model_dump(exclude_unset=True, exclude_none=True)
    for key, value in update_data.items():
        if key.endswith("_api_key") and "****" in value:
            continue
        setattr(settings, key, value)
        
    db.commit()
    db.refresh(settings)
    return settings

@router.post("/config/test")
async def test_config(db: Session = Depends(get_db)):
    settings = _get_or_create_settings(db)
    # Diagnostics test only the chosen provider; never contact unused saved providers.
    import asyncio
    from services.providers.transcription.local_whisper import load_model
    from services.providers.transcription_factory import TranscriptionProviderFactory
    from services.providers.llm_factory import LLMProviderFactory
    results = {}
    try:
        provider = TranscriptionProviderFactory.create(settings)
        await asyncio.to_thread(load_model, provider.model_size)
        results["whisper"] = {"status": "ok", "message": "Local multilingual model ready on CPU"}
    except Exception as error:
        results["whisper"] = {"status": "error", "message": "Local model unavailable; install the selected weights explicitly. " + type(error).__name__}
    try:
        provider = LLMProviderFactory.create(settings)
        await asyncio.wait_for(provider.generate_response("Reply with OK. This is a connection test; no meeting data is included."), timeout=60)
        results[settings.llm_provider] = {"status": "ok", "message": "Model responded"}
    except Exception as error:
        results[settings.llm_provider] = {"status": "error", "message": str(error) or "Model response timed out. Check the model is loaded and try again."}
    return results
