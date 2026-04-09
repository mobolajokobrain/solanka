"""
Auth endpoints: register, login, Google OAuth, profile, API key management.
"""
import os
import secrets
from fastapi import APIRouter, HTTPException, Depends, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr

from db.database import get_db
from models.user import User
from core.auth import hash_password, verify_password, create_access_token, get_current_user
from core.oauth import oauth
from utils.helpers import generate_id

router = APIRouter(prefix="/auth", tags=["Auth"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI",
    "https://solanka-production.up.railway.app/api/v1/auth/google/callback"
)


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
    phone: str | None = None


def _user_response(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "phone": user.phone,
        "solana_wallet": user.solana_wallet,
        "api_key": user.api_key,
        "auth_provider": user.auth_provider,
        "google_picture": user.google_picture,
        "kyc_status": user.kyc_status,
        "terms_accepted": bool(user.terms_accepted_at),
        "is_onboarded": user.is_onboarded,
        "is_active": user.is_active,
        "created_at": user.created_at,
    }


# ── Email Register ────────────────────────────────────────
@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Create a new Solanka account with email/password."""
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
        auth_provider="email",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id, user.email)
    return {
        "token": token,
        "token_type": "bearer",
        "new_user": True,
        "needs_onboarding": not user.is_onboarded,
        "user": _user_response(user),
    }


# ── Email Login ───────────────────────────────────────────
@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate with email and password."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = create_access_token(user.id, user.email)
    return {
        "token": token,
        "token_type": "bearer",
        "new_user": False,
        "needs_onboarding": not user.is_onboarded,
        "user": _user_response(user),
    }


# ── Google OAuth ──────────────────────────────────────────
@router.get("/google")
async def google_login(request: Request):
    """Initiate Google OAuth flow — redirect browser here directly."""
    if not os.getenv("GOOGLE_CLIENT_ID"):
        raise HTTPException(
            status_code=503,
            detail="Google OAuth is not configured on this server. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        )
    return await oauth.google.authorize_redirect(request, GOOGLE_REDIRECT_URI)


@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Google OAuth callback, create/link user, redirect to frontend."""
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        return RedirectResponse(f"{FRONTEND_URL}/auth/login?error=google_failed")

    userinfo = token.get("userinfo") or {}
    google_id = userinfo.get("sub")
    email     = userinfo.get("email", "")
    name      = userinfo.get("name", "")
    picture   = userinfo.get("picture", "")

    if not google_id or not email:
        return RedirectResponse(f"{FRONTEND_URL}/auth/login?error=google_no_email")

    # Find existing user by Google ID or email
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    new_user = False
    if not user:
        # Check if email already registered (email user connecting Google)
        result2 = await db.execute(select(User).where(User.email == email))
        user = result2.scalar_one_or_none()

        if user:
            # Link Google to existing email account
            user.google_id      = google_id
            user.google_picture = picture
            if user.auth_provider == "email":
                user.auth_provider = "google"
        else:
            # Brand new user via Google
            new_user = True
            user = User(
                id=generate_id(),
                email=email,
                display_name=name,
                auth_provider="google",
                google_id=google_id,
                google_picture=picture,
            )
            db.add(user)

    await db.commit()
    await db.refresh(user)

    jwt = create_access_token(user.id, user.email)
    needs_onboarding = not user.is_onboarded

    redirect_url = (
        f"{FRONTEND_URL}/auth/callback"
        f"?token={jwt}"
        f"&new_user={'true' if new_user else 'false'}"
        f"&needs_onboarding={'true' if needs_onboarding else 'false'}"
    )
    return RedirectResponse(redirect_url)


# ── Profile ───────────────────────────────────────────────
@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return _user_response(current_user)


@router.patch("/me")
async def update_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.display_name is not None:
        current_user.display_name = body.display_name
    if body.solana_wallet is not None:
        current_user.solana_wallet = body.solana_wallet
    if body.phone is not None:
        current_user.phone = body.phone
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return _user_response(current_user)


@router.post("/rotate-key")
async def rotate_api_key(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.api_key = f"sk_{secrets.token_urlsafe(32)}"
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return {"message": "API key rotated successfully", "api_key": current_user.api_key}
