# Solanka 🚀
> Yours, on Solana

Solana-powered payment and developer toolkit for African businesses.

## Setup

1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/solanka.git
cd solanka
```

2. Install dependencies
```bash
pip install -r requirements.txt
```

3. Create your `.env` file
```bash
cp .env.example .env
# Fill in your HELIUS_API_KEY and other values
```

4. Run the server
```bash
uvicorn main:app --reload
```

5. Open API docs
```
http://localhost:8000/docs
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/rates/ngn | Live USDT/NGN rate |
| GET | /api/v1/rates/sol | Live SOL/USDT rate |
| GET | /api/v1/rates/convert/usdc/{amount} | Convert USDC to NGN |
| GET | /api/v1/wallet/{address}/balance | Wallet SOL balance + NGN |
| GET | /api/v1/wallet/{address}/transactions | Recent transactions |
| POST | /api/v1/payments/link | Create payment link |
| GET | /api/v1/payments/link/{slug} | Get payment link |
| POST | /api/v1/payments/verify | Verify a transaction |
| GET | /api/v1/payments/transactions | List all transactions |

## Founder
Adebayo Olalere — Solanka

## Built For
Colosseum Frontier Hackathon 2026 — SuperteamNG x Raenest Track
