const API = process.env.NEXT_PUBLIC_API_URL || 'https://solanka-production.up.railway.app'

export async function getPaymentLink(slug: string) {
  const res = await fetch(`${API}/api/v1/payments/link/${slug}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Payment link not found')
  }
  return res.json()
}

export async function createPaymentLink(data: {
  merchant_wallet: string
  amount_usdc?: number
  description?: string
  label?: string
}) {
  const res = await fetch(`${API}/api/v1/payments/link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to create payment link')
  }
  return res.json()
}

export async function verifyPayment(data: {
  signature: string
  payment_link_id: string
  sender_wallet?: string
}) {
  const res = await fetch(`${API}/api/v1/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.detail || 'Verification failed')
  return json
}

export async function getTransactions(wallet?: string) {
  const url = wallet
    ? `${API}/api/v1/payments/transactions?wallet=${wallet}`
    : `${API}/api/v1/payments/transactions`
  const res = await fetch(url)
  return res.json()
}

export async function getWalletBalance(address: string) {
  const res = await fetch(`${API}/api/v1/wallet/${address}/balance`)
  return res.json()
}

export async function getNGNRate() {
  const res = await fetch(`${API}/api/v1/rates/ngn`)
  return res.json()
}

export async function getSOLRate() {
  const res = await fetch(`${API}/api/v1/rates/sol`)
  return res.json()
}

export function getQRUrl(slug: string) {
  return `${API}/api/v1/payments/link/${slug}/qr`
}

export function formatNGN(amount: number) {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function shortenAddress(addr: string, chars = 4) {
  if (!addr) return ''
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`
}
