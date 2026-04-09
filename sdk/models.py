from pydantic import BaseModel
from typing import Optional


class NGNEquivalent(BaseModel):
    usdc_amount: float
    ngn_amount: float
    rate: float
    pair: str


class PaymentLink(BaseModel):
    id: str
    slug: str
    payment_url: str
    qr_url: str
    solana_pay_url: str
    merchant_wallet: str
    amount_usdc: Optional[float] = None
    ngn_equivalent: Optional[NGNEquivalent] = None
    description: Optional[str] = None
    label: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[str] = None


class SolBalance(BaseModel):
    balance: float
    lamports: int
    ngn_equivalent: float


class USDCBalance(BaseModel):
    balance: float
    mint: Optional[str] = None
    has_token_account: bool
    ngn_equivalent: float


class WalletBalance(BaseModel):
    wallet: str
    network: str
    sol: SolBalance
    usdc: USDCBalance
    rates: dict


class USDCOnly(BaseModel):
    wallet: str
    balance_usdc: float
    mint: str
    network: str
    has_token_account: bool
    ngn_equivalent: float
    rate: float


class RateNGN(BaseModel):
    pair: str
    rate: float
    source: str


class RateSOL(BaseModel):
    pair: str
    rate: float
    source: str


class ConversionResult(BaseModel):
    usdc_amount: Optional[float] = None
    sol_amount: Optional[float] = None
    ngn_amount: float
    rate: Optional[float] = None
    sol_usdt_rate: Optional[float] = None
    usdt_ngn_rate: Optional[float] = None


class VerificationResult(BaseModel):
    success: bool
    transaction_id: str
    signature: str
    status: str
    usdc_received: Optional[float] = None
    receiver: Optional[str] = None
    slot: Optional[int] = None
    block_time: Optional[int] = None


class Transaction(BaseModel):
    id: str
    signature: Optional[str] = None
    amount_usdc: Optional[float] = None
    amount_ngn: Optional[float] = None
    status: str
    created_at: Optional[str] = None


class TransactionList(BaseModel):
    count: int
    transactions: list[Transaction]
