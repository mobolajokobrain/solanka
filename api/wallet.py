from fastapi import APIRouter, HTTPException
from core.solana import get_wallet_balance, get_recent_transactions
from core.conversion import convert_sol_to_ngn

router = APIRouter(prefix="/wallet", tags=["Wallet"])

@router.get("/{wallet_address}/balance")
async def wallet_balance(wallet_address: str):
    """Get SOL balance of any wallet with NGN equivalent."""
    balance = await get_wallet_balance(wallet_address)
    if "error" in balance:
        raise HTTPException(status_code=400, detail=balance["error"])
    
    # Add NGN conversion
    ngn_data = await convert_sol_to_ngn(balance["balance_sol"])
    balance["ngn_equivalent"] = ngn_data["ngn_amount"]
    balance["sol_usdt_rate"] = ngn_data["sol_usdt_rate"]
    balance["usdt_ngn_rate"] = ngn_data["usdt_ngn_rate"]
    return balance

@router.get("/{wallet_address}/transactions")
async def wallet_transactions(wallet_address: str, limit: int = 10):
    """Get recent transactions for a wallet."""
    if limit > 50:
        limit = 50
    txs = await get_recent_transactions(wallet_address, limit)
    return {
        "wallet": wallet_address,
        "count": len(txs),
        "transactions": txs
    }
