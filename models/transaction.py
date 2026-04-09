from sqlalchemy import Column, String, Float, DateTime, Enum
from sqlalchemy.sql import func
from db.database import Base
import enum

class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    FAILED = "failed"

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True)
    payment_link_id = Column(String, nullable=True)
    signature = Column(String, nullable=True, unique=True)
    sender_wallet = Column(String, nullable=True)
    receiver_wallet = Column(String, nullable=False)
    amount_sol = Column(Float, nullable=True)
    amount_usdc = Column(Float, nullable=True)
    amount_ngn = Column(Float, nullable=True)
    ngn_rate = Column(Float, nullable=True)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING)
    memo = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
