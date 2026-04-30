import csv
import io
from datetime import datetime
from typing import List, Dict

CATEGORY_RULES: List[tuple] = [
    ("Food & Dining", [
        "restaurant", "cafe", "coffee", "starbucks", "mcdonalds", "mcdonald",
        "subway", "pizza", "doordash", "uber eats", "ubereats", "swiggy",
        "zomato", "grubhub", "burger", "taco", "sushi", "diner", "bakery",
        "dominos", "kfc", "chipotle", "wendy", "dunkin", "panera", "dairy queen",
        "popeyes", "chick-fil", "five guys", "dining", "bistro", "eatery",
        "canteen", "mess", "lunch", "dinner", "breakfast",
    ]),
    ("Entertainment", [
        "netflix", "spotify", "hulu", "disney", "apple tv", "appletv",
        "youtube", "amazon prime", "primevideo", "prime video", "movie",
        "cinema", "theater", "theatre", "steam", "playstation", "xbox",
        "twitch", "hbo", "peacock", "paramount", "crunchyroll", "funimation",
        "audible", "kindle", "concert", "ticketmaster", "eventbrite",
    ]),
    ("Transport", [
        "uber", "lyft", "taxi", "metro", "train", "bus", "fuel", "gas station",
        "petrol", "parking", "toll", "airline", "flight", "ola", "rapido",
        "irctc", "makemytrip", "goibibo", "redbus", "indigo", "spicejet",
        "southwest", "delta", "united", "american airlines",
    ]),
    ("Shopping", [
        "amazon", "walmart", "target", "ebay", "flipkart", "myntra", "zara",
        "h&m", "shopping", "shop", "mall", "retail", "ikea", "costco",
        "best buy", "bestbuy", "apple store", "clothing", "fashion", "meesho",
        "ajio", "nykaa",
    ]),
    ("Health & Fitness", [
        "pharmacy", "medical", "doctor", "hospital", "clinic", "gym",
        "fitness", "yoga", "medicine", "health", "dental", "cvs", "walgreens",
        "rite aid", "apollo", "medplus", "1mg", "practo", "cult", "crossfit",
        "planet fitness",
    ]),
    ("Utilities & Bills", [
        "electricity", "water", "internet", "broadband", "phone", "mobile",
        "cable", "insurance", "utility", "airtel", "jio", "bsnl", "comcast",
        "att", "at&t", "verizon", "t-mobile", "spectrum", "xfinity",
        "electric", "gas bill", "sewage",
    ]),
    ("Subscriptions", [
        "adobe", "microsoft", "google one", "dropbox", "slack", "zoom",
        "notion", "figma", "canva", "grammarly", "lastpass", "1password",
        "nordvpn", "expressvpn", "linkedin", "subscription",
    ]),
]


def categorise(description: str, amount: float) -> str:
    if amount > 0:
        return "Income"
    desc = description.lower()
    for category, keywords in CATEGORY_RULES:
        for kw in keywords:
            if kw in desc:
                return category
    return "Other"


def _parse_date(date_str: str) -> str:
    """Try multiple date formats and return YYYY-MM-DD string."""
    formats = [
        "%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%m-%d-%Y",
        "%d %b %Y", "%d %B %Y", "%b %d, %Y", "%B %d, %Y",
        "%Y/%m/%d", "%d/%m/%y", "%m/%d/%y",
    ]
    date_str = date_str.strip()
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    raise ValueError(f"Unrecognised date format: {date_str!r}")


def parse_csv(content: bytes, user_id: int) -> List[Dict]:
    text = content.decode("utf-8-sig", errors="replace")  # handle BOM
    reader = csv.DictReader(io.StringIO(text))

    # Normalise column names
    if reader.fieldnames is None:
        raise ValueError("CSV appears to be empty.")
    norm = {f.strip().lower(): f for f in reader.fieldnames}

    required = {"date", "description", "amount"}
    if not required.issubset(norm.keys()):
        raise ValueError(
            f"CSV must contain columns: Date, Description, Amount. Got: {list(norm.keys())}"
        )

    date_col   = norm["date"]
    desc_col   = norm["description"]
    amount_col = norm["amount"]

    transactions = []
    for row in reader:
        raw_date   = (row.get(date_col)   or "").strip()
        raw_desc   = (row.get(desc_col)   or "").strip()
        raw_amount = (row.get(amount_col) or "").strip()

        if not raw_date or not raw_desc or not raw_amount:
            continue

        try:
            date_str = _parse_date(raw_date)
        except ValueError:
            continue

        try:
            # Strip currency symbols / commas before parsing
            clean = raw_amount.replace(",", "").replace("₹", "").replace("$", "").strip()
            amount = float(clean)
        except ValueError:
            continue

        transactions.append({
            "user_id":     user_id,
            "date":        date_str,
            "description": raw_desc,
            "amount":      amount,
            "category":    categorise(raw_desc, amount),
        })

    return transactions
