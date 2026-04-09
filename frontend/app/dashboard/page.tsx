'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createPaymentLink, getTransactions, getNGNRate, formatNGN, shortenAddress, getQRUrl } from '@/lib/api'

// ── Sidebar ───────────────────────────────────────────────
function Sidebar({ active }: { active: string }) {
  const nav = [
    { icon: '◈', label: 'Overview', href: '/dashboard' },
    { icon: '🔗', label: 'Payment Links', href: '/dashboard' },
    { icon: '📊', label: 'Transactions', href: '/dashboard' },
    { icon: '💰', label: 'Wallet', href: '/dashboard' },
    { icon: '⚙', label: 'Settings', href: '/dashboard' },
  ]
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
      <div className="p-4 border-t border-sol-border">
        <div className="glass rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sol-gradient flex items-center justify-center text-xs font-bold text-black flex-shrink-0">A</div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">Adebayo Olalere</div>
            <div className="text-xs text-gray-500">Merchant</div>
          </div>
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
function CreateLinkModal({ onClose, onCreated }: { onClose: () => void; onCreated: (link: any) => void }) {
  const [form, setForm] = useState({ merchant_wallet: '', amount_usdc: '', description: '', label: '' })
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
    } catch (e: any) {
      setError(e.message)
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
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1.5">Amount (USDC)</label>
            <input
              type="number"
              step="0.01"
              min="0"
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
          {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{error}</div>}
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
function LinkCreatedModal({ link, onClose }: { link: any; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  function copy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
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
                {link.payment_url}
              </div>
              <button onClick={() => copy(link.payment_url)}
                className="px-3 py-2.5 rounded-xl bg-[#9945FF]/20 border border-[#9945FF]/30 text-[#9945FF] text-xs font-medium hover:bg-[#9945FF]/30 transition-colors whitespace-nowrap">
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center bg-white rounded-xl p-4">
            <img src={getQRUrl(link.slug)} alt="QR Code" className="w-40 h-40" />
          </div>

          {link.amount_usdc && (
            <div className="glass rounded-xl p-4 text-center">
              <div className="text-2xl font-black">{link.amount_usdc} USDC</div>
              {link.ngn_equivalent && (
                <div className="text-[#14F195] text-sm mt-1">≈ {formatNGN(link.ngn_equivalent.ngn_amount)}</div>
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
  const [showCreate, setShowCreate] = useState(false)
  const [createdLink, setCreatedLink] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [ngnRate, setNgnRate] = useState<number | null>(null)
  const [links, setLinks] = useState<any[]>([])

  useEffect(() => {
    getNGNRate().then(d => setNgnRate(d.rate)).catch(() => {})
    getTransactions().then(d => setTransactions(d.transactions || [])).catch(() => {})
  }, [])

  function onLinkCreated(link: any) {
    setCreatedLink(link)
    setLinks(prev => [link, ...prev])
  }

  const totalUSDC = transactions.reduce((s, t) => s + (t.amount_usdc || 0), 0)

  return (
    <div className="min-h-screen flex bg-sol-dark">
      <Sidebar active="overview" />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="border-b border-sol-border px-8 py-5 flex items-center justify-between sticky top-0 bg-sol-dark/80 backdrop-blur-xl z-10">
          <div>
            <h1 className="text-xl font-bold">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {ngnRate ? `1 USDC = ₦${ngnRate.toLocaleString()}` : 'Loading rates...'}
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
            <StatCard label="Active Links" value={String(links.length)}
              sub="Created this session" color="#9945FF" />
            <StatCard label="NGN Rate" value={ngnRate ? `₦${ngnRate.toLocaleString()}` : '...'}
              sub="per USDC · Live Binance" color="#14F195" />
          </div>

          {/* Recent links created this session */}
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
                      <div className="text-sm font-medium">{link.label}</div>
                      <div className="text-xs text-gray-500 font-mono truncate">{link.slug}</div>
                    </div>
                    {link.amount_usdc && (
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold">{link.amount_usdc} USDC</div>
                        {link.ngn_equivalent && (
                          <div className="text-xs text-[#14F195]">≈ {formatNGN(link.ngn_equivalent.ngn_amount)}</div>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2 flex-shrink-0">
                      <a href={link.payment_url} target="_blank"
                        className="px-3 py-1.5 rounded-lg bg-[#9945FF]/10 border border-[#9945FF]/20 text-[#9945FF] text-xs font-medium hover:bg-[#9945FF]/20 transition-colors">
                        Open
                      </a>
                      <button onClick={() => { setCreatedLink(link) }}
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
                            {tx.signature ? `${tx.signature.slice(0, 8)}...` : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm font-semibold">{tx.amount_usdc ?? '—'} USDC</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-[#14F195]">
                            {tx.amount_ngn ? formatNGN(tx.amount_ngn) : ngnRate && tx.amount_usdc ? formatNGN(tx.amount_usdc * ngnRate) : '—'}
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
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs text-gray-500">
                            {tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-NG') : '—'}
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
        <CreateLinkModal onClose={() => setShowCreate(false)} onCreated={onLinkCreated} />
      )}
      {createdLink && (
        <LinkCreatedModal link={createdLink} onClose={() => setCreatedLink(null)} />
      )}
    </div>
  )
}
