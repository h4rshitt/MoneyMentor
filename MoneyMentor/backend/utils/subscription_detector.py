import re
from collections import defaultdict
from datetime import datetime, timedelta
from typing import List, Dict

SERVICE_ICONS = {
    "netflix": "🎬", "spotify": "🎵", "amazon": "📦", "prime": "📦",
    "hulu": "📺", "disney": "🏰", "apple": "🍎", "google": "🔍",
    "microsoft": "💻", "gym": "💪", "fitness": "💪", "internet": "🌐",
    "phone": "📱", "insurance": "🛡️", "adobe": "🎨", "dropbox": "☁️",
    "slack": "💬", "zoom": "📹", "youtube": "▶️", "default": "💳",
}


def normalize_merchant(description: str) -> str:
    desc = description.lower().strip()
    noise = ["payment", "purchase", "debit", "credit", "pos", "online",
             "auto", "recurring", "subscription", "monthly", "charge",
             "bill", "*", "#", "-", "  "]
    for n in noise:
        desc = desc.replace(n, " ")
    desc = re.sub(r'\d{4,}', '', desc)
    desc = re.sub(r'\s+', ' ', desc).strip()
    return desc


def get_icon(merchant: str) -> str:
    lower = merchant.lower()
    for key, icon in SERVICE_ICONS.items():
        if key in lower:
            return icon
    return SERVICE_ICONS["default"]


def detect_subscriptions(transactions: List[Dict]) -> List[Dict]:
    if not transactions:
        return []

    # Group by normalized merchant
    groups: Dict[str, List[Dict]] = defaultdict(list)
    for t in transactions:
        if t.get("amount", 0) >= 0:
            continue  # skip income
        key = normalize_merchant(t["description"])
        if not key:
            continue
        groups[key].append(t)

    subscriptions = []

    for merchant, txns in groups.items():
        if len(txns) < 2:
            continue

        # Sort by date
        def parse_dt(t):
            try:
                return datetime.strptime(t["date"], "%Y-%m-%d")
            except Exception:
                return datetime.min

        txns_sorted = sorted(txns, key=parse_dt)
        dates = [parse_dt(t) for t in txns_sorted]
        amounts = [abs(t["amount"]) for t in txns_sorted]

        # Calculate intervals between consecutive payments
        intervals = [(dates[i] - dates[i - 1]).days for i in range(1, len(dates))]

        # Check recurrence windows
        monthly  = any(20 <= iv <= 45 for iv in intervals)
        weekly   = any(6  <= iv <= 10 for iv in intervals)
        annual   = any(330 <= iv <= 400 for iv in intervals)

        if not (monthly or weekly or annual):
            continue

        avg_amount   = sum(amounts) / len(amounts)
        avg_interval = sum(intervals) / len(intervals) if intervals else 30
        last_date    = dates[-1]
        next_date    = last_date + timedelta(days=round(avg_interval))

        if avg_interval <= 10:
            frequency    = "Weekly"
            monthly_cost = avg_amount * 4.33
        elif avg_interval <= 45:
            frequency    = "Monthly"
            monthly_cost = avg_amount
        else:
            frequency    = "Annual"
            monthly_cost = avg_amount / 12

        # Most common description as display name
        desc_counts: Dict[str, int] = defaultdict(int)
        for t in txns_sorted:
            desc_counts[t["description"]] += 1
        display_name = max(desc_counts, key=lambda k: desc_counts[k])

        subscriptions.append({
            "name":             display_name,
            "merchant_key":     merchant,
            "icon":             get_icon(merchant),
            "average_cost":     round(avg_amount, 2),
            "monthly_cost":     round(monthly_cost, 2),
            "frequency":        frequency,
            "last_payment":     last_date.strftime("%Y-%m-%d"),
            "next_payment":     next_date.strftime("%Y-%m-%d"),
            "occurrence_count": len(txns_sorted),
        })

    subscriptions.sort(key=lambda x: x["monthly_cost"], reverse=True)
    return subscriptions


def calculate_total_monthly_cost(subscriptions: List[Dict]) -> float:
    return round(sum(s["monthly_cost"] for s in subscriptions), 2)
