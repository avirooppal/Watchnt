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
