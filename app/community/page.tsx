'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface LeaderboardUser {
  id: string
  username: string
  createdAt: string
  totalForecasts: number
  resolvedForecasts: number
  pendingForecasts: number
  avgBrier: number | null
  brierLabel: string
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
  baseRateDataset: string
  articleCount: number
  outcome: number | null
  brierScore: number | null
  createdAt: string
  resolvedAt: string | null
  newsWindow: number
}

interface UserProfile {
  user: { id: string; username: string; createdAt: string }
  forecasts: Forecast[]
  stats: {
    total: number
    resolved: number
    pending: number
    avgBrier: number | null
    brierLabel: string | null
  }
}

interface FactorResult {
  name: string; label: string; weight: number
  rawScore: number; adjustedScore: number; articleCount: number
  evidence: { title: string; url: string; tier: number; tierLabel: string; excerpt: string }[]
}

function probColor(p: number) {
  if (p >= 0.65) return '#22c55e'
  if (p >= 0.45) return '#eab308'
  return '#ef4444'
}

function brierColor(b: number | null) {
  if (b === null) return 'text-slate-500'
  if (b < 0.10) return 'text-green-400'
  if (b < 0.20) return 'text-blue-400'
  if (b < 0.25) return 'text-yellow-400'
  return 'text-red-400'
}

function brierBadgeColor(label: string) {
  switch (label) {
    case 'Superforecaster': return 'bg-green-900/40 text-green-400 border-green-800/40'
    case 'Very Good': return 'bg-blue-900/40 text-blue-400 border-blue-800/40'
    case 'Average': return 'bg-yellow-900/40 text-yellow-400 border-yellow-800/40'
    case 'Needs Work': return 'bg-red-900/40 text-red-400 border-red-800/40'
    default: return 'bg-slate-800 text-slate-500 border-slate-700'
  }
}

const DOMAIN_LABELS: Record<string, string> = {
  POLITICS: '🗳️ Political',
  POLITICS_NATSEC: '🗳️ Political',
  SPORTS: '🏆 Sports',
}

