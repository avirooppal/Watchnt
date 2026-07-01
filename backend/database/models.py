from sqlalchemy import Column, String, DateTime
from database.db import Base
import datetime
import uuid

class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, index=True)
    status = Column(String, default="RECORDING")
    job_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Settings(Base):
    __tablename__ = "settings"
    
    id = Column(String, primary_key=True, default="default")
    transcription_provider = Column(String, default="local")
    llm_provider = Column(String, default="ollama")
    transcription_model = Column(String, default="base")
    llm_model = Column(String, default="llama3")
    
    ollama_base_url = Column(String, default="http://localhost:11434/api/generate")
    openai_api_key = Column(String, default="")
    groq_api_key = Column(String, default="")
    gemini_api_key = Column(String, default="")
    openrouter_api_key = Column(String, default="")
