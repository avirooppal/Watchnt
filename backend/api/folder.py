from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import SessionLocal
from database.models import Folder
from schemas.folder import FolderCreate, FolderResponse
from core.deps import get_db

router = APIRouter()

@router.post("/folder", response_model=FolderResponse)
def create_folder(folder: FolderCreate, db: Session = Depends(get_db)):
    db_folder = Folder(name=folder.name)
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    return db_folder

@router.get("/folders", response_model=list[FolderResponse])
def get_folders(db: Session = Depends(get_db)):
    return db.query(Folder).all()

@router.delete("/folder/{folder_id}")
def delete_folder(folder_id: str, db: Session = Depends(get_db)):
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
        
    db.delete(folder)
    db.commit()
    return {"success": True}
