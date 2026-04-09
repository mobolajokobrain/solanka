"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMe, updateProfile, submitKYC, acceptTerms } from "@/lib/api";

type Step = "profile" | "kyc" | "terms" | "done";

const STEPS: { id: Step; label: string }[] = [
  { id: "profile", label: "Your Profile" },
  { id: "kyc",     label: "Verify Identity" },
  { id: "terms",   label: "Terms & Conditions" },
];

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center justify-center gap-2 mb-10">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
            i < idx
              ? "bg-sol-mint text-black"
              : i === idx
              ? "bg-gradient-to-br from-sol-purple to-sol-mint text-white ring-2 ring-sol-mint/30"
              : "bg-white/10 text-white/30"
          }`}>
            {i < idx ? "✓" : i + 1}
          </div>
          <span className={`text-xs hidden sm:block ${i === idx ? "text-white font-medium" : "text-white/30"}`}>
            {step.label}
          </span>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-px ${i < idx ? "bg-sol-mint" : "bg-white/10"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Step 1: Profile ───────────────────────────────────────
function ProfileStep({ onNext }: { onNext: () => void }) {
  const [phone, setPhone] = useState("");
  const [wallet, setWallet] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!phone) { setError("Phone number is required"); return; }
    setLoading(true);
    try {
      await updateProfile({ phone, solana_wallet: wallet || undefined });
      onNext();
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sol-purple/20 to-sol-mint/20 border border-sol-purple/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">👤</span>
        </div>
        <h2 className="text-xl font-bold text-white">Complete your profile</h2>
        <p className="text-white/50 text-sm mt-1">Required for your Solanka merchant account</p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-white/70 mb-1.5">Phone Number *</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          placeholder="+234 801 234 5678"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-sol-purple/60 transition-all"
        />
        <p className="text-xs text-white/30 mt-1">Used for account recovery and payment notifications</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-white/70 mb-1.5">
          Solana Wallet <span className="text-white/30 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={wallet}
          onChange={(e) => setWallet(e.target.value)}
          placeholder="Your Solana wallet address"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-sol-purple/60 transition-all font-mono text-sm"
        />
        <p className="text-xs text-white/30 mt-1">Funds go here. You can add this later in settings.</p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-sol-purple to-sol-mint text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Saving…
          </>
        ) : "Save & Continue →"}
      </button>
    </form>
  );
}

// ── Step 2: KYC ───────────────────────────────────────────
function KYCStep({ onNext }: { onNext: () => void }) {
  const [kycType, setKycType] = useState<"bvn" | "nin">("bvn");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (value.length !== 11 || !value.match(/^\d+$/)) {
      setError(`${kycType.toUpperCase()} must be exactly 11 digits`);
      return;
    }
    setLoading(true);
    try {
      await submitKYC(kycType, value);
      setVerified(true);
      setTimeout(onNext, 1500);
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  if (verified) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-sol-mint/10 border-2 border-sol-mint/40 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Identity Verified!</h3>
        <p className="text-white/50 text-sm">Proceeding to Terms & Conditions…</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sol-purple/20 to-sol-mint/20 border border-sol-purple/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔍</span>
        </div>
        <h2 className="text-xl font-bold text-white">Verify your identity</h2>
        <p className="text-white/50 text-sm mt-1">
          Required by Nigerian regulations for payment processing
        </p>
      </div>

      {/* Provider badge */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
        <div className="w-8 h-8 rounded-lg bg-[#0066FF]/20 border border-[#0066FF]/30 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-[#0066FF]">D</span>
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-white">Powered by Dojah</div>
          <div className="text-xs text-white/40">Nigerian identity verification — BVN & NIN</div>
        </div>
        <a href="https://dojah.io" target="_blank" className="text-xs text-white/30 hover:text-white/60 flex-shrink-0">
          Learn more →
        </a>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {/* KYC type selector */}
      <div>
        <label className="block text-sm font-medium text-white/70 mb-2">Verification method</label>
        <div className="grid grid-cols-2 gap-2">
          {(["bvn", "nin"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setKycType(t); setValue(""); }}
              className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                kycType === t
                  ? "bg-sol-purple/20 border-sol-purple/60 text-sol-purple"
                  : "bg-white/5 border-white/10 text-white/50 hover:border-white/20"
              }`}
            >
              {t === "bvn" ? "🏦 BVN" : "🪪 NIN"}
            </button>
          ))}
        </div>
        <p className="text-xs text-white/30 mt-2">
          {kycType === "bvn"
            ? "Bank Verification Number — 11 digits, linked to your bank account"
            : "National Identification Number — 11 digits, from your NIN slip or NIMC app"}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-white/70 mb-1.5">
          Enter your {kycType.toUpperCase()}
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={11}
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 11))}
          required
          placeholder={`11-digit ${kycType.toUpperCase()}`}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-sol-purple/60 transition-all font-mono tracking-widest text-center text-lg"
        />
        <div className="flex justify-between mt-1">
          <p className="text-xs text-white/30">Your number is encrypted and never stored in full</p>
          <p className="text-xs text-white/30">{value.length}/11</p>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <p className="text-xs text-amber-400/80">
          🔒 Your BVN/NIN is transmitted securely to Dojah and only the last 4 digits are stored on our servers. We never sell your data.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || value.length !== 11}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-sol-purple to-sol-mint text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Verifying…
          </>
        ) : `Verify ${kycType.toUpperCase()} →`}
      </button>
    </form>
  );
}

