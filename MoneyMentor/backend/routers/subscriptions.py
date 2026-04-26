from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from database import get_db, Transaction, User
from auth import get_current_user
from utils.subscription_detector import detect_subscriptions, calculate_total_monthly_cost

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


class SubscriptionOut(BaseModel):
    name: str
    merchant_key: str
    icon: str
    average_cost: float
    monthly_cost: float
    frequency: str
    last_payment: str
    next_payment: str
    occurrence_count: int


def _health_score(total_monthly_sub: float, sub_count: int, avg_monthly_expense: float) -> dict:
    """
    Score 0-100. Higher = healthier (lower subscription burden).
    Penalises: subscriptions as % of expenses, and raw subscription count.
    """
    if avg_monthly_expense <= 0:
        pct_score = 50
    else:
        pct = (total_monthly_sub / avg_monthly_expense) * 100
        # 0% → 100pts, 10% → 80pts, 20% → 60pts, 30% → 40pts, 50%+ → 0pts
        pct_score = max(0, 100 - pct * 2)

    # Count penalty: -5 per sub beyond 3
    count_penalty = max(0, (sub_count - 3) * 5)
    score = max(0, min(100, round(pct_score - count_penalty)))

    if score >= 75:
        label, color = "Excellent", "emerald"
    elif score >= 50:
        label, color = "Good", "blue"
    elif score >= 25:
        label, color = "Fair", "amber"
    else:
        label, color = "Review Needed", "red"

    return {"score": score, "label": label, "color": color}


@router.get("/detect", response_model=List[SubscriptionOut])
def detect(
    file_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if file_id:
        q = q.filter(Transaction.file_id == file_id)
    transactions = q.all()
    tx_list = [{"date": t.date, "description": t.description, "amount": t.amount} for t in transactions]
    return detect_subscriptions(tx_list)


@router.get("/summary")
def summary(
    file_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if file_id:
        q = q.filter(Transaction.file_id == file_id)
    transactions = q.all()
    tx_list = [{"date": t.date, "description": t.description, "amount": t.amount} for t in transactions]
    subs = detect_subscriptions(tx_list)
    total_monthly = calculate_total_monthly_cost(subs)

    # Monthly expense average (expenses only, across all months present)
    expenses = [abs(t.amount) for t in transactions if t.amount < 0]
    months_seen = len(set(t.date[:7] for t in transactions)) or 1
    avg_monthly_expense = sum(expenses) / months_seen if expenses else 0

    health = _health_score(total_monthly, len(subs), avg_monthly_expense)

    return {
        "total_monthly_cost": total_monthly,
        "annual_cost": round(total_monthly * 12, 2),
        "subscription_count": len(subs),
        "health_score": health["score"],
        "health_label": health["label"],
        "health_color": health["color"],
    }
