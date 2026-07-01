from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import SessionLocal
from database.models import Settings
from schemas.config import SettingsResponse, SettingsUpdate
import httpx
import os
import tempfile

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
    
    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings, key, value)
        
    db.commit()
    db.refresh(settings)
    return settings

@router.post("/config/test")
async def test_config(db: Session = Depends(get_db)):
    settings = _get_or_create_settings(db)
    results = {}
    
    # 1. Test Ollama
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(settings.ollama_base_url.replace("/api/generate", "/"))
            results["ollama"] = {"status": "ok" if res.status_code == 200 else "error", "message": "Connected"}
    except Exception as e:
        results["ollama"] = {"status": "error", "message": str(e)}

    # 2. Test OpenAI (models list)
    if settings.openai_api_key:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get("https://api.openai.com/v1/models", headers={"Authorization": f"Bearer {settings.openai_api_key}"})
                results["openai"] = {"status": "ok" if res.status_code == 200 else "error", "message": "Key Valid" if res.status_code == 200 else "Key Invalid"}
        except Exception as e:
            results["openai"] = {"status": "error", "message": str(e)}
    else:
        results["openai"] = {"status": "warning", "message": "Key missing"}

    # 3. Test Groq
    if settings.groq_api_key:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get("https://api.groq.com/openai/v1/models", headers={"Authorization": f"Bearer {settings.groq_api_key}"})
                results["groq"] = {"status": "ok" if res.status_code == 200 else "error", "message": "Key Valid" if res.status_code == 200 else "Key Invalid"}
        except Exception as e:
            results["groq"] = {"status": "error", "message": str(e)}
    else:
        results["groq"] = {"status": "warning", "message": "Key missing"}

    # 4. Test Gemini
    if settings.gemini_api_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models?key={settings.gemini_api_key}"
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(url)
                results["gemini"] = {"status": "ok" if res.status_code == 200 else "error", "message": "Key Valid" if res.status_code == 200 else "Key Invalid"}
        except Exception as e:
            results["gemini"] = {"status": "error", "message": str(e)}
    else:
        results["gemini"] = {"status": "warning", "message": "Key missing"}

    # 5. Test OpenRouter
    if settings.openrouter_api_key:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get("https://openrouter.ai/api/v1/auth/key", headers={"Authorization": f"Bearer {settings.openrouter_api_key}"})
                results["openrouter"] = {"status": "ok" if res.status_code == 200 else "error", "message": "Key Valid" if res.status_code == 200 else "Key Invalid"}
        except Exception as e:
            results["openrouter"] = {"status": "error", "message": str(e)}
    else:
        results["openrouter"] = {"status": "warning", "message": "Key missing"}
        
    # 6. Test Local Whisper / FFmpeg
    try:
        import subprocess
        subprocess.run(["ffmpeg", "-version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        results["whisper"] = {"status": "ok", "message": "FFmpeg found"}
    except Exception as e:
        results["whisper"] = {"status": "error", "message": "FFmpeg missing"}

    return results
