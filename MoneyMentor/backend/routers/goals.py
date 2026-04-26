from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from database import get_db, FinancialGoal, Transaction, User
from auth import get_current_user
from utils.subscription_detector import detect_subscriptions, calculate_total_monthly_cost
from datetime import timedelta

router = APIRouter(prefix="/goals", tags=["Goals"])


class GoalCreate(BaseModel):
    name: str
    goal_amount: float
    monthly_savings: float


class GoalOut(BaseModel):
    id: int
    name: str
    goal_amount: float
    monthly_savings: float
    created_at: str

    class Config:
        from_attributes = True


class GoalSimulateRequest(BaseModel):
    name: str
    goal_amount: float
    monthly_savings: float
    file_id: Optional[int] = None


def months_to_date(months: float) -> str:
    today = datetime.now()
    delta_days = int(months * 30.44)
    completion = today + timedelta(days=delta_days)
    return completion.strftime("%B %Y")


def _simulate(goal_amount, monthly_savings, subs):
    total_sub = calculate_total_monthly_cost(subs)
    if monthly_savings <= 0:
        return dict(original_months=9999, original_date="Never",
                    adjusted_months=9999, adjusted_date="Never",
                    delay=9999, total_sub=total_sub, adjusted_savings=0)
    orig = goal_amount / monthly_savings
    adj_sav = monthly_savings - total_sub
    if adj_sav <= 0:
        return dict(original_months=round(orig, 1), original_date=months_to_date(orig),
                    adjusted_months=9999, adjusted_date="Not achievable",
                    delay=9999, total_sub=total_sub, adjusted_savings=round(adj_sav, 2))
    adj = goal_amount / adj_sav
    return dict(original_months=round(orig, 1), original_date=months_to_date(orig),
                adjusted_months=round(adj, 1), adjusted_date=months_to_date(adj),
                delay=round(adj - orig, 1), total_sub=round(total_sub, 2),
                adjusted_savings=round(adj_sav, 2))


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.post("/", response_model=GoalOut)
def create_goal(req: GoalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    goal = FinancialGoal(user_id=current_user.id, **req.dict())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return GoalOut(id=goal.id, name=goal.name, goal_amount=goal.goal_amount,
                   monthly_savings=goal.monthly_savings,
                   created_at=goal.created_at.strftime("%Y-%m-%d"))


@router.get("/", response_model=List[GoalOut])
def list_goals(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    goals = db.query(FinancialGoal).filter(FinancialGoal.user_id == current_user.id).order_by(FinancialGoal.created_at.desc()).all()
    return [GoalOut(id=g.id, name=g.name, goal_amount=g.goal_amount,
                    monthly_savings=g.monthly_savings, created_at=g.created_at.strftime("%Y-%m-%d"))
            for g in goals]


@router.delete("/{goal_id}")
def delete_goal(goal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    goal = db.query(FinancialGoal).filter(FinancialGoal.id == goal_id, FinancialGoal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()
    return {"message": "Goal deleted"}


# ── Simulate ──────────────────────────────────────────────────────────────────

@router.post("/simulate")
def simulate_goal(req: GoalSimulateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if req.file_id:
        q = q.filter(Transaction.file_id == req.file_id)
    tx_list = [{"date": t.date, "description": t.description, "amount": t.amount} for t in q.all()]
    subs = detect_subscriptions(tx_list)
    result = _simulate(req.goal_amount, req.monthly_savings, subs)
    return {
        "name": req.name,
        "goal_amount": req.goal_amount,
        "monthly_savings": req.monthly_savings,
        "total_subscription_cost": result["total_sub"],
        "adjusted_savings": result["adjusted_savings"],
        "original_months": result["original_months"],
        "adjusted_months": result["adjusted_months"],
        "original_completion_date": result["original_date"],
        "adjusted_completion_date": result["adjusted_date"],
        "delay_months": result["delay"],
        "subscriptions": subs,
    }


@router.get("/simulate-all")
def simulate_all_goals(file_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Simulate all saved goals at once."""
    goals = db.query(FinancialGoal).filter(FinancialGoal.user_id == current_user.id).all()
    q = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if file_id:
        q = q.filter(Transaction.file_id == file_id)
    tx_list = [{"date": t.date, "description": t.description, "amount": t.amount} for t in q.all()]
    subs = detect_subscriptions(tx_list)
    results = []
    for g in goals:
        result = _simulate(g.goal_amount, g.monthly_savings, subs)
        results.append({
            "id": g.id,
            "name": g.name,
            "goal_amount": g.goal_amount,
            "monthly_savings": g.monthly_savings,
            "original_months": result["original_months"],
            "original_date": result["original_date"],
            "adjusted_months": result["adjusted_months"],
            "adjusted_date": result["adjusted_date"],
            "delay_months": result["delay"],
            "total_sub": result["total_sub"],
            "total_subscription_cost": result["total_sub"],
            "adjusted_savings": result["adjusted_savings"],
        })
    return results
