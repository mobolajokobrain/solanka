class SolankaError(Exception):
    """Base exception for all Solanka SDK errors."""
    pass


class SolankaAPIError(SolankaError):
    """Raised when the Solanka API returns a non-2xx response."""
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"Solanka API error {status_code}: {detail}")


class SolankaNetworkError(SolankaError):
    """Raised when a network/connection error occurs."""
    pass


class SolankaNotFoundError(SolankaAPIError):
    """Raised when the requested resource does not exist (404)."""
    pass


class SolankaVerificationError(SolankaError):
    """Raised when a transaction fails on-chain verification."""
    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(f"Transaction verification failed: {reason}")
