import io
import os
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from db.database import get_db
from models.payment_link import PaymentLink
from models.transaction import Transaction, TransactionStatus
from models.user import User
from core.conversion import convert_usdc_to_ngn
from core.solana import verify_transaction, USDC_MINT_ADDRESS
from core.auth import get_current_user, get_current_user_optional
from utils.helpers import generate_payment_slug, generate_id

router = APIRouter(prefix="/payments", tags=["Payments"])

SOLANA_PAY_BASE = "solana:"


# ── Schemas ──────────────────────────────────────────────
class CreatePaymentLinkRequest(BaseModel):
    merchant_wallet: str
    amount_usdc: Optional[float] = None
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
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """Create a new Solanka payment link. Auth optional — links are tied to user when logged in."""
    slug = generate_payment_slug()
    link_id = generate_id()

    # If authenticated and no wallet provided, fall back to user's saved wallet
    merchant_wallet = body.merchant_wallet
    if not merchant_wallet and current_user and current_user.solana_wallet:
        merchant_wallet = current_user.solana_wallet
    if not merchant_wallet:
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="merchant_wallet is required")

    link = PaymentLink(
        id=link_id,
        slug=slug,
        user_id=current_user.id if current_user else None,
        merchant_wallet=merchant_wallet,
        amount_usdc=body.amount_usdc,
        description=body.description,
        label=body.label or "Solanka Payment"
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)

    ngn_data = None
    if body.amount_usdc:
        ngn_data = await convert_usdc_to_ngn(body.amount_usdc)

    base_url = os.getenv("APP_BASE_URL", "https://solanka-production.up.railway.app")

    return {
        "id": link.id,
        "slug": link.slug,
        "payment_url": f"{base_url}/pay/{slug}",
        "qr_url": f"{base_url}/api/v1/payments/link/{slug}/qr",
        "solana_pay_url": _build_solana_pay_url(link),
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
    link = await _get_link_by_slug(slug, db)

    ngn_data = None
    if link.amount_usdc:
        ngn_data = await convert_usdc_to_ngn(link.amount_usdc)

    base_url = os.getenv("APP_BASE_URL", "https://solanka-production.up.railway.app")

    return {
        "id": link.id,
        "slug": link.slug,
        "payment_url": f"{base_url}/pay/{slug}",
        "qr_url": f"{base_url}/api/v1/payments/link/{slug}/qr",
        "solana_pay_url": _build_solana_pay_url(link),
        "merchant_wallet": link.merchant_wallet,
        "amount_usdc": link.amount_usdc,
        "ngn_equivalent": ngn_data,
        "description": link.description,
        "label": link.label,
        "is_active": link.is_active
    }


@router.get("/link/{slug}/solana-pay")
async def get_solana_pay_url(slug: str, db: AsyncSession = Depends(get_db)):
    """Return the Solana Pay URL for a payment link."""
    link = await _get_link_by_slug(slug, db)
    return {
        "slug": slug,
        "solana_pay_url": _build_solana_pay_url(link),
        "merchant_wallet": link.merchant_wallet,
        "amount_usdc": link.amount_usdc,
        "label": link.label,
    }


@router.get("/link/{slug}/qr")
async def get_payment_qr(slug: str, db: AsyncSession = Depends(get_db)):
    """Generate and return a Solana Pay QR code PNG for this payment link."""
    import qrcode

    link = await _get_link_by_slug(slug, db)
    solana_pay_url = _build_solana_pay_url(link)

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(solana_pay_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return Response(
        content=buf.read(),
        media_type="image/png",
        headers={"Content-Disposition": f'inline; filename="solanka-{slug}.png"'}
    )


@router.post("/verify")
async def verify_payment(
    body: VerifyTransactionRequest,
    db: AsyncSession = Depends(get_db)
):
    """Verify a Solana USDC transaction and record it."""
    result = await db.execute(
        select(PaymentLink).where(PaymentLink.id == body.payment_link_id)
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Payment link not found")

    # Full on-chain verification — receiver + amount
    verification = await verify_transaction(
        signature=body.signature,
        expected_receiver=link.merchant_wallet,
        expected_amount_usdc=link.amount_usdc
    )

    if not verification["verified"]:
        raise HTTPException(
            status_code=400,
            detail=verification.get("reason", "Verification failed")
        )

    # Persist transaction
    tx = Transaction(
        id=generate_id(),
        payment_link_id=body.payment_link_id,
        signature=body.signature,
        sender_wallet=body.sender_wallet,
        receiver_wallet=link.merchant_wallet,
        amount_usdc=verification.get("usdc_received") or link.amount_usdc,
        status=TransactionStatus.CONFIRMED
    )
    db.add(tx)
    link.times_used = (link.times_used or 0) + 1
    await db.commit()

    return {
        "success": True,
        "transaction_id": tx.id,
        "signature": body.signature,
        "status": "confirmed",
        "usdc_received": verification.get("usdc_received"),
        "receiver": verification.get("receiver"),
        "slot": verification.get("slot"),
        "block_time": verification.get("block_time")
    }


@router.get("/links")
async def list_my_links(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all payment links created by the authenticated user."""
    result = await db.execute(
        select(PaymentLink)
        .where(PaymentLink.user_id == current_user.id)
        .order_by(PaymentLink.created_at.desc())
    )
    links = result.scalars().all()
    base_url = os.getenv("APP_BASE_URL", "https://solanka-production.up.railway.app")
    return {
        "count": len(links),
        "links": [
            {
                "id": lnk.id,
                "slug": lnk.slug,
                "payment_url": f"{base_url}/pay/{lnk.slug}",
                "qr_url": f"{base_url}/api/v1/payments/link/{lnk.slug}/qr",
                "merchant_wallet": lnk.merchant_wallet,
                "amount_usdc": lnk.amount_usdc,
                "description": lnk.description,
                "label": lnk.label,
                "is_active": lnk.is_active,
                "times_used": lnk.times_used,
                "created_at": lnk.created_at,
            }
            for lnk in links
        ],
    }


@router.get("/transactions")
async def list_transactions(
    wallet: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """List recorded transactions. Authenticated users see only their own."""
    query = select(Transaction).order_by(Transaction.created_at.desc())

    if current_user:
        # Join to payment links owned by this user
        query = (
            select(Transaction)
            .join(PaymentLink, Transaction.payment_link_id == PaymentLink.id)
            .where(PaymentLink.user_id == current_user.id)
            .order_by(Transaction.created_at.desc())
        )
    elif wallet:
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


# ── Helpers ──────────────────────────────────────────────
def _build_solana_pay_url(link: PaymentLink) -> str:
    """Build a Solana Pay transfer URL for a payment link."""
    params = [f"spl-token={USDC_MINT_ADDRESS}"]
    if link.amount_usdc:
        params.append(f"amount={link.amount_usdc}")
    if link.label:
        params.append(f"label={link.label.replace(' ', '+')}")
    if link.description:
        params.append(f"message={link.description.replace(' ', '+')}")
    params.append(f"reference={link.id}")
    return f"{SOLANA_PAY_BASE}{link.merchant_wallet}?{'&'.join(params)}"


async def _get_link_by_slug(slug: str, db: AsyncSession) -> PaymentLink:
    result = await db.execute(select(PaymentLink).where(PaymentLink.slug == slug))
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Payment link not found")
    if not link.is_active:
        raise HTTPException(status_code=410, detail="This payment link is no longer active")
    return link
