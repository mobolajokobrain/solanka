"""
Solanka SDK — usage examples
Run from the project root: python -m sdk.example
"""
import asyncio
from sdk import Solanka, SolankaSync

DEMO_WALLET = "DemoWa11etAddressRep1aceWithRea1So1anaAddress"


# ── Async example ──────────────────────────────────────────
async def async_demo():
    client = Solanka()  # points to production by default
    print(repr(client))

    # 1. Live rates
    ngn_rate = await client.rates.ngn()
    sol_rate = await client.rates.sol()
    print(f"\n📈 Rates")
    print(f"   1 USDC = ₦{ngn_rate:,.2f}")
    print(f"   1 SOL  = ${sol_rate:,.2f}")

    # 2. Convert amounts
    result = await client.rates.convert_usdc(100.0)
    print(f"\n💱 100 USDC = ₦{result.ngn_amount:,.2f}")

    # 3. Create a payment link
    link = await client.payments.create_link(
        merchant_wallet=DEMO_WALLET,
        amount_usdc=25.0,
        description="Invoice #001 — Logo design",
        label="Solanka Demo"
    )
    print(f"\n🔗 Payment link created")
    print(f"   URL:        {link.payment_url}")
    print(f"   Solana Pay: {link.solana_pay_url}")
    print(f"   QR:         {link.qr_url}")

    # 4. Download QR code
    qr_bytes = await client.payments.get_qr(link.slug)
    with open("demo_qr.png", "wb") as f:
        f.write(qr_bytes)
    print(f"   QR saved → demo_qr.png ({len(qr_bytes):,} bytes)")

    # 5. Wallet balance
    balance = await client.wallet.balance(DEMO_WALLET)
    print(f"\n💰 Wallet: {balance.wallet}")
    print(f"   SOL:  {balance.sol.balance} SOL  ≈  ₦{balance.sol.ngn_equivalent:,.2f}")
    print(f"   USDC: {balance.usdc.balance} USDC ≈  ₦{balance.usdc.ngn_equivalent:,.2f}")


# ── Sync example ───────────────────────────────────────────
def sync_demo():
    client = SolankaSync()
    print(repr(client))

    rate = client.rates.ngn()
    print(f"\n📈 1 USDC = ₦{rate:,.2f}  (sync)")

    link = client.payments.create_link(
        merchant_wallet=DEMO_WALLET,
        amount_usdc=10.0,
        description="Sync payment demo"
    )
    print(f"🔗 Link: {link.payment_url}  (sync)")


if __name__ == "__main__":
    print("=== Async demo ===")
    asyncio.run(async_demo())

    print("\n=== Sync demo ===")
    sync_demo()
