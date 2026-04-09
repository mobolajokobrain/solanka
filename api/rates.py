from fastapi import APIRouter
from core.conversion import (
    get_usdt_to_ngn,
    get_sol_to_usdt,
    convert_usdc_to_ngn,
    convert_sol_to_ngn
)

router = APIRouter(prefix="/rates", tags=["Exchange Rates"])

@router.get("/ngn")
async def get_ngn_rate():
    """Get live USDT/NGN exchange rate from Binance."""
    rate = await get_usdt_to_ngn()
    return {
        "pair": "USDT/NGN",
        "rate": rate,
        "source": "Binance"
    }

@router.get("/sol")
async def get_sol_rate():
    """Get live SOL/USDT rate from Binance."""
    rate = await get_sol_to_usdt()
    return {
        "pair": "SOL/USDT",
        "rate": rate,
        "source": "Binance"
    }

@router.get("/convert/usdc/{amount}")
async def convert_usdc(amount: float):
    """Convert a USDC amount to NGN at live rates."""
    return await convert_usdc_to_ngn(amount)

@router.get("/convert/sol/{amount}")
async def convert_sol(amount: float):
    """Convert a SOL amount to NGN at live rates."""
    return await convert_sol_to_ngn(amount)
