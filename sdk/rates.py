from . import _http
from .models import RateNGN, RateSOL, ConversionResult


class RatesAPI:
    """Live exchange rate queries: NGN, SOL, USDC conversions."""

    def __init__(self, base_url: str):
        self._base = base_url

    async def ngn(self) -> float:
        """Return live USDT/NGN rate from Binance."""
        data = await _http.async_get(self._base, "/api/v1/rates/ngn")
        return data["rate"]

    async def sol(self) -> float:
        """Return live SOL/USDT rate from Binance."""
        data = await _http.async_get(self._base, "/api/v1/rates/sol")
        return data["rate"]

    async def convert_usdc(self, amount: float) -> ConversionResult:
        """Convert a USDC amount to NGN at live rate."""
        data = await _http.async_get(self._base, f"/api/v1/rates/convert/usdc/{amount}")
        return ConversionResult(**data)

    async def convert_sol(self, amount: float) -> ConversionResult:
        """Convert a SOL amount to NGN at live rate."""
        data = await _http.async_get(self._base, f"/api/v1/rates/convert/sol/{amount}")
        return ConversionResult(**data)


class RatesAPISync:
    """Sync version of RatesAPI."""

    def __init__(self, base_url: str):
        self._base = base_url

    def ngn(self) -> float:
        data = _http.sync_get(self._base, "/api/v1/rates/ngn")
        return data["rate"]

    def sol(self) -> float:
        data = _http.sync_get(self._base, "/api/v1/rates/sol")
        return data["rate"]

    def convert_usdc(self, amount: float) -> ConversionResult:
        data = _http.sync_get(self._base, f"/api/v1/rates/convert/usdc/{amount}")
        return ConversionResult(**data)

    def convert_sol(self, amount: float) -> ConversionResult:
        data = _http.sync_get(self._base, f"/api/v1/rates/convert/sol/{amount}")
        return ConversionResult(**data)
