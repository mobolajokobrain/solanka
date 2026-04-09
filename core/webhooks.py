"""
Outbound webhook delivery — POST payment events to merchant callback URLs.
Retries 3 times with exponential backoff.
"""
import asyncio
import hashlib
import hmac
import json
import logging
import time

import httpx

log = logging.getLogger(__name__)

MAX_RETRIES = 3
TIMEOUT     = 10


def _sign_payload(payload: dict, secret: str) -> str:
    """HMAC-SHA256 signature so merchants can verify the webhook is from Solanka."""
    body = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    sig  = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    return f"sha256={sig}"


async def deliver(callback_url: str, payload: dict, secret: str | None = None) -> bool:
    """
    POST payload to callback_url with optional HMAC signature.
    Returns True if any attempt succeeded (2xx), False otherwise.
    """
    if not callback_url:
        return False

    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Solanka-Webhook/1.0",
        "X-Solanka-Event": payload.get("event", "payment"),
        "X-Solanka-Timestamp": str(int(time.time())),
    }
    if secret:
        headers["X-Solanka-Signature"] = _sign_payload(payload, secret)

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                r = await client.post(callback_url, json=payload, headers=headers)
                if 200 <= r.status_code < 300:
                    log.info(f"Webhook delivered to {callback_url} (attempt {attempt})")
                    return True
                log.warning(f"Webhook attempt {attempt} got {r.status_code} from {callback_url}")
        except Exception as e:
            log.warning(f"Webhook attempt {attempt} failed: {e}")

        if attempt < MAX_RETRIES:
            await asyncio.sleep(2 ** attempt)   # 2s, 4s backoff

    log.error(f"Webhook delivery failed after {MAX_RETRIES} attempts: {callback_url}")
    return False


async def fire_payment_confirmed(
    callback_url: str,
    payment_link_id: str,
    slug: str,
    signature: str,
    amount_usdc: float,
    receiver_wallet: str,
    sender_wallet: str | None,
    webhook_secret: str | None = None,
):
    """Fire the payment.confirmed event to a merchant's callback URL."""
    payload = {
        "event":            "payment.confirmed",
        "payment_link_id":  payment_link_id,
        "slug":             slug,
        "signature":        signature,
        "amount_usdc":      amount_usdc,
        "receiver_wallet":  receiver_wallet,
        "sender_wallet":    sender_wallet,
        "network":          "solana",
        "timestamp":        int(time.time()),
    }
    await deliver(callback_url, payload, webhook_secret)
