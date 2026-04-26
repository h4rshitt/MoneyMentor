from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime
from database import get_db, UploadedFile, Transaction, User
from auth import get_current_user

router = APIRouter(prefix="/files", tags=["File Management"])


class FileOut(BaseModel):
    id: int
    filename: str
    row_count: int
    upload_date: str

    class Config:
        from_attributes = True


@router.get("/", response_model=List[FileOut])
def list_files(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    files = (
        db.query(UploadedFile)
        .filter(UploadedFile.user_id == current_user.id)
        .order_by(UploadedFile.upload_date.desc())
        .all()
    )
    return [
        FileOut(
            id=f.id,
            filename=f.filename,
            row_count=f.row_count,
            upload_date=f.upload_date.strftime("%Y-%m-%d %H:%M"),
        )
        for f in files
    ]


@router.delete("/{file_id}")
def delete_file(file_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    file = db.query(UploadedFile).filter(
        UploadedFile.id == file_id, UploadedFile.user_id == current_user.id
    ).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    db.delete(file)
    db.commit()
    return {"message": "File and its transactions deleted"}
