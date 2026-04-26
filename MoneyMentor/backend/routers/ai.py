from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from database import User, get_db, Transaction
from auth import get_current_user
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv
from collections import defaultdict

load_dotenv()

router = APIRouter(prefix="/ai", tags=["AI"])


class NegotiateRequest(BaseModel):
    service_name: str
    current_price: float
    competitor_price: float
    api_key: str = ""


def build_fallback_script(service: str, current: float, competitor: float) -> str:
    savings = round(current - competitor, 2)
    sign = "+" if savings > 0 else ""
    return (
        f"Hi, my name is [Your Name] and I've been a loyal {service} customer. "
        f"I currently pay ${current}/month, but I've seen competitors offering similar services for ${competitor}/month — "
        f"a difference of {sign}${savings}/month. "
        f"I genuinely enjoy {service} and would prefer to stay, but I need to be mindful of my budget. "
        f"Could you offer a retention discount, loyalty deal, or price match? "
        f"I'd love to find a solution that works for both of us — thank you for your time!"
    )


def _build_prompt(service: str, current: float, competitor: float) -> str:
    return (
        f"You are a professional customer service negotiation expert.\n"
        f"Write a warm, confident, 3-5 sentence phone/chat script for a customer "
        f"negotiating a lower monthly bill.\n\n"
        f"Service: {service}\n"
        f"Current monthly price: ${current}\n"
        f"Competitor's price for similar service: ${competitor}\n\n"
        f"Requirements:\n"
        f"- Open warmly and mention being a loyal customer\n"
        f"- Reference the competitor price diplomatically\n"
        f"- Ask for a retention discount, loyalty deal, or price match\n"
        f"- Sound natural and confident, not robotic\n\n"
        f"Return ONLY the script text. No labels, no preamble."
    )


def _load_server_key() -> str:
    """Load AI key from env — checks GROQ_API_KEY first, then GEMINI_API_KEY."""
    return (
        os.getenv("GROQ_API_KEY", "").strip()
        or os.getenv("GEMINI_API_KEY", "").strip()
    )


@router.get("/status")
def ai_status(current_user: User = Depends(get_current_user)):
    """Let the frontend know if a server-side AI key is configured."""
    key = _load_server_key()
    if key.startswith("gsk_"):
        return {"configured": True, "provider": "groq", "model": "llama-3.3-70b-versatile"}
    elif key.startswith("AIza"):
        return {"configured": True, "provider": "gemini", "model": "gemini-2.0-flash"}
    return {"configured": False, "provider": None}


@router.post("/negotiate")
async def negotiate(req: NegotiateRequest, current_user: User = Depends(get_current_user)):
    # Priority: request-provided key → server env key
    api_key = req.api_key.strip() or _load_server_key()
    prompt = _build_prompt(req.service_name, req.current_price, req.competitor_price)

    if not api_key:
        script = build_fallback_script(req.service_name, req.current_price, req.competitor_price)
        return {"script": script, "source": "template"}

    # ── Groq (gsk_ prefix) ────────────────────────────────────────────────────
    if api_key.startswith("gsk_"):
        try:
            from groq import Groq
            client = Groq(api_key=api_key)
            chat = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=350,
                temperature=0.75,
            )
            script = chat.choices[0].message.content.strip()
            return {"script": script, "source": "groq", "model": "llama-3.3-70b-versatile"}
        except Exception as e:
            err = str(e)
            script = build_fallback_script(req.service_name, req.current_price, req.competitor_price)
            if "401" in err or "invalid_api_key" in err.lower():
                note = "Invalid Groq API key. Get a free key at console.groq.com/keys"
            elif "429" in err or "rate_limit" in err.lower():
                note = "Groq rate limit hit. Please wait a moment and try again."
            else:
                note = f"Groq error: {err[:100]}"
            return {"script": script, "source": "template", "note": note}

    # ── Gemini (AIza prefix) ──────────────────────────────────────────────────
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        script = response.text.strip()
        return {"script": script, "source": "gemini", "model": "gemini-2.0-flash"}

    except Exception as e:
        err = str(e)
        script = build_fallback_script(req.service_name, req.current_price, req.competitor_price)
        if "429" in err or "RESOURCE_EXHAUSTED" in err or "quota" in err.lower():
            note = "Gemini quota exhausted. Use a Groq key instead (console.groq.com/keys) — 14,400 free req/day."
        elif "403" in err or "API_KEY_INVALID" in err:
            note = "Invalid Gemini API key."
        else:
            note = f"Gemini error: {err[:100]}"
        return {"script": script, "source": "template", "note": note}


# ── Spending Insights ─────────────────────────────────────────────────────────

