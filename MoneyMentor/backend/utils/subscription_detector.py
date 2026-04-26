import pandas as pd
from typing import List, Dict
from datetime import datetime, timedelta
import re

# Known subscription service patterns
SERVICE_ICONS = {
    "netflix": "🎬",
    "spotify": "🎵",
    "amazon": "📦",
    "prime": "📦",
    "hulu": "📺",
    "disney": "🏰",
    "apple": "🍎",
    "google": "🔍",
    "microsoft": "💻",
    "gym": "💪",
    "fitness": "💪",
    "internet": "🌐",
    "phone": "📱",
    "insurance": "🛡️",
    "adobe": "🎨",
    "dropbox": "☁️",
    "slack": "💬",
    "zoom": "📹",
    "youtube": "▶️",
    "default": "💳",
}


def normalize_merchant(description: str) -> str:
    """Normalize merchant name for grouping."""
    desc = description.lower().strip()
    # Remove common noise words
    noise = ["payment", "purchase", "debit", "credit", "pos", "online", "auto", "recurring",
             "subscription", "monthly", "charge", "bill", "*", "#", "-", "  "]
    for n in noise:
        desc = desc.replace(n, " ")
    desc = re.sub(r'\d{4,}', '', desc)   # remove long numbers
    desc = re.sub(r'\s+', ' ', desc).strip()
    return desc


def get_icon(merchant: str) -> str:
    lower = merchant.lower()
    for key, icon in SERVICE_ICONS.items():
        if key in lower:
            return icon
    return SERVICE_ICONS["default"]


def detect_subscriptions(transactions: List[Dict]) -> List[Dict]:
    """
    Detect recurring subscriptions from a list of transaction dicts.
    Groups by normalized merchant, then checks if payments recur ~30 days apart.
    """
    if not transactions:
        return []

    df = pd.DataFrame(transactions)
    df["date"] = pd.to_datetime(df["date"])
    df["amount"] = df["amount"].astype(float)

    # Only look at debits (negative or positive – handle both conventions)
    # Treat negative amounts as expenses; also handle positive-expense CSVs
    df["abs_amount"] = df["amount"].abs()

    df["merchant"] = df["description"].apply(normalize_merchant)

    subscriptions = []
    grouped = df.groupby("merchant")

    for merchant, group in grouped:
        group = group.sort_values("date")
        if len(group) < 2:
            continue

        dates = group["date"].tolist()
        amounts = group["abs_amount"].tolist()

        # Calculate intervals between consecutive payments
        intervals = []
        for i in range(1, len(dates)):
            delta = (dates[i] - dates[i - 1]).days
            intervals.append(delta)

        # Check if intervals are around 30 days (20-45 day window)
        recurring = [20 <= iv <= 45 for iv in intervals]
        if not any(recurring):
            # Also check for weekly (6-10 days) or annual (330-400 days)
            recurring_weekly = [6 <= iv <= 10 for iv in intervals]
            recurring_annual = [330 <= iv <= 400 for iv in intervals]
            if not any(recurring_weekly) and not any(recurring_annual):
                continue

        avg_amount = sum(amounts) / len(amounts)
        last_date = dates[-1]
        avg_interval = sum(intervals) / len(intervals) if intervals else 30

        # Estimate next payment
        next_date = last_date + timedelta(days=round(avg_interval))

        # Determine frequency label
        if avg_interval <= 10:
            frequency = "Weekly"
            monthly_cost = avg_amount * 4.33
        elif avg_interval <= 45:
            frequency = "Monthly"
            monthly_cost = avg_amount
        else:
            frequency = "Annual"
            monthly_cost = avg_amount / 12

        # Use the original description (most common) as display name
        display_name = group["description"].mode()[0] if not group["description"].mode().empty else merchant.title()

        subscriptions.append({
            "name": display_name,
            "merchant_key": merchant,
            "icon": get_icon(merchant),
            "average_cost": round(avg_amount, 2),
            "monthly_cost": round(monthly_cost, 2),
            "frequency": frequency,
            "last_payment": last_date.strftime("%Y-%m-%d"),
            "next_payment": next_date.strftime("%Y-%m-%d"),
            "occurrence_count": len(group),
        })

    # Sort by monthly cost descending
    subscriptions.sort(key=lambda x: x["monthly_cost"], reverse=True)
    return subscriptions


def calculate_total_monthly_cost(subscriptions: List[Dict]) -> float:
    return round(sum(s["monthly_cost"] for s in subscriptions), 2)
