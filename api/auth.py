"""
Auth endpoints: register, login, profile, API key management.
"""
import secrets
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr

from db.database import get_db
from models.user import User
from core.auth import hash_password, verify_password, create_access_token, get_current_user
from utils.helpers import generate_id

router = APIRouter(prefix="/auth", tags=["Auth"])


# ── Schemas ───────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str
    solana_wallet: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UpdateProfileRequest(BaseModel):
    display_name: str | None = None
    solana_wallet: str | None = None


def _user_response(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "solana_wallet": user.solana_wallet,
        "api_key": user.api_key,
        "is_active": user.is_active,
        "created_at": user.created_at,
    }


# ── Routes ────────────────────────────────────────────────
@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Create a new Solanka account."""
    # Check email uniqueness
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    if len(body.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")

    user = User(
        id=generate_id(),
        email=body.email,
        password_hash=hash_password(body.password),
        display_name=body.display_name,
        solana_wallet=body.solana_wallet,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id, user.email)
    return {
        "token": token,
        "token_type": "bearer",
        "user": _user_response(user),
    }


@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate and return a JWT."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = create_access_token(user.id, user.email)
    return {
        "token": token,
        "token_type": "bearer",
        "user": _user_response(user),
    }


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return _user_response(current_user)


@router.patch("/me")
async def update_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update display name and/or Solana wallet."""
    if body.display_name is not None:
        current_user.display_name = body.display_name
    if body.solana_wallet is not None:
        current_user.solana_wallet = body.solana_wallet
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return _user_response(current_user)


@router.post("/rotate-key")
async def rotate_api_key(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a new API key (invalidates the old one)."""
    current_user.api_key = f"sk_{secrets.token_urlsafe(32)}"
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return {
        "message": "API key rotated successfully",
        "api_key": current_user.api_key,
    }
