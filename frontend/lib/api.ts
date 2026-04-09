const API = process.env.NEXT_PUBLIC_API_URL || 'https://solanka-production.up.railway.app'

// ── Token helpers ────────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('solanka_token')
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' }
}

export function logout() {
  localStorage.removeItem('solanka_token')
  localStorage.removeItem('solanka_user')
}

/** Redirect browser to backend Google OAuth initiation */
export function loginWithGoogle() {
  window.location.href = `${API}/api/v1/auth/google`
}

// ── KYC & Onboarding ─────────────────────────────────────
export async function submitKYC(kyc_type: 'bvn' | 'nin', value: string) {
  const res = await fetch(`${API}/api/v1/kyc/verify`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ kyc_type, value }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.detail || 'KYC verification failed')
  return json
}

export async function getKYCStatus() {
  const res = await fetch(`${API}/api/v1/kyc/status`, { headers: authHeaders() })
  return res.json()
}

export async function acceptTerms() {
  const res = await fetch(`${API}/api/v1/kyc/accept-terms`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ accepted: true }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.detail || 'Failed to accept terms')
  return json
}

export async function updateProfile(data: { display_name?: string; phone?: string; solana_wallet?: string }) {
  const res = await fetch(`${API}/api/v1/auth/me`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.detail || 'Profile update failed')
  return json
}

// ── Auth endpoints ───────────────────────────────────────
export async function login(email: string, password: string) {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.detail || 'Login failed')
  return json as { token: string; token_type: string; user: SolankaUser }
}

export async function register(
  email: string,
  password: string,
  display_name: string,
  solana_wallet?: string,
) {
  const res = await fetch(`${API}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, display_name, solana_wallet }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.detail || 'Registration failed')
  return json as { token: string; token_type: string; user: SolankaUser }
}

export async function getMe(): Promise<SolankaUser> {
  const res = await fetch(`${API}/api/v1/auth/me`, { headers: authHeaders() })
  const json = await res.json()
  if (!res.ok) throw new Error(json.detail || 'Unauthorized')
  return json
}

// ── Types ────────────────────────────────────────────────
export interface SolankaUser {
  id: string
  email: string
  display_name: string
  solana_wallet: string | null
  api_key: string
  is_active: boolean
  created_at: string
}

export async function getMyLinks() {
  const res = await fetch(`${API}/api/v1/payments/links`, { headers: authHeaders() })
  if (!res.ok) {
    if (res.status === 401) throw new Error('unauthorized')
    throw new Error('Failed to load links')
  }
  return res.json()
}

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
    headers: authHeaders(),
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
  const res = await fetch(url, { headers: authHeaders() })
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
