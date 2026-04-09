from fastapi import APIRouter, HTTPException
from core.solana import get_wallet_balance, get_usdc_balance, get_recent_transactions
from core.conversion import convert_sol_to_ngn, convert_usdc_to_ngn

router = APIRouter(prefix="/wallet", tags=["Wallet"])


@router.get("/{wallet_address}/balance")
async def wallet_balance(wallet_address: str):
    """Get SOL + USDC balance for any wallet with live NGN equivalents."""
    sol_data, usdc_data = await _fetch_balances(wallet_address)

    if "error" in sol_data:
        raise HTTPException(status_code=400, detail=sol_data["error"])

    ngn_sol = await convert_sol_to_ngn(sol_data["balance_sol"])
    ngn_usdc = await convert_usdc_to_ngn(usdc_data.get("balance_usdc", 0.0))

    return {
        "wallet": wallet_address,
        "network": sol_data["network"],
        "sol": {
            "balance": sol_data["balance_sol"],
            "lamports": sol_data["balance_lamports"],
            "ngn_equivalent": ngn_sol["ngn_amount"],
        },
        "usdc": {
            "balance": usdc_data.get("balance_usdc", 0.0),
            "mint": usdc_data.get("mint"),
            "has_token_account": usdc_data.get("has_token_account", False),
            "ngn_equivalent": ngn_usdc["ngn_amount"],
        },
        "rates": {
            "usdt_ngn": ngn_sol["usdt_ngn_rate"],
            "sol_usdt": ngn_sol["sol_usdt_rate"],
        }
    }


@router.get("/{wallet_address}/usdc")
async def wallet_usdc_balance(wallet_address: str):
    """Get USDC token balance only, with NGN equivalent."""
    usdc_data = await get_usdc_balance(wallet_address)
    if "error" in usdc_data:
        raise HTTPException(status_code=400, detail=usdc_data["error"])

    ngn_data = await convert_usdc_to_ngn(usdc_data["balance_usdc"])
    return {
        **usdc_data,
        "ngn_equivalent": ngn_data["ngn_amount"],
        "rate": ngn_data["rate"],
    }


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


async def _fetch_balances(wallet_address: str):
    """Fetch SOL and USDC balances concurrently."""
    import asyncio
    return await asyncio.gather(
        get_wallet_balance(wallet_address),
        get_usdc_balance(wallet_address)
    )