def _build_insights_fallback(monthly_data: list, category_data: list, currency_symbol: str = "$") -> List[str]:
    insights = []
    s = currency_symbol
    if monthly_data:
        latest = monthly_data[-1]
        insights.append(f"Your most recent month ({latest['month']}) had {s}{latest['spending']:.0f} in spending.")
        if len(monthly_data) >= 2:
            prev = monthly_data[-2]
            diff = latest["spending"] - prev["spending"]
            direction = "more" if diff > 0 else "less"
            insights.append(f"You spent {s}{abs(diff):.0f} {direction} than the previous month.")
    if category_data:
        top = category_data[0]
        insights.append(f"Your top spending category is {top['category']} at {s}{top['amount']:.0f} ({top['percentage']}% of total).")
    if len(category_data) >= 2:
        insights.append(f"Your top 2 categories account for {category_data[0]['percentage'] + category_data[1]['percentage']:.0f}% of all spending.")
    return insights


@router.get("/insights")
async def spending_insights(
    file_id: Optional[int] = None,
    currency_symbol: str = "$",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate AI spending insights for the last 3 months."""
    from collections import defaultdict
    q = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if file_id:
        q = q.filter(Transaction.file_id == file_id)
    transactions = q.all()

    if not transactions:
        return {"insights": ["Upload a CSV to get personalised spending insights."], "source": "empty"}

    # Build monthly summary (last 3 months)
    monthly: dict = defaultdict(lambda: {"spending": 0.0, "income": 0.0, "month": ""})
    cat_totals: dict = defaultdict(float)

    for t in transactions:
        try:
            from datetime import datetime
            key = t.date[:7]
            date = datetime.strptime(key, "%Y-%m")
            monthly[key]["month"] = date.strftime("%b %Y")
            if t.amount < 0:
                monthly[key]["spending"] += abs(t.amount)
                cat_totals[t.category or "Other"] += abs(t.amount)
            else:
                monthly[key]["income"] += t.amount
        except Exception:
            pass

    sorted_months = sorted(monthly.keys())[-3:]
    monthly_data = [
        {"month": monthly[k]["month"], "spending": round(monthly[k]["spending"], 2), "income": round(monthly[k]["income"], 2)}
        for k in sorted_months
    ]
    total_spend = sum(cat_totals.values())
    category_data = sorted(
        [{"category": c, "amount": round(v, 2), "percentage": round(v / total_spend * 100, 1) if total_spend else 0}
         for c, v in cat_totals.items()],
        key=lambda x: x["amount"], reverse=True
    )[:5]

    s = currency_symbol
    api_key = _load_server_key()
    if not api_key:
        return {"insights": _build_insights_fallback(monthly_data, category_data, s), "source": "template"}

    months_text = "\n".join(
        f"- {m['month']}: {s}{m['spending']:.2f} spending, {s}{m['income']:.2f} income"
        for m in monthly_data
    )
    cats_text = "\n".join(
        f"- {c['category']}: {s}{c['amount']:.2f} ({c['percentage']}%)"
        for c in category_data
    )
    prompt = (
        "You are a personal finance advisor. Analyse this spending data and give 4 short, specific, actionable insights.\n\n"
        f"Monthly spending (last {len(monthly_data)} months):\n{months_text}\n\n"
        f"Top spending categories:\n{cats_text}\n\n"
        f"Currency symbol to use: {s}\n\n"
        "Rules:\n"
        f"- Each insight must be ONE sentence, under 15 words\n"
        f"- Use the currency symbol '{s}' for all amounts (not '$' unless that is the symbol)\n"
        "- Be specific with numbers from the data\n"
        "- Focus on patterns, changes, and savings opportunities\n"
        "- Return ONLY a JSON array of 4 strings. No preamble, no labels.\n"
        'Example: ["insight 1", "insight 2", "insight 3", "insight 4"]'
    )

    if api_key.startswith("gsk_"):
        try:
            from groq import Groq
            import json
            client = Groq(api_key=api_key)
            chat = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.5,
            )
            raw = chat.choices[0].message.content.strip()
            start, end = raw.find("["), raw.rfind("]")
            if start != -1 and end != -1:
                insights = json.loads(raw[start:end + 1])
            else:
                insights = _build_insights_fallback(monthly_data, category_data)
            return {"insights": insights, "source": "groq"}
        except Exception:
            return {"insights": _build_insights_fallback(monthly_data, category_data, s), "source": "template"}

    try:
        from google import genai
        import json
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        raw = response.text.strip()
        start, end = raw.find("["), raw.rfind("]")
        if start != -1 and end != -1:
            insights = json.loads(raw[start:end + 1])
        else:
            insights = _build_insights_fallback(monthly_data, category_data)
        return {"insights": insights, "source": "gemini"}
    except Exception:
        return {"insights": _build_insights_fallback(monthly_data, category_data), "source": "template"}
