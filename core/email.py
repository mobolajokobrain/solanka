"""
Transactional email via Resend (https://resend.com).
Free tier: 3,000 emails/month, 100/day.

Set RESEND_API_KEY in env. If not set, emails are logged to console only (dev mode).
"""
import os
import httpx
import logging

log = logging.getLogger(__name__)

RESEND_API_KEY  = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL      = os.getenv("EMAIL_FROM", "Solanka <noreply@solanka.io>")
RESEND_BASE     = "https://api.resend.com"


async def _send(to: str, subject: str, html: str) -> bool:
    """Send an email via Resend. Returns True on success, False on failure."""
    if not RESEND_API_KEY:
        log.info(f"[EMAIL DEV] To: {to} | Subject: {subject}")
        return True
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                f"{RESEND_BASE}/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={"from": FROM_EMAIL, "to": [to], "subject": subject, "html": html},
            )
            if r.status_code in (200, 201):
                return True
            log.warning(f"Resend error {r.status_code}: {r.text}")
            return False
    except Exception as e:
        log.error(f"Email send failed: {e}")
        return False


# ── Email templates ───────────────────────────────────────
def _base(content: str) -> str:
    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #0A0A0B; color: #fff; margin: 0; padding: 0; }}
    .wrap {{ max-width: 560px; margin: 40px auto; padding: 0 20px; }}
    .card {{ background: #111; border: 1px solid #222; border-radius: 16px; padding: 32px; }}
    .logo {{ display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }}
    .logo-icon {{ width: 36px; height: 36px; border-radius: 10px;
                 background: linear-gradient(135deg, #9945FF, #14F195);
                 display: flex; align-items: center; justify-content: center;
                 font-weight: 900; font-size: 18px; color: #000; line-height: 36px;
                 text-align: center; }}
    .logo-text {{ font-size: 20px; font-weight: 800; color: #fff; }}
    h2 {{ margin: 0 0 12px; font-size: 22px; }}
    p  {{ color: #aaa; line-height: 1.6; margin: 0 0 16px; font-size: 15px; }}
    .amount {{ font-size: 32px; font-weight: 900; color: #fff; margin: 20px 0 4px; }}
    .ngn    {{ color: #14F195; font-size: 16px; margin-bottom: 20px; }}
    .pill   {{ display: inline-block; background: #14F195; color: #000;
               padding: 4px 12px; border-radius: 100px; font-size: 13px; font-weight: 700; }}
    .mono   {{ font-family: monospace; font-size: 13px; color: #888;
               background: #1a1a1a; padding: 10px 14px; border-radius: 8px;
               margin: 12px 0; word-break: break-all; }}
    .btn    {{ display: inline-block; background: linear-gradient(135deg, #9945FF, #14F195);
               color: #000; font-weight: 700; padding: 12px 24px; border-radius: 12px;
               text-decoration: none; margin-top: 16px; }}
    .footer {{ color: #555; font-size: 12px; margin-top: 28px; text-align: center; }}
    .divider {{ border: none; border-top: 1px solid #222; margin: 20px 0; }}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="logo">
        <div class="logo-icon">S</div>
        <div class="logo-text">Solanka</div>
      </div>
      {content}
    </div>
    <div class="footer">
      Solanka · Lagos, Nigeria · <a href="https://solanka.io" style="color:#555">solanka.io</a>
    </div>
  </div>
</body>
</html>
"""


async def send_payment_received(
    merchant_email: str,
    merchant_name: str,
    amount_usdc: float,
    ngn_amount: float,
    signature: str,
    payment_label: str,
):
    html = _base(f"""
      <h2>💰 Payment received!</h2>
      <p>Hi {merchant_name}, you just received a payment on Solanka.</p>
      <div class="amount">{amount_usdc} USDC</div>
      <div class="ngn">≈ ₦{ngn_amount:,.2f}</div>
      <p><strong>Payment:</strong> {payment_label}</p>
      <hr class="divider">
      <p style="font-size:13px;color:#666;">Transaction signature</p>
      <div class="mono">{signature}</div>
      <span class="pill">✓ Confirmed on Solana</span>
      <br>
      <a href="https://solana.fm/tx/{signature}" class="btn" style="margin-top:20px;font-size:13px;">
        View on Solana FM →
      </a>
    """)
    await _send(merchant_email, f"You received {amount_usdc} USDC — Solanka", html)


async def send_welcome(email: str, display_name: str):
    html = _base(f"""
      <h2>Welcome to Solanka! 🎉</h2>
      <p>Hi {display_name}, your account is ready.</p>
      <p>Solanka lets you accept USDC payments on Solana and see the live Naira equivalent — with a Python SDK your customers can integrate in minutes.</p>
      <a href="https://solanka-production.up.railway.app/dashboard" class="btn">Go to Dashboard →</a>
      <hr class="divider">
      <p style="font-size:13px;color:#666;">Need help? Reply to this email or check our docs.</p>
    """)
    await _send(email, "Welcome to Solanka — Yours, on Solana", html)


async def send_kyc_verified(email: str, display_name: str, kyc_type: str):
    html = _base(f"""
      <h2>Identity verified ✓</h2>
      <p>Hi {display_name}, your {kyc_type.upper()} has been verified successfully.</p>
      <p>Your Solanka merchant account is now fully active. You can create payment links and start accepting USDC payments.</p>
      <a href="https://solanka-production.up.railway.app/dashboard" class="btn">Go to Dashboard →</a>
    """)
    await _send(email, "Your identity has been verified — Solanka", html)


async def send_kyc_tier2_verified(email: str, display_name: str):
    html = _base(f"""
      <h2>Enhanced verification complete ✓</h2>
      <p>Hi {display_name}, your document and identity check via Onfido is complete.</p>
      <p>Your account has been upgraded to <strong>Tier 2</strong> — unlimited transaction volume.</p>
      <a href="https://solanka-production.up.railway.app/dashboard" class="btn">View Dashboard →</a>
    """)
    await _send(email, "Enhanced KYC verified — Solanka", html)
