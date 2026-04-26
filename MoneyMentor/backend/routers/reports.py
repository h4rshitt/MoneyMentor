from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db, Transaction, User
from auth import get_current_user
from collections import defaultdict

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/monthly")
def monthly_report(
    file_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if file_id:
        q = q.filter(Transaction.file_id == file_id)
    transactions = q.all()

    monthly: dict = defaultdict(lambda: {"spending": 0.0, "income": 0.0, "month": "", "count": 0})

    for t in transactions:
        try:
            from datetime import datetime
            date = datetime.strptime(t.date[:7], "%Y-%m")
            key = t.date[:7]
            monthly[key]["month"] = date.strftime("%b %Y")
            if t.amount < 0:
                monthly[key]["spending"] += abs(t.amount)
            else:
                monthly[key]["income"] += t.amount
            monthly[key]["count"] += 1
        except Exception:
            pass

    result = []
    for key in sorted(monthly.keys()):
        data = monthly[key]
        result.append({
            "period": key,
            "month": data["month"],
            "spending": round(data["spending"], 2),
            "income": round(data["income"], 2),
            "net": round(data["income"] - data["spending"], 2),
            "transactions": data["count"],
        })

    total_spending = round(sum(r["spending"] for r in result), 2)
    total_income = round(sum(r["income"] for r in result), 2)
    avg_monthly = round(total_spending / len(result), 2) if result else 0

    return {
        "months": result,
        "summary": {
            "total_spending": total_spending,
            "total_income": total_income,
            "net_savings": round(total_income - total_spending, 2),
            "avg_monthly_spend": avg_monthly,
            "months_count": len(result),
        }
    }


@router.get("/by-category")
def by_category_report(
    file_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Spending breakdown grouped by transaction category (expenses only)."""
    q = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.amount < 0,
    )
    if file_id:
        q = q.filter(Transaction.file_id == file_id)
    transactions = q.all()

    totals: dict = defaultdict(float)
    counts: dict = defaultdict(int)
    for t in transactions:
        cat = t.category or "Other"
        totals[cat] += abs(t.amount)
        counts[cat] += 1

    total_spend = sum(totals.values())
    result = []
    for cat, amount in sorted(totals.items(), key=lambda x: x[1], reverse=True):
        result.append({
            "category": cat,
            "amount": round(amount, 2),
            "count": counts[cat],
            "percentage": round(amount / total_spend * 100, 1) if total_spend else 0,
        })

    return {"categories": result, "total_spending": round(total_spend, 2)}
