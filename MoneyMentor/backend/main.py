import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_tables
from routers import auth, transactions, subscriptions, goals, ai, oauth, files, reports


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield


app = FastAPI(
    title="MoneyMentor API",
    description="AI-Powered Subscription Intelligence Platform",
    version="2.0.0",
    lifespan=lifespan,
)

_origins_env = os.getenv("ALLOWED_ORIGINS", "")
_extra = [o.strip() for o in _origins_env.split(",") if o.strip()]
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
] + _extra

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(subscriptions.router)
app.include_router(goals.router)
app.include_router(ai.router)
app.include_router(oauth.router)
app.include_router(files.router)
app.include_router(reports.router)


@app.get("/")
def root():
    return {"message": "MoneyMentor API v2 is running", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "healthy"}
