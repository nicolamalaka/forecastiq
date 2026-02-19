'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

export default function NavHeader() {
  const [username, setUsername] = useState<string | null>(null)
  const [avgBrier, setAvgBrier] = useState<number | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [loginInput, setLoginInput] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const stored = localStorage.getItem('forecastiq_user')
    if (stored) {
      try {
        const u = JSON.parse(stored)
        setUsername(u.username)
        fetch(`/api/user?userId=${u.id}`)
          .then(r => r.json())
          .then(d => { if (d.avgBrier !== undefined) setAvgBrier(d.avgBrier) })
          .catch(() => {})
      } catch {
        localStorage.removeItem('forecastiq_user')
      }
    }
  }, [pathname])

  const login = async () => {
    const name = loginInput.trim()
    if (!name) return
    setLoginLoading(true)
    setLoginError('')
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        body: JSON.stringify({ username: name }),
        headers: { 'Content-Type': 'application/json' },
      })
      const user = await res.json()
      if (user.error) { setLoginError(user.error); setLoginLoading(false); return }
      localStorage.setItem('forecastiq_user', JSON.stringify(user))
      setUsername(user.username)
      setLoginInput('')
      setShowLoginForm(false)
      setLoginLoading(false)
      // Load Brier score
      fetch(`/api/user?userId=${user.id}`)
        .then(r => r.json())
        .then(d => { if (d.avgBrier !== undefined) setAvgBrier(d.avgBrier) })
        .catch(() => {})
      router.refresh()
    } catch {
      setLoginError('Could not connect. Try again.')
      setLoginLoading(false)
    }
  }

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
        <Link href="/" className="text-xl font-bold text-white tracking-tight hover:text-blue-400 transition shrink-0">
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

      <div className="flex items-center gap-2">
        {username ? (
          /* ── Logged in ── */
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
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
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
              </>
            )}
          </div>
        ) : showLoginForm ? (
          /* ── Login form (inline) ── */
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setShowLoginForm(false); setLoginInput(''); setLoginError('') }} />
            <div className="relative z-50 flex items-center gap-2">
              <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-4 absolute right-0 top-8 w-64">
                <div className="text-sm font-semibold text-white mb-1">Sign In</div>
                <div className="text-xs text-slate-500 mb-3">Enter any username — new accounts are created automatically.</div>
                <input
                  autoFocus
                  value={loginInput}
                  onChange={e => { setLoginInput(e.target.value); setLoginError('') }}
                  onKeyDown={e => e.key === 'Enter' && login()}
                  placeholder="Your username"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 mb-2"
                />
                {loginError && <div className="text-xs text-red-400 mb-2">{loginError}</div>}
                <div className="flex gap-2">
                  <button onClick={login} disabled={loginLoading || !loginInput.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium py-1.5 rounded-lg transition">
                    {loginLoading ? '...' : 'Sign In →'}
                  </button>
                  <button onClick={() => { setShowLoginForm(false); setLoginInput(''); setLoginError('') }}
                    className="px-3 py-1.5 text-slate-400 hover:text-white text-sm rounded-lg hover:bg-slate-800 transition">
                    ✕
                  </button>
                </div>
              </div>
              {/* Trigger button stays visible */}
              <button onClick={() => setShowLoginForm(false)}
                className="text-sm text-white bg-blue-600 border border-blue-500 px-3 py-1.5 rounded-lg">
                Sign In
              </button>
            </div>
          </>
        ) : (
          /* ── Logged out ── */
          <button onClick={() => setShowLoginForm(true)}
            className="text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-1.5 rounded-lg transition font-medium">
            Sign In →
          </button>
        )}
      </div>
    </header>
  )
}
