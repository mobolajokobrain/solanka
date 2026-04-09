import asyncio
import os
import base58 as _base58

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from core.solana import get_wallet_balance, get_usdc_balance, get_recent_transactions
from core.conversion import convert_sol_to_ngn, convert_usdc_to_ngn
from core.auth import get_current_user
from db.database import get_db
from models.user import User

router = APIRouter(prefix="/wallet", tags=["Wallet"])


# ── Wallet Generation ─────────────────────────────────────
class SaveWalletRequest(BaseModel):
    address: str


@router.post("/generate")
async def generate_wallet(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a fresh Solana keypair for the authenticated user.
    Returns the address (stored) and private key (shown ONCE — never stored).
    The user must import the private key into Phantom or another wallet.
    """
    from solders.keypair import Keypair  # local import — heavy module

    keypair     = Keypair()
    address     = str(keypair.pubkey())

    # 64-byte keypair (32-byte seed + 32-byte public key) in base58 — Phantom import format
    private_key = _base58.b58encode(bytes(keypair)).decode()

    # Persist only the public address
    current_user.solana_wallet = address
    db.add(current_user)
    await db.commit()

    return {
        "address":     address,
        "private_key": private_key,
        "format":      "base58_64byte",
        "import_tip":  "Open Phantom → hamburger menu → Import Private Key → paste the key above",
        "warning":      "This is the ONLY time your private key will be shown. Save it now.",
        "network":     os.getenv("SOLANA_NETWORK", "devnet"),
    }


@router.post("/save-address")
async def save_wallet_address(
    body: SaveWalletRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save an existing wallet address to the user's profile."""
    current_user.solana_wallet = body.address
    db.add(current_user)
    await db.commit()
    return {"address": body.address, "saved": True}


# ── Balance & Transactions ────────────────────────────────
@router.get("/{wallet_address}/balance")
async def wallet_balance(wallet_address: str):
    """Get SOL + USDC balance for any wallet with live NGN equivalents."""
    sol_data, usdc_data = await _fetch_balances(wallet_address)

    if "error" in sol_data:
        raise HTTPException(status_code=400, detail=sol_data["error"])

    ngn_sol  = await convert_sol_to_ngn(sol_data["balance_sol"])
    ngn_usdc = await convert_usdc_to_ngn(usdc_data.get("balance_usdc", 0.0))

    return {
        "wallet":  wallet_address,
        "network": sol_data["network"],
        "sol": {
            "balance":        sol_data["balance_sol"],
            "lamports":       sol_data["balance_lamports"],
            "ngn_equivalent": ngn_sol["ngn_amount"],
        },
        "usdc": {
            "balance":            usdc_data.get("balance_usdc", 0.0),
            "mint":               usdc_data.get("mint"),
            "has_token_account":  usdc_data.get("has_token_account", False),
            "ngn_equivalent":     ngn_usdc["ngn_amount"],
        },
        "rates": {
            "usdt_ngn": ngn_sol["usdt_ngn_rate"],
            "sol_usdt": ngn_sol["sol_usdt_rate"],
        },
    }


@router.get("/{wallet_address}/usdc")
async def wallet_usdc_balance(wallet_address: str):
    """Get USDC token balance only, with NGN equivalent."""
    usdc_data = await get_usdc_balance(wallet_address)
    if "error" in usdc_data:
        raise HTTPException(status_code=400, detail=usdc_data["error"])
    ngn_data = await convert_usdc_to_ngn(usdc_data["balance_usdc"])
    return {**usdc_data, "ngn_equivalent": ngn_data["ngn_amount"], "rate": ngn_data["rate"]}


@router.get("/{wallet_address}/transactions")
async def wallet_transactions(wallet_address: str, limit: int = 10):
    """Get recent transactions for a wallet."""
    if limit > 50:
        limit = 50
    txs = await get_recent_transactions(wallet_address, limit)
    return {"wallet": wallet_address, "count": len(txs), "transactions": txs}


async def _fetch_balances(wallet_address: str):
    return await asyncio.gather(
        get_wallet_balance(wallet_address),
        get_usdc_balance(wallet_address),
    )
