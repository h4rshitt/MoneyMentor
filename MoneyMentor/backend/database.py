from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

# Railway injects DATABASE_URL automatically when PostgreSQL plugin is added.
# Falls back to local SQLite for development.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./moneymentor.db")

# SQLAlchemy requires postgresql:// not postgres:// (Railway uses the old format)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLite needs check_same_thread=False; PostgreSQL doesn't accept it
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    transactions = relationship("Transaction", back_populates="owner", cascade="all, delete")
    goals = relationship("FinancialGoal", back_populates="owner", cascade="all, delete")
    uploaded_files = relationship("UploadedFile", back_populates="owner", cascade="all, delete")


class UploadedFile(Base):
    __tablename__ = "uploaded_files"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    filename = Column(String, nullable=False)
    row_count = Column(Integer, default=0)
    upload_date = Column(DateTime, default=datetime.utcnow)
    owner = relationship("User", back_populates="uploaded_files")
    transactions = relationship("Transaction", back_populates="file", cascade="all, delete")


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    file_id = Column(Integer, ForeignKey("uploaded_files.id"), nullable=True)
    date = Column(String, nullable=False)
    description = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String, default="Other")
    created_at = Column(DateTime, default=datetime.utcnow)
    owner = relationship("User", back_populates="transactions")
    file = relationship("UploadedFile", back_populates="transactions")


class FinancialGoal(Base):
    __tablename__ = "financial_goals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    goal_amount = Column(Float, nullable=False)
    monthly_savings = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    owner = relationship("User", back_populates="goals")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    Base.metadata.create_all(bind=engine)
    # Safe migration: add file_id column to existing transactions table (SQLite only)
    # PostgreSQL: SQLAlchemy's create_all handles schema via models above
    if DATABASE_URL.startswith("sqlite"):
        from sqlalchemy import text, inspect
        inspector = inspect(engine)
        cols = [c["name"] for c in inspector.get_columns("transactions")]
        with engine.connect() as conn:
            if "file_id" not in cols:
                conn.execute(text("ALTER TABLE transactions ADD COLUMN file_id INTEGER REFERENCES uploaded_files(id)"))
                conn.commit()
