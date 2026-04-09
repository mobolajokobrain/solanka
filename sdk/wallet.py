from . import _http
from .models import WalletBalance, USDCOnly


class WalletAPI:
    """Wallet balance and transaction history."""

    def __init__(self, base_url: str):
        self._base = base_url

    async def balance(self, wallet_address: str) -> WalletBalance:
        """
        Get full wallet balance: SOL + USDC, both with live NGN equivalents.

        Example:
            balance = await client.wallet.balance("YourWalletAddress")
            print(f"{balance.usdc.balance} USDC  ≈  ₦{balance.usdc.ngn_equivalent:,.2f}")
        """
        data = await _http.async_get(self._base, f"/api/v1/wallet/{wallet_address}/balance")
        return WalletBalance(**data)

    async def usdc(self, wallet_address: str) -> USDCOnly:
        """Get USDC balance only for a wallet, with NGN equivalent."""
        data = await _http.async_get(self._base, f"/api/v1/wallet/{wallet_address}/usdc")
        return USDCOnly(**data)

    async def transactions(self, wallet_address: str, limit: int = 10) -> list:
        """Get recent on-chain transactions for a wallet (max 50)."""
        data = await _http.async_get(
            self._base,
            f"/api/v1/wallet/{wallet_address}/transactions",
            limit=min(limit, 50)
        )
        return data.get("transactions", [])


class WalletAPISync:
    """Sync version of WalletAPI."""

    def __init__(self, base_url: str):
        self._base = base_url

    def balance(self, wallet_address: str) -> WalletBalance:
        data = _http.sync_get(self._base, f"/api/v1/wallet/{wallet_address}/balance")
        return WalletBalance(**data)

    def usdc(self, wallet_address: str) -> USDCOnly:
        data = _http.sync_get(self._base, f"/api/v1/wallet/{wallet_address}/usdc")
        return USDCOnly(**data)

    def transactions(self, wallet_address: str, limit: int = 10) -> list:
        data = _http.sync_get(
            self._base,
            f"/api/v1/wallet/{wallet_address}/transactions",
            limit=min(limit, 50)
        )
        return data.get("transactions", [])
