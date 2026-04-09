"""
Inbound webhooks:
  POST /webhooks/helius  — real-time Solana payment notifications from Helius
  POST /webhooks/onfido  — Onfido KYC check results
"""
import asyncio
import hashlib
import hmac
import json
import logging
import os

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.database import get_db
from models.payment_link import PaymentLink
from models.transaction import Transaction, TransactionStatus
from models.user import User
from core.conversion import convert_usdc_to_ngn
from core.email import send_payment_received, send_kyc_tier2_verified
from core.webhooks import fire_payment_confirmed
from utils.helpers import generate_id

log    = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

HELIUS_WEBHOOK_SECRET = os.getenv("HELIUS_WEBHOOK_SECRET", "")
ONFIDO_WEBHOOK_TOKEN  = os.getenv("ONFIDO_WEBHOOK_TOKEN", "")
USDC_MINT_ADDRESSES   = {
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",   # mainnet
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",   # devnet
}


# ── Helius webhook ────────────────────────────────────────
def _verify_helius(body: bytes, signature: str) -> bool:
    if not HELIUS_WEBHOOK_SECRET:
        return True   # dev mode — no secret set
    expected = hmac.new(HELIUS_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature.lstrip("sha256="))


async def _process_helius_tx(event: dict, db: AsyncSession):
    """
    Parse one Helius enhanced-transaction event and record USDC payments.
    Helius sends the full parsed transaction — no need to re-query Solana.
    """
    sig = event.get("signature", "")
    if not sig:
        return

    # Look for USDC token transfers in the event
    token_transfers = event.get("tokenTransfers") or []
    for transfer in token_transfers:
        if transfer.get("mint") not in USDC_MINT_ADDRESSES:
            continue

        receiver = transfer.get("toUserAccount", "")
        sender   = transfer.get("fromUserAccount", "")
        amount   = float(transfer.get("tokenAmount", 0))

        if amount <= 0 or not receiver:
            continue

        # Find matching payment link
        result = await db.execute(
            select(PaymentLink).where(PaymentLink.merchant_wallet == receiver)
        )
        link = result.scalars().first()
        if not link:
            continue

        # Deduplicate
        existing = await db.execute(
            select(Transaction).where(Transaction.signature == sig)
        )
        if existing.scalar_one_or_none():
            continue

        # Convert to NGN
        ngn_data = await convert_usdc_to_ngn(amount)

        # Record transaction
        tx = Transaction(
            id=generate_id(),
            payment_link_id=link.id,
            signature=sig,
            sender_wallet=sender,
            receiver_wallet=receiver,
            amount_usdc=amount,
            amount_ngn=ngn_data["ngn_amount"],
            status=TransactionStatus.CONFIRMED,
        )
        db.add(tx)
        link.times_used = (link.times_used or 0) + 1
        await db.commit()

        log.info(f"Helius webhook: {amount} USDC → {receiver} | sig {sig[:16]}…")

        # Fire notifications in background (don't block webhook response)
        if link.user_id:
            user_result = await db.execute(select(User).where(User.id == link.user_id))
            user = user_result.scalar_one_or_none()
            if user:
                asyncio.create_task(
                    send_payment_received(
                        merchant_email=user.email,
                        merchant_name=user.display_name,
                        amount_usdc=amount,
                        ngn_amount=ngn_data["ngn_amount"],
                        signature=sig,
                        payment_label=link.label or link.slug,
                    )
                )

        # Fire merchant webhook
        if link.callback_url:
            asyncio.create_task(
                fire_payment_confirmed(
                    callback_url=link.callback_url,
                    payment_link_id=link.id,
                    slug=link.slug,
                    signature=sig,
                    amount_usdc=amount,
                    receiver_wallet=receiver,
                    sender_wallet=sender,
                    webhook_secret=link.webhook_secret,
                )
            )


@router.post("/helius")
async def helius_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    x_helius_signature: str = Header(default=""),
):
    """
    Receive real-time transaction events from Helius.
    Register at: https://dev.helius.xyz/webhooks/app
    Webhook type: Enhanced Transactions
    Transaction types: TOKEN_TRANSFER
    """
    body = await request.body()

    if not _verify_helius(body, x_helius_signature):
        raise HTTPException(status_code=401, detail="Invalid Helius webhook signature")

    try:
        events = json.loads(body)
        if isinstance(events, dict):
            events = [events]
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    for event in events:
        try:
            await _process_helius_tx(event, db)
        except Exception as e:
            log.error(f"Error processing Helius event: {e}")

    return {"received": len(events)}


# ── Onfido webhook ────────────────────────────────────────
def _verify_onfido(body: bytes, signature: str) -> bool:
    if not ONFIDO_WEBHOOK_TOKEN:
        return True
    expected = hmac.new(ONFIDO_WEBHOOK_TOKEN.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)


@router.post("/onfido")
async def onfido_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_sha2_signature: str = Header(default=""),
):
    """
    Receive KYC check completion events from Onfido.
    Register at: https://dashboard.onfido.com/webhooks
    """
    body = await request.body()

    if not _verify_onfido(body, x_sha2_signature):
        raise HTTPException(status_code=401, detail="Invalid Onfido webhook signature")

    try:
        payload = json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    resource_type = payload.get("payload", {}).get("resource_type")
    action        = payload.get("payload", {}).get("action")
    obj           = payload.get("payload", {}).get("object", {})

    if resource_type != "check" or action not in ("check.completed", "check.withdrawn"):
        return {"received": True}

    applicant_id = obj.get("applicant_id")
    result       = obj.get("result")       # "clear" | "consider" | "unidentified"
    status       = obj.get("status")       # "complete" | "in_progress"

    if not applicant_id:
        return {"received": True}

    # Find user by Onfido applicant ID stored in kyc_provider_ref (tier-2)
    user_result = await db.execute(
        select(User).where(User.kyc_provider_ref == applicant_id)
    )
    user = user_result.scalar_one_or_none()
    if not user:
        log.warning(f"Onfido webhook: no user found for applicant {applicant_id}")
        return {"received": True}

    if result == "clear" and status == "complete":
        from datetime import datetime, timezone
        user.kyc_status     = "verified_tier2"
        user.kyc_verified_at = datetime.now(timezone.utc)
        user.is_onboarded   = True
        db.add(user)
        await db.commit()
        asyncio.create_task(send_kyc_tier2_verified(user.email, user.display_name))
        log.info(f"Onfido tier-2 verified: {user.email}")
    elif result in ("consider", "unidentified"):
        user.kyc_status = "failed_tier2"
        db.add(user)
        await db.commit()
        log.warning(f"Onfido check failed for {user.email}: {result}")

    return {"received": True}
