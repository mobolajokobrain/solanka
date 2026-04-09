from sqlalchemy import Column, String, Float, DateTime, Boolean
from sqlalchemy.sql import func
from db.database import Base

class PaymentLink(Base):
    __tablename__ = "payment_links"

    id = Column(String, primary_key=True)
    slug = Column(String, unique=True, nullable=False)
    merchant_wallet = Column(String, nullable=False)
    amount_usdc = Column(Float, nullable=True)   # None = open amount
    description = Column(String, nullable=True)
    label = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    times_used = Column(Float, default=0)
    created_at = Column(DateTime, server_default=func.now())
