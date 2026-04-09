import os
import httpx
from dotenv import load_dotenv

load_dotenv()

HELIUS_API_KEY = os.getenv("HELIUS_API_KEY", "")
SOLANA_NETWORK = os.getenv("SOLANA_NETWORK", "devnet")
SOLANA_RPC_URL = os.getenv(
    "SOLANA_RPC_URL",
    f"https://devnet.helius-rpc.com/?api-key={HELIUS_API_KEY}"
)

async def get_wallet_balance(wallet_address: str) -> dict:
    """Get SOL balance of a wallet via Helius RPC."""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getBalance",
        "params": [wallet_address]
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(SOLANA_RPC_URL, json=payload)
            response.raise_for_status()
            data = response.json()
            lamports = data.get("result", {}).get("value", 0)
            sol_balance = lamports / 1_000_000_000  # Convert lamports to SOL
            return {
                "wallet": wallet_address,
                "balance_sol": round(sol_balance, 6),
                "balance_lamports": lamports,
                "network": SOLANA_NETWORK
            }
    except Exception as e:
        return {"wallet": wallet_address, "error": str(e), "network": SOLANA_NETWORK}

async def get_transaction(signature: str) -> dict:
    """Fetch a Solana transaction by signature."""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getTransaction",
        "params": [
            signature,
            {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 0}
        ]
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(SOLANA_RPC_URL, json=payload)
            response.raise_for_status()
            return response.json().get("result", {})
    except Exception as e:
        return {"error": str(e)}

async def verify_transaction(signature: str, expected_receiver: str, expected_amount_sol: float = None) -> dict:
    """Verify a Solana transaction was sent to the right wallet."""
    tx = await get_transaction(signature)
    if not tx or "error" in tx:
        return {"verified": False, "reason": "Transaction not found"}

    # Check transaction status
    if tx.get("meta", {}).get("err") is not None:
        return {"verified": False, "reason": "Transaction failed on-chain"}

    return {
        "verified": True,
        "signature": signature,
        "slot": tx.get("slot"),
        "block_time": tx.get("blockTime")
    }

async def get_recent_transactions(wallet_address: str, limit: int = 10) -> list:
    """Get recent transactions for a wallet."""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getSignaturesForAddress",
        "params": [wallet_address, {"limit": limit}]
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(SOLANA_RPC_URL, json=payload)
            response.raise_for_status()
            return response.json().get("result", [])
    except Exception as e:
        return []
