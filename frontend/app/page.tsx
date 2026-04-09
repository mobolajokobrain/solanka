'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

// ── Navbar ────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-sol-dark/90 backdrop-blur-xl border-b border-sol-border' : ''
    }`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-sol-gradient flex items-center justify-center text-sm font-bold text-black">S</div>
          <span className="font-bold text-lg tracking-tight">Solanka</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="#sdk" className="hover:text-white transition-colors">SDK</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="https://solanka-production.up.railway.app/docs" target="_blank"
             className="hover:text-white transition-colors">API Docs</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard"
            className="hidden md:block text-sm text-gray-300 hover:text-white transition-colors">
            Dashboard
          </Link>
          <Link href="/dashboard"
            className="text-sm px-4 py-2 rounded-xl bg-sol-gradient text-black font-semibold hover:opacity-90 transition-opacity">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  )
}

// ── Hero ──────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Orb backgrounds */}
      <div className="orb w-[600px] h-[600px] bg-[#9945FF] opacity-10 top-[-100px] left-[-200px]" />
      <div className="orb w-[500px] h-[500px] bg-[#14F195] opacity-8 bottom-[-100px] right-[-150px]" />
      <div className="orb w-[300px] h-[300px] bg-[#9945FF] opacity-8 top-[40%] right-[10%]" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left */}
        <div className="animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-[#9945FF]/30 text-xs text-[#9945FF] font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#14F195] animate-pulse-slow" />
            Built for Nigeria · Powered by Solana
          </div>

          <h1 className="text-5xl lg:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            Yours,{' '}
            <span className="gradient-text">on Solana</span>
          </h1>

          <p className="text-lg text-gray-400 leading-relaxed mb-8 max-w-lg">
            The payment toolkit African businesses deserve. Accept USDC, display live Naira rates, and integrate Solana payments with a Python SDK — in minutes.
          </p>

          <div className="flex flex-wrap gap-4 mb-12">
            <Link href="/dashboard"
              className="px-6 py-3.5 rounded-xl bg-sol-gradient text-black font-semibold text-sm hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]">
              Create Payment Link →
            </Link>
            <a href="https://solanka-production.up.railway.app/docs" target="_blank"
              className="px-6 py-3.5 rounded-xl glass border border-sol-border text-white font-semibold text-sm hover:border-[#9945FF]/40 transition-all hover:scale-[1.02]">
              View API Docs
            </a>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-8">
            {[
              { value: '<0.001', unit: 'SOL', label: 'per transaction' },
              { value: '400ms', unit: '', label: 'settlement time' },
              { value: 'Live', unit: '₦', label: 'NGN rates' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-2xl font-bold text-white">
                  {stat.value}<span className="gradient-text">{stat.unit}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Mock payment card */}
        <div className="relative flex justify-center animate-float">
          <div className="relative w-80">
            {/* Card glow */}
            <div className="absolute inset-0 bg-sol-gradient opacity-20 blur-3xl rounded-3xl scale-110" />

            {/* Payment card */}
            <div className="relative gradient-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-sol-gradient flex items-center justify-center text-xs font-bold text-black">S</div>
                  <span className="text-sm font-semibold">Solanka Pay</span>
                </div>
                <span className="text-xs bg-[#14F195]/10 text-[#14F195] border border-[#14F195]/20 px-2 py-1 rounded-full">● Live</span>
              </div>

              <div className="text-center py-4">
                <div className="text-3xl font-black mb-1">50.00 USDC</div>
                <div className="text-[#14F195] text-sm font-medium">≈ ₦82,500.00</div>
                <div className="text-xs text-gray-500 mt-1">Invoice #001 — Web Design</div>
              </div>

              {/* Fake QR */}
              <div className="bg-white rounded-xl p-3 mx-auto w-36 h-36 flex items-center justify-center">
                <div className="grid grid-cols-5 gap-0.5">
                  {Array.from({length: 25}).map((_, i) => (
                    <div key={i} className={`w-5 h-5 rounded-sm ${
                      [0,1,2,3,4,5,9,10,14,15,19,20,21,22,23,24,7,12,17].includes(i)
                      ? 'bg-black' : 'bg-white'
                    }`} />
                  ))}
                </div>
              </div>

              <div className="text-xs text-gray-500 text-center font-mono truncate">
                Dv3x...9kPa
              </div>

              <button className="w-full py-2.5 rounded-xl bg-sol-gradient text-black text-sm font-bold">
                I've sent the payment →
              </button>
            </div>

            {/* Floating badges */}
            <div className="absolute -left-10 top-8 glass rounded-xl px-3 py-2 text-xs font-medium border border-sol-border animate-float" style={{animationDelay: '1s'}}>
              ⚡ 400ms settlement
            </div>
            <div className="absolute -right-8 bottom-12 glass rounded-xl px-3 py-2 text-xs font-medium border border-[#14F195]/20 text-[#14F195] animate-float" style={{animationDelay: '2s'}}>
              ✓ Verified on-chain
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Features ──────────────────────────────────────────────
const features = [
  {
    icon: '🔗',
    title: 'Payment Links',
    desc: 'Generate shareable payment links in seconds. Fixed or open amounts. QR code included. Merchants get paid in USDC.',
    tag: 'Merchants',
    color: '#9945FF',
  },
  {
    icon: '🐍',
    title: 'Python SDK',
    desc: 'pip install solanka. Async-first, typed, Pythonic. Works with FastAPI, Django, Flask. Both async and sync clients.',
    tag: 'Developers',
    color: '#14F195',
  },
  {
    icon: '💱',
    title: 'Live NGN Rates',
    desc: 'Every USDC amount shows its Naira equivalent in real-time via live Binance feeds. No stale prices.',
    tag: 'Nigeria',
    color: '#9945FF',
  },
  {
    icon: '📱',
    title: 'Solana Pay QR',
    desc: 'QR codes that open directly in Phantom and Solflare. One scan, one tap, paid. In-person and online.',
    tag: 'Checkout',
    color: '#14F195',
  },
  {
    icon: '🔒',
    title: 'On-chain Verify',
    desc: 'Transaction verification checks postTokenBalances — confirming the receiver got USDC, with exact amount matching.',
    tag: 'Security',
    color: '#9945FF',
  },
  {
    icon: '📊',
    title: 'REST API',
    desc: 'Clean OpenAPI-documented endpoints for wallets, rates, payments, and transactions. Hackathon-ready, production-grade.',
    tag: 'API',
    color: '#14F195',
  },
]

function Features() {
  return (
    <section id="features" className="py-28 relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-sol-border text-xs text-gray-400 font-medium mb-4">
            Everything you need
          </div>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight mb-4">
            Built for Africa,<br />
            <span className="gradient-text">powered by Solana</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            From payment links to a full Python SDK — every layer of Solanka is designed for Nigerian developers and merchants.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={i} className="glass glass-hover rounded-2xl p-6 group cursor-default">
              <div className="text-3xl mb-4">{f.icon}</div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-lg font-bold">{f.title}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: `${f.color}18`, color: f.color, border: `1px solid ${f.color}30` }}>
                  {f.tag}
                </span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── How it works ──────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Create a payment link',
      desc: 'Enter your Solana wallet, set an amount in USDC (or leave open), and add a description. Done in 10 seconds.',
      code: 'POST /api/v1/payments/link',
    },
    {
      num: '02',
      title: 'Share it with your customer',
      desc: 'Send the link or let them scan the QR code. Customers see the amount in both USDC and live Nigerian Naira.',
      code: 'solanka.app/pay/aB3xK9',
    },
    {
      num: '03',
      title: 'Get paid. On-chain verified.',
      desc: 'Payment lands in your Solana wallet as USDC. Solanka verifies on-chain and records the transaction.',
      code: '✓ Confirmed · 400ms',
    },
  ]

  return (
    <section id="how-it-works" className="py-28 relative">
      <div className="orb w-[400px] h-[400px] bg-[#9945FF] opacity-[0.06] top-0 right-0" />
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight mb-4">
            Simple as <span className="gradient-text">1, 2, 3</span>
          </h2>
          <p className="text-gray-400 text-lg">No bank accounts. No 5-day waits. No 10% fees.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[60%] right-0 h-px bg-gradient-to-r from-[#9945FF]/40 to-transparent" />
              )}
              <div className="glass rounded-2xl p-7 h-full">
                <div className="text-5xl font-black gradient-text mb-6">{step.num}</div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-5">{step.desc}</p>
                <div className="code-block text-xs bg-black/40 rounded-lg px-3 py-2 text-[#14F195] border border-sol-border">
                  {step.code}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── SDK Showcase ──────────────────────────────────────────
function SDKShowcase() {
  const code = `from sdk import Solanka
