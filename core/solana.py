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

# USDC mint addresses
USDC_MINT = {
    "mainnet-beta": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "devnet":       "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
}
USDC_MINT_ADDRESS = USDC_MINT.get(SOLANA_NETWORK, USDC_MINT["devnet"])
USDC_DECIMALS = 6


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
            sol_balance = lamports / 1_000_000_000
            return {
                "wallet": wallet_address,
                "balance_sol": round(sol_balance, 6),
                "balance_lamports": lamports,
                "network": SOLANA_NETWORK
            }
    except Exception as e:
        return {"wallet": wallet_address, "error": str(e), "network": SOLANA_NETWORK}


async def get_usdc_balance(wallet_address: str) -> dict:
    """Get USDC SPL token balance for a wallet."""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getTokenAccountsByOwner",
        "params": [
            wallet_address,
            {"mint": USDC_MINT_ADDRESS},
            {"encoding": "jsonParsed"}
        ]
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(SOLANA_RPC_URL, json=payload)
            response.raise_for_status()
            accounts = response.json().get("result", {}).get("value", [])

        if not accounts:
            return {
                "wallet": wallet_address,
                "balance_usdc": 0.0,
                "mint": USDC_MINT_ADDRESS,
                "network": SOLANA_NETWORK,
                "has_token_account": False
            }

        # Sum across all USDC accounts (normally just one)
        total = sum(
            float(a["account"]["data"]["parsed"]["info"]["tokenAmount"]["uiAmount"] or 0)
            for a in accounts
        )
        return {
            "wallet": wallet_address,
            "balance_usdc": round(total, 6),
            "mint": USDC_MINT_ADDRESS,
            "network": SOLANA_NETWORK,
            "has_token_account": True
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


async def verify_transaction(
    signature: str,
    expected_receiver: str,
    expected_amount_usdc: float = None
) -> dict:
    """
    Verify a Solana transaction delivered USDC to the expected receiver.

    Checks:
    1. Transaction exists and did not fail on-chain.
    2. The expected_receiver's USDC balance increased (via postTokenBalances).
    3. If expected_amount_usdc is provided, the received amount matches within ±0.01 USDC.
    """
    tx = await get_transaction(signature)
    if not tx or "error" in tx:
        return {"verified": False, "reason": "Transaction not found or RPC error"}

    if tx.get("meta", {}).get("err") is not None:
        return {"verified": False, "reason": "Transaction failed on-chain"}

    # Build index maps for pre/post token balances
    pre_map = {
        b["accountIndex"]: float(b.get("uiTokenAmount", {}).get("uiAmount") or 0)
        for b in tx.get("meta", {}).get("preTokenBalances", [])
        if b.get("mint") == USDC_MINT_ADDRESS
    }
    post_list = [
        b for b in tx.get("meta", {}).get("postTokenBalances", [])
        if b.get("mint") == USDC_MINT_ADDRESS
    ]

    usdc_received = None
    for entry in post_list:
        owner = entry.get("owner", "")
        if owner != expected_receiver:
            continue
        idx = entry["accountIndex"]
        post_amount = float(entry.get("uiTokenAmount", {}).get("uiAmount") or 0)
        pre_amount = pre_map.get(idx, 0.0)
        delta = round(post_amount - pre_amount, 6)
        if delta > 0:
            usdc_received = delta
            break

    if usdc_received is None:
        return {
            "verified": False,
            "reason": f"No USDC received by {expected_receiver} in this transaction"
        }

    if expected_amount_usdc is not None:
        if abs(usdc_received - expected_amount_usdc) > 0.01:
            return {
                "verified": False,
                "reason": (
                    f"Amount mismatch: expected {expected_amount_usdc} USDC, "
                    f"received {usdc_received} USDC"
                )
            }

    return {
        "verified": True,
        "signature": signature,
        "receiver": expected_receiver,
        "usdc_received": usdc_received,
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
    except Exception:
        return []
