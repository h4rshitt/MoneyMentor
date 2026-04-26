# MoneyMentor 💰

**AI-Powered Subscription Intelligence Platform**

A full-stack fintech web application for detecting recurring subscriptions, simulating financial goals, and generating AI negotiation scripts.

---

## 🚀 Quick Start

### 1. Start the Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
API docs available at: http://localhost:8000/docs

### 2. Start the Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
App available at: http://localhost:5173

---

## 🔑 Features

| Feature | Description |
|---------|-------------|
| 🔐 **Auth** | JWT-based signup/login with bcrypt passwords |
| 📂 **CSV Upload** | Drag & drop bank statement import |
| 🔍 **Subscription Detection** | Auto-detects recurring payments via pandas |
| 🎯 **Goal Simulator** | Shows how subscriptions delay financial goals |
| 🤝 **Bill Negotiator** | AI-generated negotiation scripts (Gemini API) |
| 🌙 **Dark Mode** | Full dark/light mode toggle |
| 📊 **Charts** | Pie chart, bar chart via Recharts |
| 📥 **Export** | Download subscription/transaction reports |

---

## 📁 Project Structure

```
MoneyMentor/
├── backend/
│   ├── main.py                 # FastAPI app
│   ├── database.py             # SQLite models
│   ├── auth.py                 # JWT helpers
│   ├── routers/
│   │   ├── auth.py             # /auth/signup, /auth/login
│   │   ├── transactions.py     # CSV upload & retrieval
│   │   ├── subscriptions.py    # Detection engine
│   │   ├── goals.py            # Goal simulator
│   │   └── ai.py               # Gemini negotiation
│   └── utils/
│       ├── csv_parser.py       # Pandas CSV parsing
│       └── subscription_detector.py  # Rule-based detection
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Signup.jsx
│       │   └── Dashboard.jsx   # Main app (all panels)
│       ├── context/AuthContext.jsx
│       └── api/client.js       # Axios API client
│
└── sample_transactions.csv     # Sample data for testing
```

---

## 🤖 Gemini API (Optional)

To enable AI-generated negotiation scripts:

1. Get a key from [Google AI Studio](https://aistudio.google.com)
2. Either add it to `backend/.env`:
   ```
   GEMINI_API_KEY=your_key_here
   ```
3. Or paste it into the **Bill Negotiator** panel in the app

Without a key, a professional template script is generated automatically.

---

## 📄 Sample CSV Format

```csv
Date,Description,Amount
2024-01-15,Netflix,-15.99
2024-02-15,Netflix,-15.99
2024-01-01,Spotify,-9.99
```

A ready-to-use sample is included: `sample_transactions.csv`

---

## 🛠 Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, SQLite, Pandas, python-jose
- **Frontend**: React (Vite), TailwindCSS, Recharts, Axios, React Router v6
- **AI**: Google Gemini 1.5 Flash
