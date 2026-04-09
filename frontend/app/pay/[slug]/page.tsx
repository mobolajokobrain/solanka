'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { getPaymentLink, verifyPayment, getQRUrl, formatNGN } from '@/lib/api'

type Screen = 'loading' | 'error' | 'pay' | 'verify' | 'success'

export default function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>()
  const [screen, setScreen] = useState<Screen>('loading')
  const [link, setLink] = useState<any>(null)
  const [error, setError] = useState('')
  const [signature, setSignature] = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!slug) { setError('No payment link specified'); setScreen('error'); return }
    getPaymentLink(slug)
      .then(data => { setLink(data); setScreen('pay') })
      .catch(e => { setError(e.message); setScreen('error') })
  }, [slug])

  async function handleVerify() {
    if (!signature.trim()) { setVerifyError('Paste your transaction signature'); return }
    setVerifyError('')
    setVerifying(true)
    try {
      const res = await verifyPayment({ signature: signature.trim(), payment_link_id: link.id })
      setResult(res)
      setScreen('success')
    } catch (e: any) {
      setVerifyError(e.message)
    } finally {
      setVerifying(false)
    }
  }

  function copyAddress() {
    if (!link?.merchant_wallet) return
    navigator.clipboard.writeText(link.merchant_wallet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-sol-dark flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="orb w-[500px] h-[500px] bg-[#9945FF] opacity-[0.07] top-[-100px] left-[-150px]" />
      <div className="orb w-[400px] h-[400px] bg-[#14F195] opacity-[0.05] bottom-[-100px] right-[-100px]" />

      {/* Loading */}
      {screen === 'loading' && (
        <div className="text-center animate-fade-in">
          <div className="w-12 h-12 border-4 border-[#9945FF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading payment...</p>
        </div>
      )}

      {/* Error */}
      {screen === 'error' && (
        <div className="text-center max-w-sm animate-slide-up">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠</span>
          </div>
          <h2 className="text-xl font-bold mb-2">Payment not found</h2>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      )}

      {/* Pay screen */}
      {screen === 'pay' && link && (
        <div className="w-full max-w-sm animate-slide-up">
          <div className="relative">
            <div className="absolute inset-0 bg-[#9945FF] opacity-10 blur-3xl rounded-3xl" />
            <div className="relative glass rounded-2xl overflow-hidden border border-sol-border shadow-2xl">

              {/* Header strip */}
              <div className="h-1 bg-sol-gradient" />

              <div className="p-6 space-y-5">
                {/* Merchant info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-sol-gradient flex items-center justify-center text-sm font-bold text-black">S</div>
                    <div>
                      <div className="text-sm font-semibold">Solanka Pay</div>
                      <div className="text-xs text-gray-500">Secure · On-chain</div>
                    </div>
                  </div>
                  <span className="text-xs bg-[#14F195]/10 text-[#14F195] border border-[#14F195]/20 px-2.5 py-1 rounded-full font-medium">
                    ● Live
                  </span>
                </div>

                {/* Label & description */}
                <div>
                  <h2 className="font-bold text-lg leading-tight">{link.label || 'Payment Request'}</h2>
                  {link.description && <p className="text-gray-400 text-sm mt-1">{link.description}</p>}
                </div>

                {/* Amount */}
                <div className="bg-black/30 border border-sol-border rounded-2xl p-5 text-center">
                  {link.amount_usdc ? (
                    <>
                      <div className="text-4xl font-black mb-1.5">{link.amount_usdc} <span className="text-gray-400 text-2xl">USDC</span></div>
                      {link.ngn_equivalent && (
                        <div className="text-[#14F195] text-base font-semibold">
                          ≈ {formatNGN(link.ngn_equivalent.ngn_amount)}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-gray-400 text-lg">Open amount — send any amount</div>
                  )}
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center gap-3">
                  <p className="text-xs text-gray-500 uppercase tracking-widest">Scan with Phantom or Solflare</p>
                  <div className="bg-white p-3 rounded-2xl glow-purple">
                    <img src={getQRUrl(slug)} alt="Solana Pay QR" className="w-52 h-52" />
                  </div>
                  <a href={link.solana_pay_url} target="_blank"
                    className="text-xs text-[#9945FF] hover:text-[#b066ff] underline underline-offset-2 transition-colors">
                    Open in wallet app →
                  </a>
                </div>

                {/* Wallet address */}
                <button onClick={copyAddress}
                  className="w-full glass border border-sol-border rounded-xl px-4 py-3 flex items-center gap-3 hover:border-[#9945FF]/30 transition-colors text-left">
                  <div className="w-7 h-7 rounded-full bg-sol-gradient flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500">Receiving wallet</div>
                    <div className="text-xs font-mono text-gray-300 truncate">{link.merchant_wallet}</div>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">{copied ? '✓' : 'Copy'}</span>
                </button>

                <button onClick={() => setScreen('verify')}
                  className="w-full py-3.5 rounded-xl bg-sol-gradient text-black font-bold text-sm hover:opacity-90 transition-all hover:scale-[1.01] active:scale-[0.99]">
                  I've sent the payment →
                </button>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-gray-600 mt-4">
            Powered by <span className="text-[#9945FF]">Solanka</span> · Solana · USDC
          </p>
        </div>
      )}

      {/* Verify screen */}
      {screen === 'verify' && (
        <div className="w-full max-w-sm animate-slide-up">
          <div className="glass rounded-2xl border border-sol-border shadow-2xl overflow-hidden">
            <div className="h-1 bg-sol-gradient" />
            <div className="p-6 space-y-5">
              <div className="text-center">
                <div className="text-4xl mb-3">🔍</div>
                <h2 className="text-lg font-bold">Confirm payment</h2>
                <p className="text-gray-400 text-sm mt-1">Paste your Solana transaction signature</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Transaction Signature</label>
                <textarea
                  value={signature}
                  onChange={e => setSignature(e.target.value)}
                  placeholder="5Kj3xYmAbCdEfGh..."
                  rows={3}
                  className="w-full bg-black/30 border border-sol-border rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#9945FF]/60 transition-colors resize-none"
                />
              </div>

              {verifyError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {verifyError}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => { setScreen('pay'); setVerifyError('') }}
                  className="flex-1 py-3 rounded-xl glass border border-sol-border text-sm font-semibold hover:border-[#9945FF]/30 transition-colors">
                  ← Back
                </button>
                <button onClick={handleVerify} disabled={verifying}
                  className="flex-1 py-3 rounded-xl bg-sol-gradient text-black font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                  {verifying ? 'Verifying...' : 'Verify →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success screen */}
      {screen === 'success' && result && (
        <div className="w-full max-w-sm text-center animate-slide-up">
          <div className="glass rounded-2xl border border-[#14F195]/20 shadow-2xl overflow-hidden">
            <div className="h-1 bg-[#14F195]" />
            <div className="p-8 space-y-5">
              <div className="w-20 h-20 bg-[#14F195]/10 border-2 border-[#14F195]/30 rounded-full flex items-center justify-center mx-auto"
                style={{ boxShadow: '0 0 40px rgba(20, 241, 149, 0.2)' }}>
                <span className="text-4xl">✓</span>
              </div>

              <div>
                <h2 className="text-2xl font-black text-white">Payment confirmed!</h2>
                <p className="text-[#14F195] font-semibold text-lg mt-1">
                  {result.usdc_received ?? link?.amount_usdc ?? '—'} USDC received
                </p>
              </div>

              <div className="glass rounded-xl p-4 text-left space-y-3">
                {[
                  { label: 'Signature', value: result.signature ? `${result.signature.slice(0, 16)}...` : '—' },
                  { label: 'USDC received', value: `${result.usdc_received ?? '—'} USDC` },
                  { label: 'Status', value: 'Confirmed ✓', green: true },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-mono">{row.label}</span>
                    <span className={`text-xs font-mono ${row.green ? 'text-[#14F195]' : 'text-gray-300'}`}>{row.value}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => window.location.reload()}
                className="w-full py-3 rounded-xl glass border border-sol-border text-sm text-gray-400 hover:text-white hover:border-[#9945FF]/30 transition-all">
                New payment
              </button>
            </div>
          </div>
          <p className="text-center text-xs text-gray-600 mt-4">
            Powered by <span className="text-[#9945FF]">Solanka</span> · Solana · USDC
          </p>
        </div>
      )}
    </div>
  )
}
