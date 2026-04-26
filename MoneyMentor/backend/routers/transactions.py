from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database import get_db, Transaction, UploadedFile, User
from auth import get_current_user
from utils.csv_parser import parse_csv

router = APIRouter(prefix="/transactions", tags=["Transactions"])


class TransactionOut(BaseModel):
    id: int
    date: str
    description: str
    amount: float
    category: str
    file_id: Optional[int] = None

    class Config:
        from_attributes = True


@router.post("/upload")
async def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted")

    content = await file.read()
    try:
        parsed = parse_csv(content, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Create UploadedFile record
    uploaded = UploadedFile(
        user_id=current_user.id,
        filename=file.filename,
        row_count=len(parsed),
    )
    db.add(uploaded)
    db.flush()  # Get the id before commit

    for t in parsed:
        db.add(Transaction(**t, file_id=uploaded.id))

    db.commit()
    return {
        "message": f"Uploaded {len(parsed)} transactions from '{file.filename}'",
        "count": len(parsed),
        "file_id": uploaded.id,
        "filename": file.filename,
    }


@router.get("/", response_model=List[TransactionOut])
def get_transactions(
    file_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if file_id:
        q = q.filter(Transaction.file_id == file_id)
    return q.order_by(Transaction.date.desc()).all()


@router.delete("/")
def clear_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.query(Transaction).filter(Transaction.user_id == current_user.id).delete()
    db.commit()
    return {"message": "All transactions cleared"}
