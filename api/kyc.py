"""
KYC verification via Dojah (Nigerian-focused: BVN + NIN).

Dojah docs: https://docs.dojah.io
Sign up at https://dojah.io for a free sandbox account.

Required env vars:
  DOJAH_APP_ID      — your Dojah App ID
  DOJAH_SECRET_KEY  — your Dojah secret key
"""
import os
import httpx
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from models.user import User
from core.auth import get_current_user

router = APIRouter(prefix="/kyc", tags=["KYC"])

DOJAH_BASE     = "https://api.dojah.io"
DOJAH_APP_ID   = os.getenv("DOJAH_APP_ID", "")
DOJAH_SECRET   = os.getenv("DOJAH_SECRET_KEY", "")
SANDBOX_MODE   = os.getenv("KYC_SANDBOX", "true").lower() == "true"

TERMS_VERSION  = "v1.0"


# ── Schemas ───────────────────────────────────────────────
class KYCRequest(BaseModel):
    kyc_type: str       # "bvn" | "nin"
    value: str          # the BVN or NIN number


class AcceptTermsRequest(BaseModel):
    accepted: bool


# ── Helpers ───────────────────────────────────────────────
def _dojah_headers() -> dict:
    return {
        "AppId": DOJAH_APP_ID,
        "Authorization": DOJAH_SECRET,
        "Content-Type": "application/json",
    }


async def _verify_bvn(bvn: str) -> dict:
    """Call Dojah BVN basic lookup."""
    url = f"{DOJAH_BASE}/api/v1/kyc/bvn/basic"
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(url, params={"bvn": bvn}, headers=_dojah_headers())
    if r.status_code == 200:
        data = r.json()
        entity = data.get("entity") or {}
        return {
            "verified": True,
            "first_name": entity.get("first_name", ""),
            "last_name": entity.get("last_name", ""),
            "phone": entity.get("phone_number1", ""),
            "reference": data.get("requestId") or bvn[:4] + "****",
        }
    raise HTTPException(
        status_code=400,
        detail=f"BVN verification failed: {r.json().get('error', 'Could not verify BVN')}"
    )


async def _verify_nin(nin: str) -> dict:
    """Call Dojah NIN lookup."""
    url = f"{DOJAH_BASE}/api/v1/kyc/nin"
    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(url, params={"nin": nin}, headers=_dojah_headers())
    if r.status_code == 200:
        data = r.json()
        entity = data.get("entity") or {}
        return {
            "verified": True,
            "first_name": entity.get("first_name", ""),
            "last_name": entity.get("last_name", ""),
            "phone": entity.get("phone", ""),
            "reference": data.get("requestId") or nin[:4] + "****",
        }
    raise HTTPException(
        status_code=400,
        detail=f"NIN verification failed: {r.json().get('error', 'Could not verify NIN')}"
    )


async def _sandbox_verify(kyc_type: str, value: str) -> dict:
    """
    Sandbox stub — returns success for any well-formatted number.
    Used when DOJAH_APP_ID is not set or KYC_SANDBOX=true.
    """
    if kyc_type == "bvn" and len(value) != 11:
        raise HTTPException(status_code=400, detail="BVN must be exactly 11 digits")
    if kyc_type == "nin" and len(value) != 11:
        raise HTTPException(status_code=400, detail="NIN must be exactly 11 digits")
    if not value.isdigit():
        raise HTTPException(status_code=400, detail=f"{kyc_type.upper()} must contain only digits")

    return {
        "verified": True,
        "first_name": "Sandbox",
        "last_name": "Verified",
        "phone": "",
        "reference": f"SANDBOX-{value[-4:]}",
    }


# ── Routes ────────────────────────────────────────────────
@router.post("/verify")
async def submit_kyc(
    body: KYCRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit BVN or NIN for verification.
    Uses Dojah in production, sandbox stub when DOJAH_APP_ID is not set.
    """
    if body.kyc_type not in ("bvn", "nin"):
        raise HTTPException(status_code=422, detail="kyc_type must be 'bvn' or 'nin'")

    if current_user.kyc_status == "verified":
        return {"status": "already_verified", "message": "Your identity is already verified"}

    # Use sandbox if no Dojah credentials configured
    use_sandbox = SANDBOX_MODE or not DOJAH_APP_ID

    if use_sandbox:
        result = await _sandbox_verify(body.kyc_type, body.value)
    elif body.kyc_type == "bvn":
        result = await _verify_bvn(body.value)
    else:
        result = await _verify_nin(body.value)

    # Persist — never store full BVN/NIN, only last 4
    current_user.kyc_status       = "verified"
    current_user.kyc_type         = body.kyc_type
    current_user.kyc_value        = body.value[-4:]    # last 4 digits only
    current_user.kyc_provider_ref = result["reference"]
    current_user.kyc_verified_at  = datetime.now(timezone.utc)

    db.add(current_user)
    await db.commit()

    return {
        "status": "verified",
        "kyc_type": body.kyc_type,
        "reference": result["reference"],
        "sandbox": use_sandbox,
    }


@router.get("/status")
async def kyc_status(current_user: User = Depends(get_current_user)):
    """Return current KYC and onboarding status."""
    return {
        "kyc_status": current_user.kyc_status,
        "kyc_type": current_user.kyc_type,
        "kyc_value_hint": f"****{current_user.kyc_value}" if current_user.kyc_value else None,
        "kyc_verified_at": current_user.kyc_verified_at,
        "terms_accepted": bool(current_user.terms_accepted_at),
        "terms_accepted_at": current_user.terms_accepted_at,
        "terms_version": current_user.terms_version,
        "is_onboarded": current_user.is_onboarded,
    }


@router.post("/accept-terms")
async def accept_terms(
    body: AcceptTermsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept Terms & Conditions. Marks onboarding complete if KYC also done."""
    if not body.accepted:
        raise HTTPException(status_code=400, detail="You must accept the Terms & Conditions to continue")

    current_user.terms_accepted_at = datetime.now(timezone.utc)
    current_user.terms_version     = TERMS_VERSION

    # Mark onboarded if KYC is verified
    if current_user.kyc_status == "verified":
        current_user.is_onboarded = True

    db.add(current_user)
    await db.commit()

    return {
        "accepted": True,
        "terms_version": TERMS_VERSION,
        "is_onboarded": current_user.is_onboarded,
        "message": "Terms accepted. You can now use Solanka." if current_user.is_onboarded else (
            "Terms accepted. Please complete KYC verification to continue."
        ),
    }


@router.post("/complete-onboarding")
async def complete_onboarding(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Finalize onboarding if all requirements met."""
    errors = []
    if current_user.kyc_status != "verified":
        errors.append("KYC verification is required")
    if not current_user.terms_accepted_at:
        errors.append("Terms & Conditions must be accepted")
    if errors:
        raise HTTPException(status_code=400, detail="; ".join(errors))

    current_user.is_onboarded = True
    db.add(current_user)
    await db.commit()
    return {"is_onboarded": True}
