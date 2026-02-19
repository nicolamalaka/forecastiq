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
}

interface CalibrationBucket {
  label: string
  predicted: number
  actual: number
  count: number
}

function buildCalibrationData(forecasts: Forecast[]): CalibrationBucket[] {
  const resolved = forecasts.filter(f => f.outcome !== null)
  const buckets = [
    { label: '0–10%', min: 0, max: 0.1 },
    { label: '10–20%', min: 0.1, max: 0.2 },
    { label: '20–30%', min: 0.2, max: 0.3 },
    { label: '30–40%', min: 0.3, max: 0.4 },
    { label: '40–50%', min: 0.4, max: 0.5 },
    { label: '50–60%', min: 0.5, max: 0.6 },
    { label: '60–70%', min: 0.6, max: 0.7 },
    { label: '70–80%', min: 0.7, max: 0.8 },
    { label: '80–90%', min: 0.8, max: 0.9 },
    { label: '90–100%', min: 0.9, max: 1.01 },
  ]

  return buckets.map(b => {
    const inBucket = resolved.filter(f => f.probability >= b.min && f.probability < b.max)
    const actual = inBucket.length > 0
      ? inBucket.filter(f => f.outcome === 1).length / inBucket.length
      : 0
    return {
      label: b.label,
      predicted: (b.min + Math.min(b.max, 1)) / 2,
      actual,
      count: inBucket.length,
    }
  }).filter(b => b.count > 0)
}

function SimpleBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="w-full bg-slate-800 rounded h-2">
      <div className="h-2 rounded transition-all" style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} />
    </div>
  )
}

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [forecasts, setForecasts] = useState<Forecast[]>([])
  const [avgBrier, setAvgBrier] = useState<number | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('forecastiq_user')
    if (stored) {
      const u = JSON.parse(stored)
      setUserId(u.id)
      setUsername(u.username)
      loadData(u.id)
    }
  }, [])

  const loadData = async (id: string) => {
    const res = await fetch(`/api/user?userId=${id}`)
    const data = await res.json()
    setForecasts(data.forecasts || [])
    setAvgBrier(data.avgBrier)
  }

  const resolve = async (id: string, outcome: number) => {
    setResolvingId(id)
    await fetch('/api/resolve', {
      method: 'POST',
      body: JSON.stringify({ forecastId: id, outcome }),
      headers: { 'Content-Type': 'application/json' },
    })
    if (userId) loadData(userId)
    setResolvingId(null)
  }

  const resolved = forecasts.filter(f => f.outcome !== null)
  const pending = forecasts.filter(f => f.outcome === null)
  const calibration = buildCalibrationData(forecasts)

  const brierColor = avgBrier === null ? 'text-slate-400'
    : avgBrier < 0.1 ? 'text-green-400'
    : avgBrier < 0.2 ? 'text-blue-400'
    : avgBrier < 0.3 ? 'text-yellow-400'
    : 'text-red-400'

  const brierLabel = avgBrier === null ? '—'
    : avgBrier < 0.1 ? 'Superforecaster'
    : avgBrier < 0.2 ? 'Very Good'
    : avgBrier < 0.3 ? 'Average'
    : 'Needs Work'

  if (!userId) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <div className="text-slate-400 mb-4">Please log in to view your profile.</div>
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
          <span className="text-slate-600 text-xs">/ Profile</span>
        </div>
        <span className="text-sm text-slate-400">👤 {username}</span>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{forecasts.length}</div>
            <div className="text-xs text-slate-500 mt-1">Total Forecasts</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{resolved.length}</div>
            <div className="text-xs text-slate-500 mt-1">Resolved</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${brierColor}`}>{avgBrier !== null ? avgBrier.toFixed(3) : '—'}</div>
            <div className="text-xs text-slate-500 mt-1">Avg Brier Score</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className={`text-lg font-bold ${brierColor}`}>{brierLabel}</div>
            <div className="text-xs text-slate-500 mt-1">Calibration Level</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Calibration chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Calibration Chart</h2>
            <p className="text-xs text-slate-600 mb-4">How often your X% predictions actually came true. Perfect calibration = bars align with the % label.</p>

            {calibration.length === 0 ? (
              <div className="text-slate-600 text-sm py-8 text-center">Resolve some forecasts to see calibration data.</div>
            ) : (
              <div className="space-y-3">
                {calibration.map(b => (
                  <div key={b.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{b.label}</span>
                      <span className="text-slate-500">{b.count} forecast{b.count !== 1 ? 's' : ''} · actual: <span className="text-white">{(b.actual * 100).toFixed(0)}%</span></span>
                    </div>
                    <div className="relative">
                      {/* Perfect calibration line */}
                      <div className="absolute top-0 bottom-0 border-l border-dashed border-slate-600"
                        style={{ left: `${b.predicted * 100}%` }} />
                      {/* Actual bar */}
                      <div className="w-full bg-slate-800 rounded h-3">
                        <div className="h-3 rounded transition-all"
                          style={{
                            width: `${b.actual * 100}%`,
                            backgroundColor: Math.abs(b.actual - b.predicted) < 0.1 ? '#22c55e' : Math.abs(b.actual - b.predicted) < 0.2 ? '#eab308' : '#ef4444'
                          }} />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-800">
                  Dashed line = perfect calibration. Green = well-calibrated, Yellow = slight over/under-confidence, Red = needs improvement.
                </div>
              </div>
            )}
          </div>

          {/* Brier score guide */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Brier Score Guide</h2>
            <div className="space-y-3">
              {[
                { range: '< 0.10', label: 'Superforecaster', color: '#22c55e', desc: 'Top ~2% of all forecasters' },
                { range: '0.10 – 0.20', label: 'Very Good', color: '#60a5fa', desc: 'Better than most experts' },
                { range: '0.20 – 0.25', label: 'Average', color: '#eab308', desc: 'Comparable to prediction markets' },
                { range: '> 0.25', label: 'Needs Improvement', color: '#ef4444', desc: 'Over-confident or under-informed' },
                { range: '0.50', label: 'Random Coin Flip', color: '#64748b', desc: 'No forecasting skill baseline' },
              ].map(s => (
                <div key={s.range} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: s.color }} />
                  <div>
                    <div className="text-xs font-medium" style={{ color: s.color }}>{s.range} — {s.label}</div>
                    <div className="text-xs text-slate-500">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-slate-800/60 rounded-lg text-xs text-slate-400">
              Brier Score = (probability − outcome)² · Lower is better · 0.0 is perfect
            </div>
          </div>
        </div>

        {/* Pending forecasts */}
        {pending.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Pending Resolution ({pending.length})</h2>
            <div className="space-y-3">
              {pending.map(f => (
                <div key={f.id} className="flex items-start justify-between gap-4 py-3 border-b border-slate-800/60 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 mb-1">{f.question}</div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{f.domain}</span>
                      <span>·</span>
                      <span>{new Date(f.createdAt).toLocaleDateString()}</span>
                      <span>·</span>
                      <span className="font-medium" style={{ color: f.probability >= 0.65 ? '#22c55e' : f.probability >= 0.45 ? '#eab308' : '#ef4444' }}>
                        {(f.probability * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => resolve(f.id, 1)} disabled={resolvingId === f.id}
                      className="text-xs bg-green-900/30 hover:bg-green-900/60 border border-green-800/40 text-green-400 px-3 py-1.5 rounded-lg transition">
                      ✓ YES
                    </button>
                    <button onClick={() => resolve(f.id, 0)} disabled={resolvingId === f.id}
                      className="text-xs bg-red-900/30 hover:bg-red-900/60 border border-red-800/40 text-red-400 px-3 py-1.5 rounded-lg transition">
                      ✗ NO
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resolved forecasts */}
        {resolved.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Resolved Forecasts ({resolved.length})</h2>
            <div className="space-y-2">
              {resolved.map(f => (
                <div key={f.id} className="flex items-start justify-between gap-4 py-3 border-b border-slate-800/60 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-300 mb-1">{f.question}</div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>{f.domain}</span>
                      <span>·</span>
                      <span>{new Date(f.createdAt).toLocaleDateString()}</span>
                      <span>·</span>
                      <span>Forecast: <span className="text-slate-300">{(f.probability * 100).toFixed(0)}%</span></span>
                      <span>·</span>
                      <span>Outcome: <span className={f.outcome === 1 ? 'text-green-400' : 'text-red-400'}>{f.outcome === 1 ? 'YES' : 'NO'}</span></span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-slate-500 mb-0.5">Brier</div>
                    <div className={`text-sm font-bold ${(f.brierScore || 0) < 0.1 ? 'text-green-400' : (f.brierScore || 0) < 0.25 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {f.brierScore?.toFixed(3)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {forecasts.length === 0 && (
          <div className="text-center py-16 text-slate-600">
            <div className="text-5xl mb-4">📊</div>
            <div className="text-lg mb-2">No forecasts yet</div>
            <div className="text-sm mb-6">Make your first prediction to start tracking your accuracy.</div>
            <Link href="/" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition">
              Make a Forecast →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
