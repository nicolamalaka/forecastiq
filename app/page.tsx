'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

interface CalcStep { type: string; message: string; data?: any }
interface Evidence { title: string; url: string; tier: number; tierLabel: string; excerpt: string }
interface Factor { name: string; label: string; weight: number; rawScore: number; adjustedScore: number; evidence: Evidence[]; articleCount: number }
interface ForecastResult { prob: number; low: number; high: number; factors: Factor[]; baseRateLabel: string; articleCount: number }
interface SavedForecast { id: string; question: string; domain: string; probability: number; outcome: number | null; brierScore: number | null; createdAt: string }

const PRESETS = [
  { id: 'POLITICS', label: '🗳️ Standard Politics', desc: 'Elections, policy, leadership' },
  { id: 'POLITICS_NATSEC', label: '🛡️ Nat Sec Politics', desc: 'Small state security & statecraft' },
  { id: 'SPORTS', label: '🏆 Sports', desc: 'Manual factor entry' },
]

const SPORTS_FACTORS = [
  { id: 'recent_form', label: 'Recent Form (last 5)', weight: 25 },
  { id: 'head_to_head', label: 'Head-to-Head Record', weight: 15 },
  { id: 'home_away', label: 'Home/Away Advantage', weight: 15 },
  { id: 'player_availability', label: 'Key Player Availability', weight: 20 },
  { id: 'offensive_efficiency', label: 'Offensive Efficiency', weight: 12.5 },
  { id: 'defensive_efficiency', label: 'Defensive Efficiency', weight: 12.5 },
]

function probColor(p: number) {
  if (p >= 65) return '#22c55e'
  if (p >= 45) return '#eab308'
  return '#ef4444'
}

function calcSports(scores: Record<string, number>) {
  let total = 0
  for (const f of SPORTS_FACTORS) total += ((scores[f.id] ?? 5) * f.weight) / 100
  return Math.max(1, Math.min(99, (total / 10) * 100))
}

function stepColor(type: string) {
  switch (type) {
    case 'search': return 'text-blue-400'
    case 'score': return 'text-yellow-300'
    case 'weight': return 'text-purple-400'
    case 'blend': return 'text-cyan-400'
    case 'final': return 'text-green-400 font-bold text-sm'
    case 'saved': return 'text-green-600'
    case 'error': return 'text-red-400'
    default: return 'text-slate-300'
  }
}

function stepPrefix(type: string) {
  switch (type) {
    case 'search': return '⟳ '
    case 'score': return '  ↳ '
    case 'weight': return ''
    case 'blend': return ''
    case 'final': return '✓ '
    case 'saved': return '💾 '
    case 'error': return '✗ '
    default: return '→ '
  }
}

