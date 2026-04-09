from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func
from db.database import Base
import secrets


class User(Base):
    __tablename__ = "users"

    id               = Column(String, primary_key=True)
    email            = Column(String, unique=True, nullable=False, index=True)
    password_hash    = Column(String, nullable=True)          # nullable — Google users have no password
    display_name     = Column(String, nullable=False)
    phone            = Column(String, nullable=True)
    solana_wallet    = Column(String, nullable=True)

    # Auth provider
    auth_provider    = Column(String, default="email")        # "email" | "google"
    google_id        = Column(String, unique=True, nullable=True, index=True)
    google_picture   = Column(String, nullable=True)

    # KYC
    kyc_status       = Column(String, default="not_started")  # not_started | pending | verified | failed
    kyc_type         = Column(String, nullable=True)          # "bvn" | "nin"
    kyc_value        = Column(String, nullable=True)          # last 4 digits only (never store full BVN/NIN)
    kyc_provider_ref = Column(String, nullable=True)          # Dojah reference ID
    kyc_verified_at  = Column(DateTime, nullable=True)

    # Terms & Conditions
    terms_accepted_at = Column(DateTime, nullable=True)
    terms_version     = Column(String, nullable=True)         # e.g. "v1.0"

    # Onboarding gate
    is_onboarded     = Column(Boolean, default=False)

    api_key          = Column(String, unique=True, nullable=False, index=True,
                              default=lambda: f"sk_{secrets.token_urlsafe(32)}")
    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime, server_default=func.now())
    updated_at       = Column(DateTime, server_default=func.now(), onupdate=func.now())
