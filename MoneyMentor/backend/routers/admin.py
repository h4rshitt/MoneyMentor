import os
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db, User, UploadedFile, Transaction

router = APIRouter(prefix="/admin", tags=["Admin"])

ADMIN_SECRET = os.getenv("ADMIN_SECRET", "moneymentor-admin-secret")


def verify_admin(x_admin_secret: str = Header(...)):
    if x_admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")


@router.get("/users")
def list_all_users(db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        file_count = db.query(func.count(UploadedFile.id)).filter(UploadedFile.user_id == u.id).scalar()
        txn_count = db.query(func.count(Transaction.id)).filter(Transaction.user_id == u.id).scalar()
        result.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "joined": u.created_at.isoformat() if u.created_at else None,
            "files_uploaded": file_count,
            "total_transactions": txn_count,
        })
    return {"total_users": len(result), "users": result}


@router.get("/users/{user_id}/files")
def get_user_files(user_id: int, db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    files = db.query(UploadedFile).filter(UploadedFile.user_id == user_id).order_by(UploadedFile.upload_date.desc()).all()
    return {
        "user": {"id": user.id, "name": user.name, "email": user.email},
        "files": [
            {
                "id": f.id,
                "filename": f.filename,
                "row_count": f.row_count,
                "upload_date": f.upload_date.isoformat() if f.upload_date else None,
            }
            for f in files
        ],
    }


@router.get("/users/{user_id}/transactions")
def get_user_transactions(
    user_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    txns = db.query(Transaction).filter(Transaction.user_id == user_id).order_by(Transaction.date.desc()).all()
    return {
        "user": {"id": user.id, "name": user.name, "email": user.email},
        "total_transactions": len(txns),
        "transactions": [
            {
                "id": t.id,
                "date": t.date,
                "description": t.description,
                "amount": t.amount,
                "category": t.category,
                "file_id": t.file_id,
            }
            for t in txns
        ],
    }


@router.get("/stats")
def platform_stats(db: Session = Depends(get_db), _: None = Depends(verify_admin)):
    total_users = db.query(func.count(User.id)).scalar()
    total_files = db.query(func.count(UploadedFile.id)).scalar()
    total_txns = db.query(func.count(Transaction.id)).scalar()
    total_spend = db.query(func.sum(Transaction.amount)).filter(Transaction.amount < 0).scalar() or 0
    total_income = db.query(func.sum(Transaction.amount)).filter(Transaction.amount > 0).scalar() or 0

    return {
        "total_users": total_users,
        "total_files_uploaded": total_files,
        "total_transactions": total_txns,
        "total_spend": round(abs(total_spend), 2),
        "total_income": round(total_income, 2),
    }