export default function CommunityPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingUser, setLoadingUser] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [datasetModal, setDatasetModal] = useState<any | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetch('/api/community')
      .then(r => r.json())
      .then(data => { setLeaderboard(data); setLoading(false) })
  }, [])

  const selectUser = async (userId: string) => {
    setLoadingUser(true)
    setExpandedId(null)
    const res = await fetch(`/api/community?userId=${userId}`)
    const data = await res.json()
    setSelectedUser(data)
    setLoadingUser(false)
  }

  const filteredLeaderboard = leaderboard.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-200">
      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">

        {/* LEFT: Leaderboard */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h1 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">🏆 Forecasters</h1>
            <input
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by username..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 mb-3"
            />

            {loading ? (
              <div className="text-slate-600 text-sm text-center py-6 animate-pulse">Loading forecasters...</div>
            ) : filteredLeaderboard.length === 0 ? (
              <div className="text-slate-600 text-sm text-center py-6">No forecasters yet.<br/>Be the first!</div>
            ) : (
              <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {filteredLeaderboard.map((u, idx) => (
                  <button key={u.id} onClick={() => selectUser(u.id)}
                    className={`w-full text-left px-3 py-3 rounded-xl border transition ${selectedUser?.user.id === u.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`text-xs font-mono font-bold shrink-0 w-6 text-center ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-600' : 'text-slate-600'}`}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-200 truncate">{u.username}</div>
                          <div className="text-xs text-slate-500">{u.totalForecasts} forecast{u.totalForecasts !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                      <div className="shrink-0 ml-2 text-right">
                        {u.avgBrier !== null ? (
                          <>
                            <div className={`text-sm font-bold font-mono ${brierColor(u.avgBrier)}`}>{u.avgBrier.toFixed(3)}</div>
                            <div className="text-xs text-slate-600">Brier</div>
                          </>
                        ) : (
                          <div className="text-xs text-slate-600">Unscored</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-500 space-y-1.5">
            <div className="text-slate-400 font-medium mb-2">Brier Score Guide</div>
            {[
              { label: 'Superforecaster', range: '< 0.10', color: 'text-green-400' },
              { label: 'Very Good', range: '0.10–0.20', color: 'text-blue-400' },
              { label: 'Average', range: '0.20–0.25', color: 'text-yellow-400' },
              { label: 'Needs Work', range: '> 0.25', color: 'text-red-400' },
              { label: 'Random guess', range: '0.50', color: 'text-slate-500' },
            ].map(s => (
              <div key={s.label} className="flex justify-between">
                <span className={s.color}>{s.label}</span>
                <span className="font-mono">{s.range}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: User profile */}
        <div>
          {!selectedUser && !loadingUser && (
            <div className="flex flex-col items-center justify-center h-96 text-slate-600">
              <div className="text-5xl mb-4">👈</div>
              <div className="text-lg font-medium mb-1">Select a forecaster</div>
              <div className="text-sm">Click any username to view their forecasts and accuracy</div>
            </div>
          )}

          {loadingUser && (
            <div className="flex items-center justify-center h-96 text-slate-500 animate-pulse">
              Loading profile...
            </div>
          )}

          {selectedUser && !loadingUser && (
            <div className="space-y-5">
              {/* User header */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">@{selectedUser.user.username}</h2>
                    <div className="text-xs text-slate-500">Member since {new Date(selectedUser.user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
                  </div>
                  {selectedUser.stats.brierLabel && (
                    <span className={`text-sm font-medium px-3 py-1.5 rounded-full border ${brierBadgeColor(selectedUser.stats.brierLabel)}`}>
                      {selectedUser.stats.brierLabel}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-white">{selectedUser.stats.total}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Total Forecasts</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-white">{selectedUser.stats.resolved}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Resolved</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-white">{selectedUser.stats.pending}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Pending</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 text-center">
                    <div className={`text-2xl font-bold ${brierColor(selectedUser.stats.avgBrier)}`}>
                      {selectedUser.stats.avgBrier !== null ? selectedUser.stats.avgBrier.toFixed(3) : '—'}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">Avg Brier Score</div>
                  </div>
                </div>
              </div>

              {/* Forecasts list — read only */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Forecasts ({selectedUser.forecasts.length})
                </h3>

                {selectedUser.forecasts.length === 0 ? (
                  <div className="text-center py-10 text-slate-600">No forecasts yet.</div>
                ) : (
                  <div className="space-y-2">
                    {selectedUser.forecasts.map(f => {
                      const isExpanded = expandedId === f.id
                      let parsedFactors: FactorResult[] = []
                      try { parsedFactors = JSON.parse(f.factors || '[]') } catch {}
                      const [blendOut, blendIn] = (f.blendRatio || '50/50').split('/').map(Number)

                      return (
                        <div key={f.id} className="border border-slate-800 rounded-xl overflow-hidden">
                          <div className="flex items-start justify-between gap-3 p-4 cursor-pointer hover:bg-slate-800/30 transition"
                            onClick={() => setExpandedId(isExpanded ? null : f.id)}>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-slate-200 font-medium mb-1.5 leading-snug">{f.question}</div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                <span className="bg-slate-800 px-2 py-0.5 rounded">{DOMAIN_LABELS[f.domain] || f.domain}</span>
                                <span>{new Date(f.createdAt).toLocaleDateString()}</span>
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
                            <div className="border-t border-slate-800 p-4 space-y-4">
                              {/* Summary */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-slate-800/60 rounded-lg p-3 text-center">
                                  <div className="text-xs text-slate-500 mb-1">Probability</div>
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

                              {/* Base rate */}
                              <div className="bg-cyan-950/30 border border-cyan-900/40 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">📐 Outside View</div>
                                  {f.baseRateDataset && (() => {
                                    try {
                                      const d = JSON.parse(f.baseRateDataset)
                                      return d ? <button onClick={() => setDatasetModal(d)} className="text-xs text-cyan-600 hover:text-cyan-400 underline">View Dataset →</button> : null
                                    } catch { return null }
                                  })()}
                                </div>
                                <div className="grid grid-cols-3 gap-3 text-sm">
                                  <div><div className="text-xs text-slate-500 mb-1">Reference Class</div><div className="text-slate-200 font-medium text-xs">{f.baseRateLabel || '—'}</div></div>
                                  <div><div className="text-xs text-slate-500 mb-1">Source</div><div className="text-slate-400 text-xs">{f.baseRateSource || '—'}</div></div>
                                  <div><div className="text-xs text-slate-500 mb-1">Base Rate</div><div className="text-cyan-400 font-bold text-lg">{((f.baseRateValue || f.outsideView) * 100).toFixed(0)}%</div></div>
                                </div>
                              </div>

                              {/* Factors */}
                              {parsedFactors.length > 0 && (
                                <div className="bg-purple-950/20 border border-purple-900/30 rounded-xl p-4">
                                  <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-3">🔍 Inside View — Factors</div>
                                  <div className="space-y-2">
                                    {parsedFactors.map((factor, fi) => {
                                      const contribution = (factor.weight / 100) * factor.adjustedScore
                                      return (
                                        <details key={fi} className="group">
                                          <summary className="cursor-pointer flex items-center justify-between py-1.5 text-xs hover:text-slate-200 transition">
                                            <span className="text-slate-300">{factor.label}</span>
                                            <div className="flex items-center gap-2 shrink-0 ml-2">
                                              <span className="text-slate-500">{factor.weight}% × {factor.adjustedScore.toFixed(2)} =</span>
                                              <span className="text-yellow-400 font-bold">{contribution.toFixed(3)}</span>
                                            </div>
                                          </summary>
                                          <div className="pt-2 pl-3 space-y-1.5">
                                            {factor.evidence?.slice(0, 3).map((e, ei) => (
                                              <div key={ei} className="bg-slate-800/50 rounded p-2 text-xs">
                                                <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline line-clamp-1">{e.title}</a>
                                                {e.excerpt && <div className="text-slate-500 mt-1 line-clamp-1">{e.excerpt}</div>}
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

                              {/* Blend */}
                              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">⚖️ Blend</div>
                                <div className="font-mono text-xs space-y-1 text-slate-400 mb-3">
                                  <div>Outside: <span className="text-cyan-400">{(f.outsideView * 100).toFixed(1)}%</span> × {(blendOut/100).toFixed(2)} = <span className="text-cyan-400">{(f.outsideView * blendOut).toFixed(2)}%</span></div>
                                  <div>Inside: &nbsp;<span className="text-purple-400">{(f.insideView * 100).toFixed(1)}%</span> × {(blendIn/100).toFixed(2)} = <span className="text-purple-400">{(f.insideView * blendIn).toFixed(2)}%</span></div>
                                  <div className="border-t border-slate-700 pt-1">Final = <span className="text-white font-bold">{(f.probability * 100).toFixed(1)}%</span></div>
                                </div>
                                <div className="flex h-2 rounded-full overflow-hidden">
                                  <div className="bg-cyan-600" style={{ width: `${blendOut}%` }} />
                                  <div className="bg-purple-600" style={{ width: `${blendIn}%` }} />
                                </div>
                                <div className="flex justify-between text-xs text-slate-600 mt-1">
                                  <span>Outside ({blendOut}%)</span>
                                  <span>Inside ({blendIn}%)</span>
                                </div>
                              </div>

                              {/* Outcome */}
                              {f.outcome !== null && (
                                <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                                  <span>Outcome: <span className={f.outcome === 1 ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>{f.outcome === 1 ? 'YES' : 'NO'}</span></span>
                                  {f.brierScore !== null && <>
                                    <span>·</span>
                                    <span>Brier: <span className={f.brierScore < 0.1 ? 'text-green-400' : f.brierScore < 0.25 ? 'text-yellow-400' : 'text-red-400'}>{f.brierScore.toFixed(4)}</span></span>
                                  </>}
                                </div>
                              )}
                              {f.outcome === null && (
                                <div className="text-xs text-slate-600 italic">⏳ Pending resolution</div>
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
          )}
        </div>
      </div>

      {/* Dataset Modal */}
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
