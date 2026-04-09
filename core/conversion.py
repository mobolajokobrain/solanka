import httpx
import os
from dotenv import load_dotenv

load_dotenv()

BINANCE_API_URL = os.getenv("BINANCE_API_URL", "https://api.binance.com/api/v3/ticker/price")

async def get_usdt_to_ngn() -> float:
    """Fetch live USDT/NGN rate from Binance — no API key needed."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{BINANCE_API_URL}?symbol=USDTNGN")
            response.raise_for_status()
            return float(response.json()["price"])
    except Exception:
        # Fallback rate if Binance is unreachable
        return 1600.0

async def get_sol_to_usdt() -> float:
    """Fetch live SOL/USDT rate from Binance."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{BINANCE_API_URL}?symbol=SOLUSDT")
            response.raise_for_status()
            return float(response.json()["price"])
    except Exception:
        return 150.0

async def convert_usdc_to_ngn(usdc_amount: float) -> dict:
    """Convert a USDC amount to NGN with live rate."""
    rate = await get_usdt_to_ngn()
    ngn_amount = usdc_amount * rate
    return {
        "usdc_amount": usdc_amount,
        "ngn_amount": round(ngn_amount, 2),
        "rate": rate,
        "pair": "USDT/NGN"
    }

async def convert_sol_to_ngn(sol_amount: float) -> dict:
    """Convert a SOL amount to NGN with live rates."""
    sol_usdt = await get_sol_to_usdt()
    usdt_ngn = await get_usdt_to_ngn()
    ngn_amount = sol_amount * sol_usdt * usdt_ngn
    return {
        "sol_amount": sol_amount,
        "usdt_value": round(sol_amount * sol_usdt, 4),
        "ngn_amount": round(ngn_amount, 2),
        "sol_usdt_rate": sol_usdt,
        "usdt_ngn_rate": usdt_ngn
    }