// ── Step 3: Terms ─────────────────────────────────────────
function TermsStep({ onComplete }: { onComplete: () => void }) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) { setError("You must accept the Terms & Conditions to continue"); return; }
    setLoading(true);
    try {
      await acceptTerms();
      onComplete();
    } catch (err: unknown) {
      setError((err as { message?: string }).message || "Failed to accept terms");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sol-purple/20 to-sol-mint/20 border border-sol-purple/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📋</span>
        </div>
        <h2 className="text-xl font-bold text-white">Terms & Conditions</h2>
        <p className="text-white/50 text-sm mt-1">Please read and accept before using Solanka</p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {/* T&C scroll box */}
      <div className="h-64 overflow-y-auto rounded-xl bg-black/30 border border-white/10 p-4 text-xs text-white/60 leading-relaxed space-y-3 scrollbar-thin">
        <p className="text-white/80 font-semibold text-sm">Solanka Terms of Service — v1.0</p>
        <p>Last updated: April 2026</p>

        <p className="text-white/70 font-medium">1. Acceptance of Terms</p>
        <p>By creating a Solanka account, you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree, you may not use Solanka.</p>

        <p className="text-white/70 font-medium">2. Eligibility</p>
        <p>You must be at least 18 years old and reside in Nigeria or another jurisdiction where Solanka services are available. By using Solanka, you represent that you meet these requirements.</p>

        <p className="text-white/70 font-medium">3. Identity Verification (KYC)</p>
        <p>Solanka is required by law to verify the identity of all merchants. You must provide accurate BVN or NIN information. Providing false information is a violation of these Terms and may be a criminal offence under Nigerian law.</p>

        <p className="text-white/70 font-medium">4. Payment Processing</p>
        <p>Solanka facilitates USDC payments on the Solana blockchain. All transactions are final and irreversible once confirmed on-chain. Solanka does not hold customer funds — payments go directly to your specified wallet address.</p>

        <p className="text-white/70 font-medium">5. Prohibited Activities</p>
        <p>You may not use Solanka for: money laundering, terrorist financing, fraud, illegal gambling, sale of prohibited goods, or any activity that violates applicable Nigerian or international law.</p>

        <p className="text-white/70 font-medium">6. Fees</p>
        <p>Solanka may charge a service fee on transactions. Current fees are displayed in the dashboard. We reserve the right to update fees with 30 days notice.</p>

        <p className="text-white/70 font-medium">7. Data Privacy</p>
        <p>We collect and process your personal data in accordance with the Nigeria Data Protection Regulation (NDPR). Your BVN/NIN is transmitted securely to our KYC partner (Dojah) and only the last 4 digits are stored. We never sell your data to third parties.</p>

        <p className="text-white/70 font-medium">8. Limitation of Liability</p>
        <p>Solanka is not liable for losses resulting from: blockchain network failures, market volatility in USDC value, unauthorised access due to compromised credentials, or third-party service outages.</p>

        <p className="text-white/70 font-medium">9. Account Termination</p>
        <p>We reserve the right to suspend or terminate accounts that violate these Terms, are involved in fraudulent activity, or are required to be suspended by a regulatory authority.</p>

        <p className="text-white/70 font-medium">10. Governing Law</p>
        <p>These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be resolved in the courts of Lagos State, Nigeria.</p>

        <p className="text-white/70 font-medium">11. Changes to Terms</p>
        <p>We may update these Terms at any time. Continued use of Solanka after changes constitutes acceptance. We will notify you of significant changes via email.</p>

        <p className="text-white/70 font-medium">12. Contact</p>
        <p>For questions about these Terms, contact us at legal@solanka.io</p>
      </div>

      <div>
        <Link href="/terms" target="_blank" className="text-xs text-sol-mint hover:underline">
          View full Terms & Conditions →
        </Link>
      </div>

      {/* Acceptance checkbox */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all ${
          accepted ? "bg-sol-mint border-sol-mint" : "border-white/20 group-hover:border-sol-purple/60"
        }`}
          onClick={() => setAccepted(!accepted)}>
          {accepted && <span className="text-black text-xs font-bold">✓</span>}
        </div>
        <input type="checkbox" className="sr-only" checked={accepted} onChange={() => setAccepted(!accepted)} />
        <span className="text-sm text-white/70 leading-snug">
          I have read and agree to the{" "}
          <Link href="/terms" target="_blank" className="text-sol-mint hover:underline">
            Terms of Service
          </Link>{" "}
          and confirm that all information I have provided is accurate and truthful.
        </span>
      </label>

      <button
        type="submit"
        disabled={loading || !accepted}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-sol-purple to-sol-mint text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Accepting…
          </>
        ) : "Accept & Activate Account →"}
      </button>
    </form>
  );
}

// ── Done splash ───────────────────────────────────────────
function DoneStep() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.push("/dashboard"), 2500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sol-purple to-sol-mint flex items-center justify-center mx-auto mb-6 animate-pulse-slow">
        <span className="text-3xl">🎉</span>
      </div>
      <h2 className="text-2xl font-bold text-white mb-3">You&apos;re all set!</h2>
      <p className="text-white/50 text-sm mb-2">
        Your Solanka merchant account is now active.
      </p>
      <p className="text-white/30 text-xs">Redirecting to your dashboard…</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("profile");
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("solanka_token");
    if (!token) { router.replace("/auth/login"); return; }

    getMe()
      .then((u) => {
        if (u.is_onboarded) {
          router.replace("/dashboard");
        } else {
          setChecked(true);
        }
      })
      .catch(() => {
        router.replace("/auth/login");
      });
  }, [router]);

  if (!checked && step !== "done") {
    return (
      <div className="min-h-screen bg-sol-dark flex items-center justify-center">
        <div className="text-white/40">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sol-dark flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="orb w-[500px] h-[500px] bg-sol-purple/15 -top-32 -right-32" />
      <div className="orb w-[400px] h-[400px] bg-sol-mint/10 bottom-0 left-0" />

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sol-purple to-sol-mint flex items-center justify-center">
              <span className="text-white font-bold">S</span>
            </div>
            <span className="text-xl font-bold gradient-text">Solanka</span>
          </Link>
        </div>

        <StepIndicator current={step} />

        <div className="glass rounded-2xl p-8 gradient-border">
          {step === "profile" && <ProfileStep onNext={() => setStep("kyc")} />}
          {step === "kyc"     && <KYCStep     onNext={() => setStep("terms")} />}
          {step === "terms"   && <TermsStep   onComplete={() => setStep("done")} />}
          {step === "done"    && <DoneStep />}
        </div>

        {step !== "done" && (
          <p className="text-center text-white/30 text-xs mt-4">
            Step {STEPS.findIndex(s => s.id === step) + 1} of {STEPS.length}
          </p>
        )}
      </div>
    </div>
  );
}
