import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Solanka",
  description: "Solanka Terms of Service and User Agreement",
};

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: `By creating a Solanka account or using any Solanka service, you agree to be bound by these Terms of Service ("Terms"), our Privacy Policy, and all applicable Nigerian and international laws. If you do not agree, you may not use Solanka.`,
  },
  {
    title: "2. Eligibility",
    content: `You must be at least 18 years old to use Solanka. By registering, you represent that: (a) you are 18 or older, (b) you reside in Nigeria or a jurisdiction where Solanka operates, (c) you have the legal capacity to enter into these Terms, and (d) you are not prohibited from using financial services under applicable law.`,
  },
  {
    title: "3. Identity Verification (KYC)",
    content: `In compliance with the Central Bank of Nigeria (CBN) guidelines and anti-money laundering regulations, all merchants must complete identity verification. You must provide your Bank Verification Number (BVN) or National Identification Number (NIN). By submitting your BVN or NIN, you: (a) confirm the information is accurate and belongs to you, (b) authorise Solanka and its KYC partner (Dojah) to verify it, (c) understand that providing false information may constitute fraud under Nigerian law. We store only the last 4 digits of your identifier. Full numbers are processed by Dojah and not retained by Solanka.`,
  },
  {
    title: "4. Payment Processing",
    content: `Solanka facilitates cryptocurrency (USDC) payments on the Solana blockchain. Key terms: (a) All on-chain transactions are final and irreversible — we cannot reverse blockchain transactions once confirmed. (b) Solanka does not hold, custody, or control merchant funds — payments transfer directly from customer wallets to your specified Solana wallet. (c) Exchange rates displayed are indicative and sourced from third-party providers (Binance). (d) Solanka is not a money transmitter and does not operate a custodial wallet.`,
  },
  {
    title: "5. Prohibited Activities",
    content: `You must not use Solanka for: money laundering or terrorist financing; fraud, deception, or misrepresentation; illegal gambling or lottery services; sale of counterfeit goods, drugs, weapons, or any item illegal under Nigerian law; pornographic or adult content; pyramid schemes or multi-level marketing fraud; sanctions violations; or any activity that violates applicable law. Violations will result in immediate account termination and may be reported to relevant authorities including the EFCC.`,
  },
  {
    title: "6. Fees and Charges",
    content: `Solanka may charge service fees on transactions processed through our platform. Current fee schedules are displayed in your dashboard. We reserve the right to modify fees with 30 days' written notice via email. Blockchain network fees (gas fees) are separate and charged by the Solana network — Solanka does not profit from these.`,
  },
  {
    title: "7. API Usage",
    content: `Merchants and developers using the Solanka API or Python SDK must: (a) keep API keys confidential and rotate them immediately if compromised, (b) not use the API to exceed rate limits or degrade service for others, (c) not attempt to circumvent security controls, (d) comply with these Terms in all integrations. API misuse will result in key revocation and possible account termination.`,
  },
  {
    title: "8. Data Privacy",
    content: `We process your personal data in accordance with the Nigeria Data Protection Regulation (NDPR) 2019. We collect: name, email, phone number, BVN/NIN verification status (not the full number), and transaction records. We do not sell your personal data. We share data only with: Dojah (for KYC), Helius (for Solana RPC), Binance (for rate data), and regulatory authorities when legally required. You may request deletion of your account and data by contacting privacy@solanka.io.`,
  },
  {
    title: "9. Limitation of Liability",
    content: `To the maximum extent permitted by law, Solanka shall not be liable for: (a) losses from blockchain network failures, congestion, or forks, (b) market volatility in USDC, SOL, or Naira exchange rates, (c) losses from unauthorised account access due to compromised credentials, (d) third-party service outages (Helius, Binance, Dojah), (e) regulatory actions preventing service delivery, or (f) indirect or consequential damages. Our total liability shall not exceed the fees paid to Solanka in the 3 months preceding the claim.`,
  },
  {
    title: "10. Account Termination",
    content: `Solanka reserves the right to suspend or terminate accounts that: violate these Terms; are involved in fraudulent or illegal activity; receive chargeback or dispute rates above industry norms; or are required to be suspended by a regulatory authority such as the CBN or EFCC. Upon termination, you remain liable for any outstanding obligations.`,
  },
  {
    title: "11. Intellectual Property",
    content: `The Solanka name, logo, platform, API, and Python SDK are owned by Solanka. The SDK is released under the MIT License — see the repository for details. You may not use Solanka branding without written permission.`,
  },
  {
    title: "12. Governing Law & Dispute Resolution",
    content: `These Terms are governed by the laws of the Federal Republic of Nigeria. You agree to first attempt to resolve disputes by contacting legal@solanka.io. If unresolved within 30 days, disputes shall be submitted to arbitration under the Lagos Chamber of Commerce International Arbitration Centre (LCIAC) rules. The arbitration shall be conducted in Lagos, Nigeria, in the English language.`,
  },
  {
    title: "13. Changes to Terms",
    content: `We may update these Terms to reflect regulatory changes, new features, or other reasons. We will notify you via email at least 14 days before material changes take effect. Continued use of Solanka after the effective date constitutes acceptance of the revised Terms.`,
  },
  {
    title: "14. Contact Information",
    content: `Solanka\nLagos, Nigeria\nEmail: legal@solanka.io\nPrivacy: privacy@solanka.io\nSupport: support@solanka.io`,
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-sol-dark">
      {/* Navbar */}
      <nav className="border-b border-white/10 px-6 h-16 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sol-purple to-sol-mint flex items-center justify-center text-sm font-bold text-white">S</div>
          <span className="font-bold text-lg text-white">Solanka</span>
        </Link>
        <Link href="/auth/register" className="text-sm px-4 py-2 rounded-xl bg-gradient-to-r from-sol-purple to-sol-mint text-white font-semibold hover:opacity-90 transition-opacity">
          Get Started
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/50 mb-4">
            📋 Legal Document
          </div>
          <h1 className="text-4xl font-black text-white mb-3">Terms of Service</h1>
          <p className="text-white/50">
            Version 1.0 · Effective April 2026
          </p>
        </div>

        {/* Intro */}
        <div className="glass rounded-2xl p-6 mb-8 border-l-4 border-sol-purple">
          <p className="text-white/70 leading-relaxed">
            These Terms of Service govern your use of Solanka, a Solana-powered payment toolkit for African businesses. By using Solanka, you agree to these Terms. Please read them carefully — they contain important information about your rights and obligations.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="glass rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-3">{section.title}</h2>
              <p className="text-white/60 leading-relaxed text-sm whitespace-pre-line">{section.content}</p>
            </section>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-12 text-center">
          <p className="text-white/40 text-sm mb-4">
            By creating a Solanka account, you confirm you have read and agree to these Terms.
          </p>
          <Link
            href="/auth/register"
            className="inline-block px-8 py-3 rounded-xl bg-gradient-to-r from-sol-purple to-sol-mint text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Create your account →
          </Link>
        </div>
      </main>
    </div>
  );
}
