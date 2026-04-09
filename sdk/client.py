"""
Solanka Python SDK
==================
A developer toolkit for Solana-powered payments in African markets.

Async usage (FastAPI, async scripts):
--------------------------------------
    from sdk import Solanka
    import asyncio

    client = Solanka()

    async def main():
        # Live NGN rate
        rate = await client.rates.ngn()
        print(f"1 USDC = ₦{rate:,.2f}")

        # Create a payment link
        link = await client.payments.create_link(
            merchant_wallet="YourSolanaWallet",
            amount_usdc=50.0,
            description="Invoice #001",
        )
        print(link.payment_url)

        # Check wallet balance
        balance = await client.wallet.balance("YourSolanaWallet")
        print(f"USDC: {balance.usdc.balance} (≈ ₦{balance.usdc.ngn_equivalent:,.2f})")

        # Download QR code
        qr = await client.payments.get_qr(link.slug)
        with open("invoice.png", "wb") as f:
            f.write(qr)

    asyncio.run(main())


Sync usage (Django, Flask, scripts):
--------------------------------------
    from sdk import SolankaSync

    client = SolankaSync()

    rate = client.rates.ngn()
    link = client.payments.create_link(merchant_wallet="...", amount_usdc=100.0)
    balance = client.wallet.balance("...")
"""

from .payments import PaymentsAPI, PaymentsAPISync
from .wallet import WalletAPI, WalletAPISync
from .rates import RatesAPI, RatesAPISync

PRODUCTION_URL = "https://solanka-production.up.railway.app"


class Solanka:
    """
    Async Solanka SDK client.

    Args:
        base_url: Base URL of the Solanka API.
                  Defaults to the production Railway deployment.
    """

    def __init__(self, base_url: str = PRODUCTION_URL):
        self._base_url = base_url.rstrip("/")
        self.payments = PaymentsAPI(self._base_url)
        self.wallet = WalletAPI(self._base_url)
        self.rates = RatesAPI(self._base_url)

    def __repr__(self) -> str:
        return f"<Solanka async client → {self._base_url}>"


class SolankaSync:
    """
    Synchronous Solanka SDK client for Django, Flask, or plain Python scripts.

    Args:
        base_url: Base URL of the Solanka API.
                  Defaults to the production Railway deployment.
    """

    def __init__(self, base_url: str = PRODUCTION_URL):
        self._base_url = base_url.rstrip("/")
        self.payments = PaymentsAPISync(self._base_url)
        self.wallet = WalletAPISync(self._base_url)
        self.rates = RatesAPISync(self._base_url)

    def __repr__(self) -> str:
        return f"<SolankaSync client → {self._base_url}>"