export default function Home() {
  const [username, setUsername] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [preset, setPreset] = useState('POLITICS')
  const [question, setQuestion] = useState('')
  const [newsWindow, setNewsWindow] = useState(14)
  const [sportsScores, setSportsScores] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [steps, setSteps] = useState<CalcStep[]>([])
  const [result, setResult] = useState<ForecastResult | null>(null)
  const [forecasts, setForecasts] = useState<SavedForecast[]>([])
  const [avgBrier, setAvgBrier] = useState<number | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [savedWeightsNote, setSavedWeightsNote] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem('forecastiq_user')
    if (stored) {
      const u = JSON.parse(stored)
      setUserId(u.id)
      setUsername(u.username)
      loadForecasts(u.id)
    }
  }, [])

  // Check if user has saved weights for current preset
  useEffect(() => {
    if (!userId) { setSavedWeightsNote(null); return }
    fetch(`/api/weights?userId=${userId}&domain=${preset}`)
      .then(r => r.json())
      .then(data => {
        setSavedWeightsNote(data ? '✓ Using your custom weights' : null)
      })
      .catch(() => setSavedWeightsNote(null))
  }, [userId, preset])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [steps])

  const login = async () => {
    if (!username.trim()) return
    const res = await fetch('/api/user', {
      method: 'POST', body: JSON.stringify({ username }),
      headers: { 'Content-Type': 'application/json' },
    })
    const user = await res.json()
    localStorage.setItem('forecastiq_user', JSON.stringify(user))
    setUserId(user.id)
    loadForecasts(user.id)
  }

  const loadForecasts = async (id: string) => {
    const res = await fetch(`/api/user?userId=${id}`)
    const data = await res.json()
    setForecasts(data.forecasts || [])
    setAvgBrier(data.avgBrier)
  }

  const runForecast = async () => {
    if (!question.trim()) return
    setLoading(true)
    setSteps([])
    setResult(null)

    if (preset === 'SPORTS') {
      const prob = calcSports(sportsScores)
      const sportSteps: CalcStep[] = [
        { type: 'info', message: 'Domain: SPORTS (manual factor entry)' },
        { type: 'weight', message: '\nApplying weights:' },
        ...SPORTS_FACTORS.map(f => ({
          type: 'weight' as const,
          message: `  ${f.label} (${f.weight}%) × ${(sportsScores[f.id] ?? 5).toFixed(1)} = ${((f.weight / 100) * (sportsScores[f.id] ?? 5)).toFixed(3)}`,
        })),
        { type: 'final', message: `\n✓ RESULT: ${prob.toFixed(1)}% | 90% CI: ${Math.max(1, prob - 10).toFixed(0)}%–${Math.min(99, prob + 10).toFixed(0)}%` },
      ]
      setSteps(sportSteps)
      setResult({ prob, low: Math.max(1, prob - 10), high: Math.min(99, prob + 10), factors: [], baseRateLabel: 'Manual sports entry', articleCount: 0 })
      setLoading(false)
      return
    }

    const res = await fetch('/api/forecast', {
      method: 'POST',
      body: JSON.stringify({ question, preset, newsWindow, userId, userWeights: {} }),
      headers: { 'Content-Type': 'application/json' },
    })

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const step: CalcStep = JSON.parse(line.slice(6))
          setSteps(prev => [...prev, step])
          if (step.type === 'final' && step.data) {
            const d = step.data
            setResult({
              prob: d.finalPct,
              low: d.confidenceLow,
              high: d.confidenceHigh,
              factors: d.factors || [],
              baseRateLabel: d.baseRateLabel,
              articleCount: d.articleCount,
            })
            if (userId) loadForecasts(userId)
          }
        } catch {}
      }
    }
    setLoading(false)
  }

  const resolveForcast = async (id: string, outcome: number) => {
    setResolvingId(id)
    await fetch('/api/resolve', {
      method: 'POST', body: JSON.stringify({ forecastId: id, outcome }),
      headers: { 'Content-Type': 'application/json' },
    })
    if (userId) loadForecasts(userId)
    setResolvingId(null)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-200">
      {/* Header */}
      <header className="border-b border-slate-800/60 px-6 py-3 flex items-center justify-between backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-white tracking-tight">⚡ ForecastIQ</span>
          <span className="text-slate-600 text-xs hidden sm:block">Superforecasting Platform · Tetlock Method</span>
        </div>
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/" className="text-sm text-white bg-slate-800 px-3 py-1.5 rounded-lg">Forecast</Link>
          <Link href="/forecasts" className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">History</Link>
          <Link href="/weights" className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">Weights</Link>
          <Link href="/profile" className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition">Profile</Link>
        </nav>
        <div className="flex items-center gap-3">
          {!userId ? (
            <div className="flex gap-2">
              <input
                value={username} onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && login()}
                placeholder="Username to track forecasts"
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 w-52 focus:outline-none focus:border-blue-500"
              />
              <button onClick={login} className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-1.5 rounded-lg transition font-medium">Start →</button>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-slate-400">👤 <span className="text-white">{username}</span></span>
              {avgBrier !== null && (
                <span className="bg-slate-800 px-2 py-1 rounded text-xs text-slate-400">
                  Brier: <span className={avgBrier < 0.15 ? 'text-green-400' : avgBrier < 0.25 ? 'text-yellow-400' : 'text-red-400'}>{avgBrier.toFixed(3)}</span>
                </span>
              )}
              <span className="text-slate-600 text-xs">{forecasts.length} forecasts</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 py-5 grid grid-cols-1 lg:grid-cols-[320px_1fr_320px] gap-4">

        {/* LEFT: Input */}
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">New Forecast</h2>

            <div className="mb-4">
              <label className="text-xs text-slate-500 mb-2 block">Domain Preset</label>
              <div className="space-y-1.5">
                {PRESETS.map(p => (
                  <button key={p.id} onClick={() => setPreset(p.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition text-sm ${preset === p.id ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-slate-700/60 hover:border-slate-600 text-slate-400 hover:text-slate-300'}`}>
                    <div className="font-medium text-sm">{p.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs text-slate-500 mb-1.5 block">Forecast Question</label>
              <textarea value={question} onChange={e => setQuestion(e.target.value)}
                placeholder={preset === 'SPORTS' ? 'e.g. Will Navy beat Lehigh on Feb 18?' : preset === 'POLITICS_NATSEC' ? 'e.g. Will Myanmar junta survive 2026?' : 'e.g. Will Modi call snap elections before Dec 2026?'}
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {preset !== 'SPORTS' && (
              <div className="mb-4">
                <label className="text-xs text-slate-500 mb-1.5 block">
                  News Window: <span className="text-white font-medium">{newsWindow} days</span>
                </label>
                <input type="range" min={7} max={90} value={newsWindow} onChange={e => setNewsWindow(Number(e.target.value))} className="w-full accent-blue-500" />
                <div className="flex justify-between text-xs text-slate-600 mt-1"><span>7d</span><span>30d</span><span>90d</span></div>
              </div>
            )}

            {preset === 'SPORTS' && (
              <div className="mb-4 space-y-3">
                <label className="text-xs text-slate-500 block">Factor Scores (0–10) for Team A</label>
                {SPORTS_FACTORS.map(f => (
                  <div key={f.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{f.label} <span className="text-slate-600">({f.weight}%)</span></span>
                      <span className="text-white font-medium">{(sportsScores[f.id] ?? 5).toFixed(1)}</span>
                    </div>
                    <input type="range" min={0} max={10} step={0.5}
                      value={sportsScores[f.id] ?? 5}
                      onChange={e => setSportsScores(prev => ({ ...prev, [f.id]: Number(e.target.value) }))}
                      className="w-full accent-blue-500" />
                  </div>
                ))}
              </div>
            )}

            {savedWeightsNote && (
              <div className="mb-3 text-xs text-green-500 flex items-center gap-1.5">
                <span>{savedWeightsNote}</span>
                <Link href="/weights" className="text-slate-500 hover:text-slate-300 underline">Edit</Link>
              </div>
            )}
            {!savedWeightsNote && userId && (
              <div className="mb-3 text-xs text-slate-600 flex items-center gap-1.5">
                Using default weights.
                <Link href="/weights" className="text-slate-500 hover:text-slate-300 underline">Customise</Link>
              </div>
            )}

            <button onClick={runForecast} disabled={loading || !question.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition text-sm">
              {loading ? '⟳ Analysing...' : '▶ Run Forecast'}
            </button>
          </div>

          {/* History */}
          {forecasts.length > 0 && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">History</h2>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {forecasts.slice(0, 15).map((f) => (
                  <div key={f.id} className="py-2 border-b border-slate-800/60 last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-300 truncate">{f.question}</div>
                        <div className="text-xs text-slate-600 mt-0.5">{f.domain} · {new Date(f.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="text-sm font-bold shrink-0" style={{ color: probColor(f.probability * 100) }}>
                        {(f.probability * 100).toFixed(0)}%
                      </div>
                    </div>
                    {f.outcome === null && (
                      <div className="flex gap-1 mt-1.5">
                        <button onClick={() => resolveForcast(f.id, 1)} disabled={resolvingId === f.id}
                          className="text-xs bg-green-900/40 hover:bg-green-900/60 text-green-400 px-2 py-0.5 rounded transition">✓ Yes</button>
                        <button onClick={() => resolveForcast(f.id, 0)} disabled={resolvingId === f.id}
                          className="text-xs bg-red-900/40 hover:bg-red-900/60 text-red-400 px-2 py-0.5 rounded transition">✗ No</button>
                      </div>
                    )}
                    {f.brierScore !== null && (
                      <div className="text-xs text-slate-600 mt-1">
                        Brier: <span className={f.brierScore < 0.1 ? 'text-green-500' : f.brierScore < 0.25 ? 'text-yellow-500' : 'text-red-500'}>{f.brierScore.toFixed(3)}</span>
                        · Outcome: <span className="text-slate-400">{f.outcome ? 'YES' : 'NO'}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CENTER: Calculation Log */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            ⚡ Live Calculation
            {loading && <span className="text-blue-400 text-xs animate-pulse">running...</span>}
          </h2>
          <div ref={logRef} className="terminal-log bg-[#05050a] rounded-lg p-4 flex-1 min-h-[480px] max-h-[600px] overflow-y-auto border border-slate-800/50">
            {steps.length === 0 ? (
              <div className="text-slate-600 text-xs leading-relaxed">
                {'> '}Awaiting forecast...<br/><br/>
                {'> '}Enter a question and press Run Forecast.<br/>
                {'> '}Each step of the Tetlock calculation<br/>
                {'> '}will stream here in real-time.
              </div>
            ) : (
              steps.map((s, i) => (
                <div key={i} className={`${stepColor(s.type)} whitespace-pre-wrap`}>
                  {stepPrefix(s.type)}{s.message}
                </div>
              ))
            )}
            {loading && <div className="text-blue-400 animate-pulse mt-1">▊</div>}
          </div>
        </div>

        {/* RIGHT: Results */}
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 text-center">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Probability</h2>
            {result ? (
              <>
                <div className="text-5xl font-bold mb-1 tabular-nums" style={{ color: probColor(result.prob) }}>
                  {result.prob.toFixed(1)}%
                </div>
                <div className="text-xs text-slate-500 mb-3">90% CI: {result.low.toFixed(0)}% – {result.high.toFixed(0)}%</div>
                {result.baseRateLabel && (
                  <div className="text-xs text-slate-600 mb-3">Base rate: {result.baseRateLabel}</div>
                )}
                <div className="w-full bg-slate-800 rounded-full h-2 mb-4">
                  <div className="h-2 rounded-full transition-all duration-1000" style={{ width: `${result.prob}%`, backgroundColor: probColor(result.prob) }} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-800 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">YES</div>
                    <div className="text-2xl font-bold text-green-400">{result.prob.toFixed(0)}%</div>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">NO</div>
                    <div className="text-2xl font-bold text-red-400">{(100 - result.prob).toFixed(0)}%</div>
                  </div>
                </div>
                {result.articleCount > 0 && (
                  <div className="mt-3 text-xs text-slate-600">{result.articleCount} articles analysed</div>
                )}
              </>
            ) : (
              <div className="text-slate-600 text-sm py-10">
                Run a forecast<br/>to see results
              </div>
            )}
          </div>

          {/* Evidence Trail */}
          {result && result.factors.length > 0 && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Evidence Trail</h2>
              <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
                {result.factors.map((f, i) => (
                  <details key={i} className="group">
                    <summary className="cursor-pointer flex items-center justify-between py-2 border-b border-slate-800/60 text-xs hover:text-slate-200 transition">
                      <span className="text-slate-300">{f.label}</span>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-slate-600">{f.weight}%</span>
                        <span className="font-bold" style={{ color: probColor((f.adjustedScore / 10) * 100) }}>{f.adjustedScore.toFixed(1)}/10</span>
                        <span className="text-slate-600">{f.articleCount}art</span>
                      </div>
                    </summary>
                    <div className="pt-2 pb-3 space-y-2">
                      {f.evidence.length === 0 && (
                        <div className="text-xs text-slate-600 italic">No articles found for this factor.</div>
                      )}
                      {f.evidence.slice(0, 4).map((e, j) => (
                        <div key={j} className="bg-slate-800/60 rounded-lg p-2.5 text-xs">
                          <a href={e.url} target="_blank" rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 hover:underline line-clamp-2 font-medium leading-tight">
                            {e.title}
                          </a>
                          {e.excerpt && (
                            <div className="text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{e.excerpt}</div>
                          )}
                          <div className="text-slate-600 mt-1.5 flex items-center gap-1.5">
                            <span className={e.tier >= 1.0 ? 'text-green-600' : e.tier >= 0.85 ? 'text-blue-600' : 'text-slate-600'}>{e.tierLabel}</span>
                            <span>·</span>
                            <span>weight {e.tier.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
