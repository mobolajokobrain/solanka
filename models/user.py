from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func
from db.database import Base
import secrets


class User(Base):
    __tablename__ = "users"

    id             = Column(String, primary_key=True)
    email          = Column(String, unique=True, nullable=False, index=True)
    password_hash  = Column(String, nullable=False)
    display_name   = Column(String, nullable=False)
    solana_wallet  = Column(String, nullable=True)
    api_key        = Column(String, unique=True, nullable=False, index=True,
                            default=lambda: f"sk_{secrets.token_urlsafe(32)}")
    is_active      = Column(Boolean, default=True)
    created_at     = Column(DateTime, server_default=func.now())
    updated_at     = Column(DateTime, server_default=func.now(), onupdate=func.now())