import asyncio

client = Solanka()

async def main():
    # Live NGN rate
    rate = await client.rates.ngn()
    print(f"1 USDC = ₦{rate:,.2f}")

    # Create payment link
    link = await client.payments.create_link(
        merchant_wallet="YourSolanaWallet",
        amount_usdc=50.0,
        description="Invoice #001",
    )
    print(link.payment_url)
    # → https://solanka.app/pay/aB3xK9

    # Wallet balance (SOL + USDC + NGN)
    bal = await client.wallet.balance("YourWallet")
    print(f"USDC: {bal.usdc.balance}")
    print(f"  ≈ ₦{bal.usdc.ngn_equivalent:,.2f}")

asyncio.run(main())`

  return (
    <section id="sdk" className="py-28">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#9945FF]/10 border border-[#9945FF]/20 text-xs text-[#9945FF] font-medium mb-6">
              🐍 Python SDK
            </div>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight mb-6">
              Built for<br />
              <span className="gradient-text">Python developers</span>
            </h2>
            <p className="text-gray-400 leading-relaxed mb-8">
              Nigerian developers build with Python. Solanka speaks their language — async-first, fully typed, with both async and sync clients.
            </p>
            <div className="space-y-4">
              {[
                { label: 'Async + Sync', desc: 'Works with FastAPI, Django, Flask, or plain scripts' },
                { label: 'Typed models', desc: 'Pydantic response models — autocomplete in your IDE' },
                { label: 'Error handling', desc: 'SolankaAPIError, NetworkError, VerificationError — all typed' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#14F195]/20 border border-[#14F195]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-[#14F195]" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white">{item.label}</span>
                    <span className="text-sm text-gray-400"> — {item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — code block */}
          <div className="relative">
            <div className="absolute inset-0 bg-[#9945FF] opacity-10 blur-3xl rounded-3xl" />
            <div className="relative glass rounded-2xl overflow-hidden border border-sol-border">
              {/* Window chrome */}
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-sol-border bg-black/20">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                <div className="w-3 h-3 rounded-full bg-[#28C840]" />
                <span className="ml-3 text-xs text-gray-500 font-mono">main.py</span>
              </div>
              <pre className="code-block p-5 overflow-x-auto text-[12px]">
                {code.split('\n').map((line, i) => (
                  <div key={i} className="flex">
                    <span className="text-gray-600 w-6 text-right mr-4 select-none flex-shrink-0">{i + 1}</span>
                    <span className={
                      line.startsWith('from') || line.startsWith('import') ? 'text-[#C792EA]' :
                      line.startsWith('    #') || line.startsWith('#') ? 'text-[#546E7A]' :
                      line.includes('await') ? 'text-[#82AAFF]' :
                      line.includes('print') ? 'text-[#FFCB6B]' :
                      line.includes('→') || line.includes('# →') ? 'text-[#546E7A]' :
                      line.startsWith('async') || line.startsWith('def') ? 'text-[#C3E88D]' :
                      'text-gray-300'
                    }>{line || ' '}</span>
                  </div>
                ))}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Pricing ───────────────────────────────────────────────
function Pricing() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      desc: 'Perfect for testing and side projects',
      features: ['100 API calls/day', 'Payment links', 'NGN conversion', 'Community support'],
      cta: 'Start free',
      highlight: false,
    },
    {
      name: 'Pro',
      price: '$29',
      period: '/month',
      desc: 'For growing Nigerian businesses',
      features: ['Unlimited API calls', 'Priority RPC node', 'Webhook support', 'Transaction analytics', 'Email support'],
      cta: 'Get Pro',
      highlight: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      desc: 'For fintechs and neobanks',
      features: ['White-label SDK', 'Dedicated infrastructure', 'Custom integrations', 'SLA + 24/7 support', 'Regulatory compliance'],
      cta: 'Contact us',
      highlight: false,
    },
  ]

  return (
    <section id="pricing" className="py-28">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight mb-4">
            Simple <span className="gradient-text">pricing</span>
          </h2>
          <p className="text-gray-400 text-lg">0.5% per transaction. No hidden fees.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <div key={i} className={`rounded-2xl p-7 flex flex-col ${
              plan.highlight
                ? 'gradient-border relative'
                : 'glass border border-sol-border'
            }`}>
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-sol-gradient text-black text-xs font-bold">
                  Most popular
                </div>
              )}
              <div className="mb-6">
                <div className="text-sm text-gray-400 font-medium mb-2">{plan.name}</div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-black">{plan.price}</span>
                  <span className="text-gray-400 text-sm">{plan.period}</span>
                </div>
                <p className="text-gray-400 text-sm">{plan.desc}</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <span className="text-[#14F195]">✓</span> {f}
                  </li>
                ))}
              </ul>

              <button className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                plan.highlight
                  ? 'bg-sol-gradient text-black hover:opacity-90'
                  : 'glass border border-sol-border hover:border-[#9945FF]/40 text-white'
              }`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CTA Banner ────────────────────────────────────────────
