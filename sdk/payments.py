from typing import Optional
from . import _http
from .models import PaymentLink, VerificationResult, TransactionList


class PaymentsAPI:
    """Create and manage Solanka payment links, verify transactions."""

    def __init__(self, base_url: str):
        self._base = base_url

    async def create_link(
        self,
        merchant_wallet: str,
        amount_usdc: Optional[float] = None,
        description: Optional[str] = None,
        label: Optional[str] = None,
    ) -> PaymentLink:
        """
        Create a Solanka payment link.

        Args:
            merchant_wallet: Solana wallet address to receive payment.
            amount_usdc: Fixed USDC amount. None = open/any amount.
            description: Payment description shown to the payer.
            label: Short label shown in wallets.

        Returns:
            PaymentLink with payment_url, qr_url, and solana_pay_url.

        Example:
            link = await client.payments.create_link(
                merchant_wallet="YourWallet",
                amount_usdc=25.0,
                description="Invoice #001 - Web design",
            )
            print(link.payment_url)   # shareable checkout URL
            print(link.solana_pay_url)  # deep-link into Phantom/Solflare
        """
        body = {
            "merchant_wallet": merchant_wallet,
            "amount_usdc": amount_usdc,
            "description": description,
            "label": label,
        }
        data = await _http.async_post(self._base, "/api/v1/payments/link", body)
        return PaymentLink(**data)

    async def get_link(self, slug: str) -> PaymentLink:
        """Fetch a payment link by its slug."""
        data = await _http.async_get(self._base, f"/api/v1/payments/link/{slug}")
        return PaymentLink(**data)

    async def get_qr(self, slug: str) -> bytes:
        """
        Download the Solana Pay QR code for a payment link as PNG bytes.

        Example:
            qr_bytes = await client.payments.get_qr("abc123XY")
            with open("invoice_qr.png", "wb") as f:
                f.write(qr_bytes)
        """
        return await _http.async_get_bytes(self._base, f"/api/v1/payments/link/{slug}/qr")

    async def get_solana_pay_url(self, slug: str) -> str:
        """Get the raw Solana Pay URL for a payment link."""
        data = await _http.async_get(self._base, f"/api/v1/payments/link/{slug}/solana-pay")
        return data["solana_pay_url"]

    async def verify(
        self,
        signature: str,
        payment_link_id: str,
        sender_wallet: Optional[str] = None,
    ) -> VerificationResult:
        """
        Verify a Solana USDC transaction against a payment link.

        Checks that:
        - The transaction exists and succeeded on-chain.
        - The merchant wallet received USDC.
        - The amount matches the payment link (if fixed).

        Args:
            signature: Solana transaction signature.
            payment_link_id: ID of the Solanka payment link.
            sender_wallet: Optional — the payer's wallet address.

        Returns:
            VerificationResult with usdc_received and block_time.
        """
        body = {
            "signature": signature,
            "payment_link_id": payment_link_id,
            "sender_wallet": sender_wallet,
        }
        data = await _http.async_post(self._base, "/api/v1/payments/verify", body)
        return VerificationResult(**data)

    async def transactions(self, wallet: Optional[str] = None) -> TransactionList:
        """List recorded transactions, optionally filtered by merchant wallet."""
        params = {"wallet": wallet} if wallet else {}
        data = await _http.async_get(self._base, "/api/v1/payments/transactions", **params)
        return TransactionList(**data)


class PaymentsAPISync:
    """Sync version of PaymentsAPI."""

    def __init__(self, base_url: str):
        self._base = base_url

    def create_link(
        self,
        merchant_wallet: str,
        amount_usdc: Optional[float] = None,
        description: Optional[str] = None,
        label: Optional[str] = None,
    ) -> PaymentLink:
        body = {
            "merchant_wallet": merchant_wallet,
            "amount_usdc": amount_usdc,
            "description": description,
            "label": label,
        }
        data = _http.sync_post(self._base, "/api/v1/payments/link", body)
        return PaymentLink(**data)

    def get_link(self, slug: str) -> PaymentLink:
        data = _http.sync_get(self._base, f"/api/v1/payments/link/{slug}")
        return PaymentLink(**data)

    def get_qr(self, slug: str) -> bytes:
        return _http.sync_get_bytes(self._base, f"/api/v1/payments/link/{slug}/qr")

    def get_solana_pay_url(self, slug: str) -> str:
        data = _http.sync_get(self._base, f"/api/v1/payments/link/{slug}/solana-pay")
        return data["solana_pay_url"]

    def verify(
        self,
        signature: str,
        payment_link_id: str,
        sender_wallet: Optional[str] = None,
    ) -> VerificationResult:
        body = {
            "signature": signature,
            "payment_link_id": payment_link_id,
            "sender_wallet": sender_wallet,
        }
        data = _http.sync_post(self._base, "/api/v1/payments/verify", body)
        return VerificationResult(**data)

    def transactions(self, wallet: Optional[str] = None) -> TransactionList:
        params = {"wallet": wallet} if wallet else {}
        data = _http.sync_get(self._base, "/api/v1/payments/transactions", **params)
        return TransactionList(**data)
