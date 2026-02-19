'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface FactorResult {
  name: string
  label: string
  weight: number
  rawScore: number
  adjustedScore: number
  articleCount: number
  evidence: { title: string; url: string; tier: number; tierLabel: string; excerpt: string }[]
}

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
  factors: string
  baseRateLabel: string
  baseRateSource: string
  baseRateValue: number
  articleCount: number
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
  const [datasetModal, setDatasetModal] = useState<any | null>(null)

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

                  {isExpanded && (() => {
                    let parsedFactors: FactorResult[] = []
                    try { parsedFactors = JSON.parse(f.factors || '[]') } catch {}
                    const [blendOut, blendIn] = (f.blendRatio || '50/50').split('/').map(Number)
                    return (
                      <div className="border-t border-slate-800 p-4 space-y-5">

                        {/* Summary row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                            <div className="text-sm font-bold text-cyan-400">{(f.outsideView * 100).toFixed(1)}%</div>
                          </div>
                          <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                            <div className="text-xs text-slate-500 mb-1">Inside View</div>
                            <div className="text-sm font-bold text-purple-400">{(f.insideView * 100).toFixed(1)}%</div>
                          </div>
                        </div>

                        {/* Outside view / Base rate box */}
                        <div className="bg-cyan-950/30 border border-cyan-900/40 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">📐 Outside View — Base Rate Calculation</div>
                            {(() => { try { const d = JSON.parse((f as any).baseRateDataset || 'null'); return d ? <button onClick={() => setDatasetModal(d)} className="text-xs text-cyan-600 hover:text-cyan-400 underline">View Dataset →</button> : null } catch { return null } })()}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-xs text-slate-500 mb-1">Reference Class</div>
                              <div className="text-slate-200 font-medium">{f.baseRateLabel || '—'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 mb-1">Dataset / Source</div>
                              <div className="text-slate-400">{f.baseRateSource || '—'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 mb-1">Historical Base Rate</div>
                              <div className="text-cyan-400 font-bold text-xl">{((f.baseRateValue || f.outsideView) * 100).toFixed(0)}%</div>
                            </div>
                          </div>
                          <div className="mt-3 text-xs text-slate-500 bg-slate-900/50 rounded-lg p-2.5">
                            In situations matching the reference class <span className="text-slate-300">"{f.baseRateLabel}"</span>, this type of event has historically occurred approximately <span className="text-cyan-400 font-medium">{((f.baseRateValue || f.outsideView) * 100).toFixed(0)}%</span> of the time. This forms the Tetlock outside-view anchor before case-specific evidence is applied.
                          </div>
                        </div>

                        {/* Inside view — factor scores */}
                        {parsedFactors.length > 0 && (
                          <div className="bg-purple-950/20 border border-purple-900/30 rounded-xl p-4">
                            <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-3">🔍 Inside View — Factor Scores ({f.articleCount || 0} articles)</div>
                            <div className="space-y-3">
                              {parsedFactors.map((factor, fi) => {
                                const contribution = (factor.weight / 100) * factor.adjustedScore
                                return (
                                  <details key={fi} className="group">
                                    <summary className="cursor-pointer flex items-center justify-between py-1.5 text-xs hover:text-slate-200 transition">
                                      <div className="flex items-center gap-3 flex-1">
                                        <span className="text-slate-300 font-medium">{factor.label}</span>
                                        <span className="text-slate-600">{factor.weight}% weight</span>
                                      </div>
                                      <div className="flex items-center gap-3 shrink-0 ml-3">
                                        <span className="text-slate-500 font-mono">{factor.weight}% × {factor.adjustedScore.toFixed(2)} =</span>
                                        <span className="text-yellow-400 font-bold font-mono">{contribution.toFixed(3)}</span>
                                        <span className="text-slate-600 text-xs">{factor.articleCount}art ▼</span>
                                      </div>
                                    </summary>
                                    <div className="pt-2 pl-3 space-y-1.5">
                                      <div className="flex gap-4 text-xs text-slate-500 mb-2">
                                        <span>Raw score: <span className="text-slate-300">{factor.rawScore.toFixed(1)}/10</span></span>
                                        <span>Tier-adjusted: <span className="text-slate-300">{factor.adjustedScore.toFixed(2)}/10</span></span>
                                        <span>Contribution: <span className="text-yellow-400">{contribution.toFixed(3)}</span></span>
                                      </div>
                                      {factor.evidence?.slice(0, 3).map((e, ei) => (
                                        <div key={ei} className="bg-slate-800/50 rounded p-2 text-xs">
                                          <a href={e.url} target="_blank" rel="noopener noreferrer"
                                            className="text-blue-400 hover:underline line-clamp-1 font-medium">{e.title}</a>
                                          {e.excerpt && <div className="text-slate-500 mt-1 line-clamp-1">{e.excerpt}</div>}
                                          <div className="text-slate-600 mt-1">{e.tierLabel} · weight {e.tier?.toFixed(2)}</div>
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                )
                              })}
                              <div className="border-t border-purple-900/30 pt-2 flex justify-between text-xs">
                                <span className="text-slate-500">Inside view total:</span>
                                <span className="text-purple-400 font-bold">{(f.insideView * 100).toFixed(1)}%</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Blend calculation */}
                        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">⚖️ Blend Calculation</div>
                          <div className="font-mono text-xs space-y-1 text-slate-400">
                            <div>Outside view: <span className="text-cyan-400">{(f.outsideView * 100).toFixed(1)}%</span> × {blendOut/100} = <span className="text-cyan-400">{(f.outsideView * blendOut).toFixed(2)}%</span></div>
                            <div>Inside view: &nbsp;<span className="text-purple-400">{(f.insideView * 100).toFixed(1)}%</span> × {blendIn/100} = <span className="text-purple-400">{(f.insideView * blendIn).toFixed(2)}%</span></div>
                            <div className="border-t border-slate-700 pt-1 mt-1">
                              Final = <span className="text-cyan-400">{(f.outsideView * blendOut).toFixed(2)}</span> + <span className="text-purple-400">{(f.insideView * blendIn).toFixed(2)}</span> = <span className="text-white font-bold text-sm">{(f.probability * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="flex h-2.5 rounded-full overflow-hidden">
                              <div className="bg-cyan-600" style={{ width: `${blendOut}%` }} />
                              <div className="bg-purple-600" style={{ width: `${blendIn}%` }} />
                            </div>
                            <div className="flex justify-between text-xs text-slate-600 mt-1">
                              <span>← Outside / Base rate ({blendOut}%)</span>
                              <span>Inside / News evidence ({blendIn}%) →</span>
                            </div>
                          </div>
                        </div>

                        {/* Resolution */}
                        {f.outcome === null ? (
                          <div className="flex items-center gap-3">
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
                        ) : (
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>Outcome: <span className={f.outcome === 1 ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>{f.outcome === 1 ? 'YES' : 'NO'}</span></span>
                            {f.brierScore !== null && <>
                              <span>·</span>
                              <span>Brier score: <span className={f.brierScore < 0.1 ? 'text-green-400' : f.brierScore < 0.25 ? 'text-yellow-400' : 'text-red-400'}>{f.brierScore.toFixed(4)}</span></span>
                              <span>·</span>
                              <span>Resolved: {new Date(f.resolvedAt!).toLocaleDateString()}</span>
                            </>}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {datasetModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDatasetModal(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900">
              <div className="text-sm font-bold text-white">📐 Dataset Reference — Outside View</div>
              <button onClick={() => setDatasetModal(null)} className="text-slate-500 hover:text-white text-xl transition">✕</button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div><div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">What This Measures</div><p className="text-sm text-slate-300 leading-relaxed">{datasetModal.description}</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800 rounded-lg p-3"><div className="text-xs text-slate-500 mb-1">Sample Size</div><div className="text-sm text-white font-medium">{datasetModal.sampleSize}</div></div>
                <div className="bg-slate-800 rounded-lg p-3"><div className="text-xs text-slate-500 mb-1">Time Period</div><div className="text-sm text-white font-medium">{datasetModal.timePeriod}</div></div>
                <div className="bg-slate-800 rounded-lg p-3 col-span-2"><div className="text-xs text-slate-500 mb-1">Geographic Scope</div><div className="text-sm text-white">{datasetModal.geographicScope}</div></div>
              </div>
              <div><div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Methodology</div><p className="text-sm text-slate-400 leading-relaxed">{datasetModal.methodology}</p></div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Key Studies</div>
                <div className="space-y-2">{datasetModal.keyStudies?.map((s: any, i: number) => (
                  <div key={i} className="bg-slate-800/60 rounded-lg p-3">
                    <div className="text-xs font-medium text-slate-200 mb-0.5">"{s.title}" — {s.authors} ({s.year})</div>
                    <div className="text-xs text-slate-400">{s.finding}</div>
                  </div>
                ))}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Historical Examples</div>
                <div className="space-y-1.5">{datasetModal.historicalExamples?.map((ex: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <span className="text-slate-400 flex-1">{ex.event}</span>
                    <span className={`shrink-0 font-medium ${ex.outcome.startsWith('YES') ? 'text-green-400' : ex.outcome.startsWith('NO') ? 'text-red-400' : 'text-yellow-400'}`}>{ex.outcome}</span>
                  </div>
                ))}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Caveats</div>
                <ul className="space-y-1">{datasetModal.caveats?.map((c: string, i: number) => (
                  <li key={i} className="text-xs text-slate-400 flex items-start gap-2"><span className="text-yellow-600 shrink-0">⚠</span>{c}</li>
                ))}</ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
