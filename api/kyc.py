"""
KYC verification:
  Tier 1 — Dojah BVN/NIN (Nigerian database lookup, instant)
  Tier 2 — Onfido document + selfie liveness (unlimited volume)

Dojah:  https://dojah.io        — DOJAH_APP_ID, DOJAH_SECRET_KEY
Onfido: https://onfido.com      — ONFIDO_API_TOKEN, ONFIDO_REGION (EU|US|CA)
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
from core.email import send_kyc_verified

router = APIRouter(prefix="/kyc", tags=["KYC"])

# Onfido
ONFIDO_TOKEN  = os.getenv("ONFIDO_API_TOKEN", "")
ONFIDO_REGION = os.getenv("ONFIDO_REGION", "EU").upper()
_ONFIDO_BASES = {"EU": "https://api.eu.onfido.com/v3.6", "US": "https://api.us.onfido.com/v3.6", "CA": "https://api.ca.onfido.com/v3.6"}
ONFIDO_BASE   = _ONFIDO_BASES.get(ONFIDO_REGION, _ONFIDO_BASES["EU"])

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

    # Fire welcome / KYC confirmed email
    import asyncio
    asyncio.create_task(
        send_kyc_verified(current_user.email, current_user.display_name, body.kyc_type)
    )

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


# ── Onfido Tier-2 KYC ─────────────────────────────────────
@router.post("/onfido/start")
async def start_onfido_kyc(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create an Onfido applicant + SDK token for the authenticated user.
    The frontend uses the SDK token to launch the Onfido Web SDK.
    Results arrive via the /webhooks/onfido endpoint.
    """
    if not ONFIDO_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="Onfido is not configured. Set ONFIDO_API_TOKEN in environment."
        )

    if current_user.kyc_status in ("verified_tier2",):
        return {"status": "already_verified_tier2"}

    headers = {
        "Authorization": f"Token token={ONFIDO_TOKEN}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        # Step 1 — create applicant
        applicant_r = await client.post(
            f"{ONFIDO_BASE}/applicants",
            headers=headers,
            json={
                "first_name": current_user.display_name.split()[0],
                "last_name":  " ".join(current_user.display_name.split()[1:]) or current_user.display_name,
                "email":      current_user.email,
            },
        )
        if applicant_r.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail=f"Onfido applicant error: {applicant_r.text}")

        applicant_id = applicant_r.json()["id"]

        # Step 2 — generate SDK token
        sdk_r = await client.post(
            f"{ONFIDO_BASE}/sdk_token",
            headers=headers,
            json={
                "applicant_id":   applicant_id,
                "referrer":       "*",
            },
        )
        if sdk_r.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail=f"Onfido SDK token error: {sdk_r.text}")

    sdk_token = sdk_r.json()["token"]

    # Persist applicant ID so the webhook can match back to this user
    current_user.kyc_provider_ref = applicant_id
    db.add(current_user)
    await db.commit()

    return {
        "applicant_id": applicant_id,
        "sdk_token":    sdk_token,
        "status":       "pending",
        "message":      "Use the sdk_token to initialise the Onfido Web SDK in your frontend.",
    }


@router.get("/onfido/status")
async def onfido_check_status(current_user: User = Depends(get_current_user)):
    """Poll Onfido check status (fallback — prefer the webhook)."""
    if not ONFIDO_TOKEN or not current_user.kyc_provider_ref:
        return {"status": current_user.kyc_status}

    headers = {"Authorization": f"Token token={ONFIDO_TOKEN}"}
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            f"{ONFIDO_BASE}/checks",
            headers=headers,
            params={"applicant_id": current_user.kyc_provider_ref},
        )

    if r.status_code != 200:
        return {"status": current_user.kyc_status}

    checks = r.json().get("checks", [])
    if not checks:
        return {"status": "pending"}

    latest = checks[0]
    return {
        "status":   latest.get("status"),
        "result":   latest.get("result"),
        "check_id": latest.get("id"),
    }
