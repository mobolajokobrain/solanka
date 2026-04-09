'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  createPaymentLink,
  getTransactions,
  getNGNRate,
  getMyLinks,
  getMe,
  logout,
  formatNGN,
  shortenAddress,
  getQRUrl,
  type SolankaUser,
} from '@/lib/api'

// ── Sidebar ───────────────────────────────────────────────
function Sidebar({ user, onLogout }: { user: SolankaUser | null; onLogout: () => void }) {
  const nav = [
    { icon: '◈', label: 'Overview', href: '/dashboard' },
    { icon: '🔗', label: 'Payment Links', href: '/dashboard' },
    { icon: '📊', label: 'Transactions', href: '/dashboard' },
    { icon: '⚙', label: 'Settings', href: '/dashboard' },
  ]
  const initials = user ? user.display_name.slice(0, 2).toUpperCase() : '??'

  return (
    <aside className="w-64 flex-shrink-0 border-r border-sol-border h-screen sticky top-0 flex flex-col bg-sol-dark/80 backdrop-blur-xl">
      <div className="p-6 border-b border-sol-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-sol-gradient flex items-center justify-center text-sm font-bold text-black">S</div>
          <span className="font-bold text-lg">Solanka</span>
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {nav.map((item, i) => (
          <a key={i} href={item.href}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${
              i === 0
                ? 'bg-[#9945FF]/10 text-[#9945FF] font-medium border border-[#9945FF]/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}>
            <span className="text-base">{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>
      <div className="p-4 border-t border-sol-border space-y-2">
        {user?.api_key && (
          <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <div className="text-[10px] text-gray-500 mb-0.5 uppercase tracking-wider">API Key</div>
            <div className="text-xs font-mono text-gray-400 truncate">{user.api_key.slice(0, 20)}…</div>
          </div>
        )}
        <div className="glass rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sol-gradient flex items-center justify-center text-xs font-bold text-black flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{user?.display_name ?? '...'}</div>
            <div className="text-xs text-gray-500 truncate">{user?.email ?? ''}</div>
          </div>
          <button onClick={onLogout} title="Sign out"
            className="text-gray-500 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0">
            ⏻
          </button>
        </div>
      </div>
    </aside>
  )
}

// ── Stat Card ─────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="glass rounded-2xl p-6 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5 group-hover:opacity-10 transition-opacity"
        style={{ background: color, filter: 'blur(40px)', transform: 'translate(30%, -30%)' }} />
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">{label}</div>
      <div className="text-3xl font-black mb-1 tracking-tight">{value}</div>
      <div className="text-xs" style={{ color }}>{sub}</div>
    </div>
  )
}

// ── Create Link Modal ─────────────────────────────────────
function CreateLinkModal({
  defaultWallet,
  onClose,
  onCreated,
}: {
  defaultWallet?: string
  onClose: () => void
  onCreated: (link: unknown) => void
}) {
  const [form, setForm] = useState({
    merchant_wallet: defaultWallet || '',
    amount_usdc: '',
    description: '',
    label: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.merchant_wallet) { setError('Wallet address is required'); return }
    setLoading(true)
    try {
      const link = await createPaymentLink({
        merchant_wallet: form.merchant_wallet,
        amount_usdc: form.amount_usdc ? parseFloat(form.amount_usdc) : undefined,
        description: form.description || undefined,
        label: form.label || undefined,
      })
      onCreated(link)
      onClose()
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Failed to create link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md glass rounded-2xl border border-sol-border shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-sol-border">
          <h3 className="font-bold text-lg">Create Payment Link</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1.5">Your Solana Wallet *</label>
            <input
              value={form.merchant_wallet}
              onChange={e => setForm(f => ({ ...f, merchant_wallet: e.target.value }))}
              placeholder="YourSolanaWalletAddress..."
              className="w-full bg-black/30 border border-sol-border rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#9945FF]/60 transition-colors"
            />
            {defaultWallet && (
              <p className="text-xs text-[#14F195] mt-1">✓ Pre-filled from your profile</p>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1.5">Amount (USDC)</label>
            <input
              type="number" step="0.01" min="0"
              value={form.amount_usdc}
              onChange={e => setForm(f => ({ ...f, amount_usdc: e.target.value }))}
              placeholder="Leave empty for open amount"
              className="w-full bg-black/30 border border-sol-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#9945FF]/60 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1.5">Label</label>
            <input
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Invoice Payment"
              className="w-full bg-black/30 border border-sol-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#9945FF]/60 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Logo design for Acme Co."
              rows={2}
              className="w-full bg-black/30 border border-sol-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#9945FF]/60 transition-colors resize-none"
            />
          </div>
          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</div>
          )}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-sol-gradient text-black font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Payment Link →'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Success Modal (after link created) ───────────────────
function LinkCreatedModal({ link, onClose }: { link: Record<string, unknown>; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  function copy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const paymentUrl = link.payment_url as string
  const slug = link.slug as string
  const amountUsdc = link.amount_usdc as number | undefined
  const ngnEquivalent = link.ngn_equivalent as { ngn_amount: number } | undefined

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md glass rounded-2xl border border-[#14F195]/20 shadow-2xl animate-slide-up">
        <div className="p-6 text-center border-b border-sol-border">
          <div className="w-14 h-14 bg-[#14F195]/10 border-2 border-[#14F195]/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">✓</span>
          </div>
          <h3 className="font-bold text-lg">Payment link created!</h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <div className="text-xs text-gray-500 mb-2">Payment URL</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-black/30 border border-sol-border rounded-xl px-3 py-2.5 text-xs font-mono text-gray-300 truncate">
                {paymentUrl}
              </div>
              <button onClick={() => copy(paymentUrl)}
                className="px-3 py-2.5 rounded-xl bg-[#9945FF]/20 border border-[#9945FF]/30 text-[#9945FF] text-xs font-medium hover:bg-[#9945FF]/30 transition-colors whitespace-nowrap">
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-center bg-white rounded-xl p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={getQRUrl(slug)} alt="QR Code" className="w-40 h-40" />
          </div>
          {amountUsdc && (
            <div className="glass rounded-xl p-4 text-center">
              <div className="text-2xl font-black">{amountUsdc} USDC</div>
              {ngnEquivalent && (
                <div className="text-[#14F195] text-sm mt-1">≈ {formatNGN(ngnEquivalent.ngn_amount)}</div>
              )}
            </div>
          )}
          <button onClick={onClose}
            className="w-full py-3 rounded-xl glass border border-sol-border text-sm font-medium hover:border-[#9945FF]/40 transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<SolankaUser | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createdLink, setCreatedLink] = useState<Record<string, unknown> | null>(null)
  const [transactions, setTransactions] = useState<Record<string, unknown>[]>([])
  const [ngnRate, setNgnRate] = useState<number | null>(null)
  const [links, setLinks] = useState<Record<string, unknown>[]>([])
  const [authChecked, setAuthChecked] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [txData, linkData, rateData] = await Promise.allSettled([
        getTransactions(),
        getMyLinks(),
        getNGNRate(),
      ])
      if (txData.status === 'fulfilled') setTransactions(txData.value.transactions || [])
      if (linkData.status === 'fulfilled') setLinks(linkData.value.links || [])
      if (rateData.status === 'fulfilled') setNgnRate(rateData.value.rate)
    } catch {}
  }, [])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('solanka_token') : null
    if (!token) {
      router.replace('/auth/login')
      return
    }

    // Load user from cache first for instant render
    const cached = typeof window !== 'undefined' ? localStorage.getItem('solanka_user') : null
    if (cached) {
      try { setUser(JSON.parse(cached)) } catch {}
    }

    // Then verify with server
    getMe()
      .then(u => {
        setUser(u)
        localStorage.setItem('solanka_user', JSON.stringify(u))
        // Gate: redirect to onboarding if not completed
        if (!u.is_onboarded) {
          router.replace('/onboarding')
        }
      })
      .catch(() => {
        logout()
        router.replace('/auth/login')
      })
      .finally(() => setAuthChecked(true))

    loadData()
  }, [router, loadData])

  function handleLogout() {
    logout()
    router.push('/auth/login')
  }

  function onLinkCreated(link: unknown) {
    setCreatedLink(link as Record<string, unknown>)
    setLinks(prev => [link as Record<string, unknown>, ...prev])
  }

  const totalUSDC = transactions.reduce((s, t) => s + ((t.amount_usdc as number) || 0), 0)

  // Show nothing while checking auth (avoids flash of unauthenticated content)
  if (!authChecked && !user) {
    return (
      <div className="min-h-screen bg-sol-dark flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading…
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-sol-dark">
      <Sidebar user={user} onLogout={handleLogout} />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="border-b border-sol-border px-8 py-5 flex items-center justify-between sticky top-0 bg-sol-dark/80 backdrop-blur-xl z-10">
          <div>
            <h1 className="text-xl font-bold">
              {user ? `Welcome, ${user.display_name.split(' ')[0]}` : 'Dashboard'}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {ngnRate ? `1 USDC = ₦${ngnRate.toLocaleString()}` : 'Loading rates...'}
              {user?.solana_wallet ? ` · ${shortenAddress(user.solana_wallet)}` : ''}
            </p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 rounded-xl bg-sol-gradient text-black font-semibold text-sm hover:opacity-90 transition-opacity">
            + Create Link
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Received" value={`${totalUSDC.toFixed(2)} USDC`}
              sub={ngnRate ? `≈ ${formatNGN(totalUSDC * ngnRate)}` : '—'} color="#9945FF" />
            <StatCard label="Transactions" value={String(transactions.length)}
              sub="All time" color="#14F195" />
            <StatCard label="Payment Links" value={String(links.length)}
              sub="Active links" color="#9945FF" />
            <StatCard label="NGN Rate" value={ngnRate ? `₦${ngnRate.toLocaleString()}` : '...'}
              sub="per USDC · Live Binance" color="#14F195" />
          </div>

          {/* Payment Links */}
          {links.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Payment Links</h2>
              <div className="space-y-3">
                {links.map((link, i) => (
                  <div key={i} className="glass rounded-xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#9945FF]/10 border border-[#9945FF]/20 flex items-center justify-center flex-shrink-0">
                      🔗
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{link.label as string}</div>
                      <div className="text-xs text-gray-500 font-mono truncate">{link.slug as string}</div>
                      {link.times_used ? (
                        <div className="text-xs text-gray-600 mt-0.5">Used {link.times_used as number}×</div>
                      ) : null}
                    </div>
                    {link.amount_usdc && (
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold">{link.amount_usdc as number} USDC</div>
                        {(link.ngn_equivalent as { ngn_amount: number } | undefined) && (
                          <div className="text-xs text-[#14F195]">
                            ≈ {formatNGN((link.ngn_equivalent as { ngn_amount: number }).ngn_amount)}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2 flex-shrink-0">
                      <a href={link.payment_url as string} target="_blank"
                        className="px-3 py-1.5 rounded-lg bg-[#9945FF]/10 border border-[#9945FF]/20 text-[#9945FF] text-xs font-medium hover:bg-[#9945FF]/20 transition-colors">
                        Open
                      </a>
                      <button onClick={() => setCreatedLink(link)}
                        className="px-3 py-1.5 rounded-lg glass border border-sol-border text-xs font-medium hover:border-[#9945FF]/30 transition-colors">
                        QR
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions */}
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Recent Transactions</h2>
            {transactions.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <div className="text-4xl mb-4">📭</div>
                <div className="text-gray-400 font-medium mb-2">No transactions yet</div>
                <p className="text-gray-600 text-sm mb-6">Create a payment link and share it to get started</p>
                <button onClick={() => setShowCreate(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#9945FF]/10 border border-[#9945FF]/20 text-[#9945FF] text-sm font-medium hover:bg-[#9945FF]/20 transition-colors">
                  Create your first link →
                </button>
              </div>
            ) : (
              <div className="glass rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-sol-border">
                      {['Signature', 'Amount', 'NGN Value', 'Status', 'Date'].map(h => (
                        <th key={h} className="text-left px-5 py-3.5 text-xs text-gray-500 font-medium uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx, i) => (
                      <tr key={i} className="border-b border-sol-border/50 last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4">
                          <span className="text-xs font-mono text-gray-400">
                            {tx.signature ? `${(tx.signature as string).slice(0, 8)}...` : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm font-semibold">{tx.amount_usdc ?? '—'} USDC</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-[#14F195]">
                            {tx.amount_ngn
                              ? formatNGN(tx.amount_ngn as number)
                              : ngnRate && tx.amount_usdc
                              ? formatNGN((tx.amount_usdc as number) * ngnRate)
                              : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            tx.status === 'confirmed'
                              ? 'bg-[#14F195]/10 text-[#14F195] border border-[#14F195]/20'
                              : tx.status === 'failed'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                          }`}>
                            {tx.status as string}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs text-gray-500">
                            {tx.created_at ? new Date(tx.created_at as string).toLocaleDateString('en-NG') : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Empty state CTA */}
          {links.length === 0 && transactions.length === 0 && (
            <div className="gradient-border rounded-2xl p-8 text-center">
              <div className="text-5xl mb-4">🚀</div>
              <h3 className="text-xl font-bold mb-2">Ready to accept payments?</h3>
              <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                Create your first payment link and share it with clients. Get paid in USDC, see the Naira equivalent instantly.
              </p>
              <button onClick={() => setShowCreate(true)}
                className="px-6 py-3 rounded-xl bg-sol-gradient text-black font-semibold text-sm hover:opacity-90 transition-opacity">
                Create first payment link →
              </button>
            </div>
          )}
        </div>
      </main>

      {showCreate && (
        <CreateLinkModal
          defaultWallet={user?.solana_wallet ?? undefined}
          onClose={() => setShowCreate(false)}
          onCreated={onLinkCreated}
        />
      )}
      {createdLink && (
        <LinkCreatedModal link={createdLink} onClose={() => setCreatedLink(null)} />
      )}
    </div>
  )
}
