import pandas as pd
import io
from typing import List, Dict

CATEGORY_RULES: List[tuple] = [
    ("Income", []),  # handled by sign check
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
        if category == "Income":
            continue
        for kw in keywords:
            if kw in desc:
                return category
    return "Other"


def parse_csv(content: bytes, user_id: int) -> List[Dict]:
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise ValueError(f"Could not parse CSV: {str(e)}")

    df.columns = [c.strip().lower() for c in df.columns]

    required = {"date", "description", "amount"}
    if not required.issubset(set(df.columns)):
        raise ValueError(f"CSV must contain columns: Date, Description, Amount. Got: {list(df.columns)}")

    df = df.dropna(subset=["date", "description", "amount"])
    df["description"] = df["description"].astype(str).str.strip()
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0)

    df["date"] = pd.to_datetime(df["date"], infer_datetime_format=True, errors="coerce")
    df = df.dropna(subset=["date"])
    df["date"] = df["date"].dt.strftime("%Y-%m-%d")

    transactions = []
    for _, row in df.iterrows():
        transactions.append({
            "user_id": user_id,
            "date": row["date"],
            "description": row["description"],
            "amount": float(row["amount"]),
            "category": categorise(row["description"], float(row["amount"])),
        })
    return transactions
