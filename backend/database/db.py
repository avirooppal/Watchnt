from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
import os

from core.logging import get_logger
logger = get_logger(__name__)

SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./watchnt.db")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def init_db():
    Base.metadata.create_all(bind=engine)
    # Additive, idempotent settings upgrade; existing meetings are untouched.
    columns = {c["name"] for c in inspect(engine).get_columns("settings")}
    with engine.begin() as connection:
        for name, default in (("transcription_language", "auto"), ("cloud_text_consent", "no")):
            if name not in columns:
                connection.execute(text(f"ALTER TABLE settings ADD COLUMN {name} VARCHAR DEFAULT '{default}'"))
        connection.execute(text("UPDATE settings SET transcription_provider='local'"))
    logger.info("Database initialized. File should exist at watchnt.db")

if __name__ == "__main__":
    init_db()
