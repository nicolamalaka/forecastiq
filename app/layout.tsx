import type { Metadata } from 'next'
import './globals.css'
import NavHeader from '@/components/NavHeader'

export const metadata: Metadata = {
  title: 'ForecastIQ — Superforecasting Platform',
  description: 'AI-powered political and sports forecasting using Tetlock methodology with intelligence weighting',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0f] text-slate-200 antialiased">
        <NavHeader />
        {children}
      </body>
    </html>
  )
}