function CTABanner() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-sol-gradient opacity-90" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiIG9wYWNpdHk9IjAuMDUiLz48L3N2Zz4=')] opacity-40" />
          <div className="relative px-10 py-16 text-center">
            <h2 className="text-4xl lg:text-5xl font-black text-black mb-4 tracking-tight">
              The cowrie shell was Africa's<br />original currency.
            </h2>
            <p className="text-black/70 text-lg mb-8 max-w-lg mx-auto">
              Solanka carries that legacy forward — building next-generation African financial infrastructure on the fastest blockchain in the world.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/dashboard"
                className="px-7 py-3.5 rounded-xl bg-black text-white font-semibold text-sm hover:bg-gray-900 transition-colors">
                Start building →
              </Link>
              <a href="https://solanka-production.up.railway.app/docs" target="_blank"
                className="px-7 py-3.5 rounded-xl bg-black/20 border border-black/20 text-black font-semibold text-sm hover:bg-black/30 transition-colors">
                Explore the API
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-sol-border py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-10 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-sol-gradient flex items-center justify-center text-xs font-bold text-black">S</div>
              <span className="font-bold">Solanka</span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              Solana-powered payment toolkit for African businesses.
            </p>
          </div>
          {[
            { title: 'Product', links: ['Payment Links', 'Python SDK', 'API Docs', 'Dashboard'] },
            { title: 'Developers', links: ['REST API', 'SDK Reference', 'Examples', 'GitHub'] },
            { title: 'Company', links: ['About', 'Hackathon', 'SuperteamNG', 'Contact'] },
          ].map((col, i) => (
            <div key={i}>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{col.title}</div>
              <ul className="space-y-2.5">
                {col.links.map((link, j) => (
                  <li key={j}>
                    <a href="#" className="text-sm text-gray-500 hover:text-white transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-sol-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-sm">
            © 2026 Solanka · Built by Adebayo Olalere · Colosseum Frontier Hackathon
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>Powered by</span>
            <span className="gradient-text font-semibold">Solana</span>
            <span>·</span>
            <span>SuperteamNG</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ── Page ──────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <SDKShowcase />
      <Pricing />
      <CTABanner />
      <Footer />
    </main>
  )
}
