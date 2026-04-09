import shortuuid
import uuid
from datetime import datetime

def generate_payment_slug() -> str:
    """Generate a short unique slug for payment links e.g. solanka.io/pay/aB3xK9"""
    return shortuuid.ShortUUID().random(length=8)

def generate_id() -> str:
    """Generate a full UUID for database records."""
    return str(uuid.uuid4())

def format_ngn(amount: float) -> str:
    """Format a number as Nigerian Naira string."""
    return f"₦{amount:,.2f}"

def format_sol(amount: float) -> str:
    """Format a number as SOL string."""
    return f"{amount:.6f} SOL"

def format_usdc(amount: float) -> str:
    """Format a number as USDC string."""
    return f"{amount:.2f} USDC"

def timestamp_now() -> str:
    return datetime.utcnow().isoformat()
