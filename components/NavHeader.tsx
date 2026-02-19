'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

export default function NavHeader() {
  const [username, setUsername] = useState<string | null>(null)
  const [avgBrier, setAvgBrier] = useState<number | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const stored = localStorage.getItem('forecastiq_user')
    if (stored) {
      const u = JSON.parse(stored)
      setUsername(u.username)
      fetch(`/api/user?userId=${u.id}`)
        .then(r => r.json())
        .then(d => setAvgBrier(d.avgBrier))
        .catch(() => {})
    }
  }, [pathname])

  const logout = () => {
    localStorage.removeItem('forecastiq_user')
    setUsername(null)
    setAvgBrier(null)
    setShowMenu(false)
    router.push('/')
    router.refresh()
  }

  const navLinks = [
    { href: '/', label: 'Forecast' },
    { href: '/forecasts', label: 'History' },
    { href: '/community', label: 'Community' },
    { href: '/weights', label: 'Weights' },
    { href: '/profile', label: 'Profile' },
    { href: '/method', label: 'Method' },
  ]

  return (
    <header className="border-b border-slate-800/60 px-6 py-3 flex items-center justify-between sticky top-0 bg-[#0a0a0f]/95 backdrop-blur z-40">
      <div className="flex items-center gap-4">
        <Link href="/" className="text-xl font-bold text-white tracking-tight hover:text-blue-400 transition">
          ⚡ ForecastIQ
        </Link>
        <nav className="hidden md:flex items-center gap-0.5">
          {navLinks.map(l => (
            <Link key={l.href} href={l.href}
              className={`text-sm px-3 py-1.5 rounded-lg transition ${pathname === l.href ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {username ? (
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-3 py-1.5 transition">
              <span className="text-sm text-white font-medium">@{username}</span>
              {avgBrier !== null && (
                <span className={`text-xs font-mono ${avgBrier < 0.10 ? 'text-green-400' : avgBrier < 0.20 ? 'text-blue-400' : avgBrier < 0.25 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {avgBrier.toFixed(3)}
                </span>
              )}
              <span className="text-slate-500 text-xs">{showMenu ? '▲' : '▼'}</span>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                <Link href="/profile" onClick={() => setShowMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition">
                  <span>📊</span> My Profile
                </Link>
                <Link href="/weights" onClick={() => setShowMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition">
                  <span>⚖️</span> My Weights
                </Link>
                <Link href="/forecasts" onClick={() => setShowMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition">
                  <span>📋</span> My Forecasts
                </Link>
                <div className="border-t border-slate-800" />
                <button onClick={logout}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition text-left">
                  <span>🚪</span> Log Out
                </button>
              </div>
            )}

            {/* Click outside to close */}
            {showMenu && (
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            )}
          </div>
        ) : (
          <Link href="/" className="text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition">
            Sign In →
          </Link>
        )}
      </div>
    </header>
  )
}
