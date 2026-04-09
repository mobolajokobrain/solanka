import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Solanka — Yours, on Solana',
  description: 'Solana-powered payment and developer toolkit for African businesses. Accept USDC, display NGN, build with Python.',
  keywords: ['Solana', 'payments', 'Nigeria', 'USDC', 'fintech', 'Africa', 'crypto'],
  openGraph: {
    title: 'Solanka — Yours, on Solana',
    description: 'The payment toolkit African businesses deserve.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-sol-dark text-white antialiased">
        {children}
      </body>
    </html>
  )
}
