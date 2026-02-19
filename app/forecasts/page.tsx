'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Forecast {
  id: string
  question: string
  domain: string
  probability: number
  confidenceLow: number
  confidenceHigh: number
  outsideView: number
  insideView: number
  blendRatio: string
  outcome: number | null
  brierScore: number | null
  createdAt: string
  resolvedAt: string | null
  newsWindow: number
}

function probColor(p: number) {
  if (p >= 0.65) return '#22c55e'
  if (p >= 0.45) return '#eab308'
  return '#ef4444'
}

const DOMAIN_LABELS: Record<string, string> = {
  POLITICS: '🗳️ Political',
  POLITICS_NATSEC: '🗳️ Political', // legacy label for old records
  SPORTS: '🏆 Sports',
}

export default function ForecastsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [forecasts, setForecasts] = useState<Forecast[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all')
  const [domainFilter, setDomainFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('forecastiq_user')
    if (stored) {
      const u = JSON.parse(stored)
      setUserId(u.id)
      setUsername(u.username)
      loadForecasts(u.id)
    }
  }, [])

  const loadForecasts = async (id: string) => {
    const res = await fetch(`/api/user?userId=${id}`)
    const data = await res.json()
    setForecasts(data.forecasts || [])
  }

  const resolve = async (id: string, outcome: number) => {
    setResolvingId(id)
    await fetch('/api/resolve', {
      method: 'POST',
      body: JSON.stringify({ forecastId: id, outcome }),
      headers: { 'Content-Type': 'application/json' },
    })
    if (userId) loadForecasts(userId)
    setResolvingId(null)
  }

  const filtered = forecasts.filter(f => {
    if (filter === 'pending' && f.outcome !== null) return false
    if (filter === 'resolved' && f.outcome === null) return false
    if (domainFilter !== 'all' && f.domain !== domainFilter) return false
    return true
  })

  if (!userId) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <div className="text-slate-400 mb-4">Please log in to view your forecasts.</div>
          <Link href="/" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm transition">← Go to Homepage</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-200">
      <header className="border-b border-slate-800/60 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xl font-bold text-white tracking-tight hover:text-blue-400 transition">⚡ ForecastIQ</Link>
          <span className="text-slate-600 text-xs">/ All Forecasts</span>
        </div>
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/" className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">Forecast</Link>
            <Link href="/weights" className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">Weights</Link>
            <Link href="/profile" className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">Profile</Link>
          </nav>
          <span className="text-sm text-slate-400">👤 {username}</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">All Forecasts</h1>
          <span className="text-slate-500 text-sm">{filtered.length} of {forecasts.length}</span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            {(['all', 'pending', 'resolved'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition capitalize ${filter === f ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            {(['all', 'POLITICS', 'SPORTS'] as const).map(d => (
              <button key={d} onClick={() => setDomainFilter(d)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${domainFilter === d ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
                {d === 'all' ? 'All Domains' : DOMAIN_LABELS[d]}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-600">
            <div className="text-4xl mb-3">📭</div>
            <div>No forecasts match this filter.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(f => {
              const isExpanded = expandedId === f.id
              let factors: any[] = []
              try { factors = JSON.parse(f as any) } catch {}

              return (
                <div key={f.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div
                    className="flex items-start justify-between gap-4 p-4 cursor-pointer hover:bg-slate-800/40 transition"
                    onClick={() => setExpandedId(isExpanded ? null : f.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-200 font-medium mb-1.5">{f.question}</div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="bg-slate-800 px-2 py-0.5 rounded">{DOMAIN_LABELS[f.domain] || f.domain}</span>
                        <span>{new Date(f.createdAt).toLocaleDateString()}</span>
                        <span>News: {f.newsWindow}d</span>
                        <span>Blend: {f.blendRatio}</span>
                        {f.resolvedAt && <span className="text-green-600">✓ Resolved</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {f.outcome !== null && (
                        <span className={`text-xs font-medium px-2 py-1 rounded ${f.outcome === 1 ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                          {f.outcome === 1 ? 'YES' : 'NO'}
                        </span>
                      )}
                      {f.brierScore !== null && (
                        <span className={`text-xs font-mono ${f.brierScore < 0.1 ? 'text-green-400' : f.brierScore < 0.25 ? 'text-yellow-400' : 'text-red-400'}`}>
                          B:{f.brierScore.toFixed(3)}
                        </span>
                      )}
                      <div className="text-xl font-bold tabular-nums" style={{ color: probColor(f.probability) }}>
                        {(f.probability * 100).toFixed(0)}%
                      </div>
                      <span className="text-slate-600 text-xs">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-800 p-4">
                      {/* Stats grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                          <div className="text-xs text-slate-500 mb-1">Final Probability</div>
                          <div className="text-lg font-bold" style={{ color: probColor(f.probability) }}>{(f.probability * 100).toFixed(1)}%</div>
                        </div>
                        <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                          <div className="text-xs text-slate-500 mb-1">90% CI</div>
                          <div className="text-sm font-medium text-slate-300">{(f.confidenceLow * 100).toFixed(0)}–{(f.confidenceHigh * 100).toFixed(0)}%</div>
                        </div>
                        <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                          <div className="text-xs text-slate-500 mb-1">Outside View</div>
                          <div className="text-sm font-medium text-cyan-400">{(f.outsideView * 100).toFixed(1)}%</div>
                        </div>
                        <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                          <div className="text-xs text-slate-500 mb-1">Inside View</div>
                          <div className="text-sm font-medium text-purple-400">{(f.insideView * 100).toFixed(1)}%</div>
                        </div>
                      </div>

                      {/* Blend bar */}
                      <div className="mb-4">
                        <div className="text-xs text-slate-500 mb-1.5">Blend: {f.blendRatio} (outside/inside)</div>
                        <div className="flex h-2 rounded-full overflow-hidden">
                          {f.blendRatio && (() => {
                            const [o, i] = f.blendRatio.split('/').map(Number)
                            return <>
                              <div className="bg-cyan-600" style={{ width: `${o}%` }} />
                              <div className="bg-purple-600" style={{ width: `${i}%` }} />
                            </>
                          })()}
                        </div>
                        <div className="flex justify-between text-xs text-slate-600 mt-1">
                          <span>Outside (base rate)</span><span>Inside (news evidence)</span>
                        </div>
                      </div>

                      {/* Resolution */}
                      {f.outcome === null && (
                        <div className="flex items-center gap-3 pt-2">
                          <span className="text-xs text-slate-500">Mark outcome:</span>
                          <button onClick={() => resolve(f.id, 1)} disabled={resolvingId === f.id}
                            className="text-xs bg-green-900/30 hover:bg-green-900/60 border border-green-800/40 text-green-400 px-4 py-1.5 rounded-lg transition">
                            ✓ YES — it happened
                          </button>
                          <button onClick={() => resolve(f.id, 0)} disabled={resolvingId === f.id}
                            className="text-xs bg-red-900/30 hover:bg-red-900/60 border border-red-800/40 text-red-400 px-4 py-1.5 rounded-lg transition">
                            ✗ NO — it didn't happen
                          </button>
                        </div>
                      )}
                      {f.brierScore !== null && (
                        <div className="flex items-center gap-3 pt-2 text-xs text-slate-500">
                          <span>Brier score: <span className={f.brierScore < 0.1 ? 'text-green-400' : f.brierScore < 0.25 ? 'text-yellow-400' : 'text-red-400'}>{f.brierScore.toFixed(4)}</span></span>
                          <span>·</span>
                          <span>Resolved: {new Date(f.resolvedAt!).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
