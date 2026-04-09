from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from db.database import get_db
from models.payment_link import PaymentLink
from models.transaction import Transaction, TransactionStatus
from core.conversion import convert_usdc_to_ngn
from core.solana import verify_transaction
from utils.helpers import generate_payment_slug, generate_id

router = APIRouter(prefix="/payments", tags=["Payments"])

# ── Schemas ──────────────────────────────────────────────
class CreatePaymentLinkRequest(BaseModel):
    merchant_wallet: str
    amount_usdc: Optional[float] = None   # None = open / any amount
    description: Optional[str] = None
    label: Optional[str] = None

class VerifyTransactionRequest(BaseModel):
    signature: str
    payment_link_id: str
    sender_wallet: Optional[str] = None

# ── Routes ───────────────────────────────────────────────
@router.post("/link")
async def create_payment_link(
    body: CreatePaymentLinkRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a new Solanka payment link."""
    slug = generate_payment_slug()
    link_id = generate_id()

    link = PaymentLink(
        id=link_id,
        slug=slug,
        merchant_wallet=body.merchant_wallet,
        amount_usdc=body.amount_usdc,
        description=body.description,
        label=body.label or "Solanka Payment"
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)

    # Build NGN display if amount is fixed
    ngn_data = None
    if body.amount_usdc:
        ngn_data = await convert_usdc_to_ngn(body.amount_usdc)

    return {
        "id": link.id,
        "slug": link.slug,
        "payment_url": f"/pay/{slug}",
        "merchant_wallet": link.merchant_wallet,
        "amount_usdc": link.amount_usdc,
        "ngn_equivalent": ngn_data,
        "description": link.description,
        "label": link.label,
        "created_at": link.created_at
    }

@router.get("/link/{slug}")
async def get_payment_link(slug: str, db: AsyncSession = Depends(get_db)):
    """Fetch a payment link by slug — used by the checkout page."""
    result = await db.execute(select(PaymentLink).where(PaymentLink.slug == slug))
    link = result.scalar_one_or_none()

    if not link:
        raise HTTPException(status_code=404, detail="Payment link not found")
    if not link.is_active:
        raise HTTPException(status_code=410, detail="This payment link is no longer active")

    ngn_data = None
    if link.amount_usdc:
        ngn_data = await convert_usdc_to_ngn(link.amount_usdc)

    return {
        "id": link.id,
        "slug": link.slug,
        "merchant_wallet": link.merchant_wallet,
        "amount_usdc": link.amount_usdc,
        "ngn_equivalent": ngn_data,
        "description": link.description,
        "label": link.label,
        "is_active": link.is_active
    }

@router.post("/verify")
async def verify_payment(
    body: VerifyTransactionRequest,
    db: AsyncSession = Depends(get_db)
):
    """Verify a Solana transaction and record it."""
    # Check payment link exists
    result = await db.execute(
        select(PaymentLink).where(PaymentLink.id == body.payment_link_id)
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Payment link not found")

    # Verify on-chain
    verification = await verify_transaction(
        signature=body.signature,
        expected_receiver=link.merchant_wallet
    )

    if not verification["verified"]:
        raise HTTPException(status_code=400, detail=verification.get("reason", "Verification failed"))

    # Record transaction
    tx_id = generate_id()
    tx = Transaction(
        id=tx_id,
        payment_link_id=body.payment_link_id,
        signature=body.signature,
        sender_wallet=body.sender_wallet,
        receiver_wallet=link.merchant_wallet,
        amount_usdc=link.amount_usdc,
        status=TransactionStatus.CONFIRMED
    )
    db.add(tx)

    # Increment usage count
    link.times_used = (link.times_used or 0) + 1
    await db.commit()

    return {
        "success": True,
        "transaction_id": tx_id,
        "signature": body.signature,
        "status": "confirmed",
        "slot": verification.get("slot"),
        "block_time": verification.get("block_time")
    }

@router.get("/transactions")
async def list_transactions(
    wallet: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all recorded transactions, optionally filtered by wallet."""
    query = select(Transaction).order_by(Transaction.created_at.desc())
    if wallet:
        query = query.where(Transaction.receiver_wallet == wallet)
    result = await db.execute(query)
    txs = result.scalars().all()
    return {
        "count": len(txs),
        "transactions": [
            {
                "id": tx.id,
                "signature": tx.signature,
                "amount_usdc": tx.amount_usdc,
                "amount_ngn": tx.amount_ngn,
                "status": tx.status,
                "created_at": tx.created_at
            }
            for tx in txs
        ]
    }
