'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const DOMAINS = [
  {
    id: 'POLITICS',
    label: '🗳️ Political Forecasts',
    factors: [
      { id: 'polling_sentiment', label: 'Polling & Public Sentiment', desc: 'Poll data, approval ratings, public opinion surveys' },
      { id: 'political_stability', label: 'Political Stability & Leadership', desc: 'Government cohesion, opposition strength, incumbency, protests' },
      { id: 'geopolitical_external', label: 'Geopolitical & External Pressure', desc: 'Foreign pressure, sanctions, proxy interference, diplomacy' },
      { id: 'economic_indicators', label: 'Economic Indicators & Coercion', desc: 'GDP, inflation, unemployment, trade pressure, aid conditionality' },
      { id: 'expert_consensus', label: 'Expert Consensus & Prediction Markets', desc: 'Analyst forecasts, think tank assessments, prediction market odds' },
      { id: 'media_narrative', label: 'Media Narrative & Information Environment', desc: 'Coverage tone, propaganda, information operations, public discourse' },
    ],
    defaults: { polling_sentiment: 20, political_stability: 20, geopolitical_external: 20, economic_indicators: 15, expert_consensus: 15, media_narrative: 10 } as Record<string, number>,
  },
  {
    id: 'SPORTS',
    label: '🏆 Sports',
    factors: [
      { id: 'recent_form', label: 'Recent Form (last 5)', desc: 'Results in last 5 games/matches' },
      { id: 'head_to_head', label: 'Head-to-Head Record', desc: 'Historical matchup win rate' },
      { id: 'home_away', label: 'Home/Away Advantage', desc: 'Venue factor and travel fatigue' },
      { id: 'player_availability', label: 'Key Player Availability', desc: 'Injuries, suspensions, key absences' },
      { id: 'offensive_efficiency', label: 'Offensive Efficiency', desc: 'Scoring rate, shooting %, production' },
      { id: 'defensive_efficiency', label: 'Defensive Efficiency', desc: 'Points/goals conceded, defensive record' },
    ],
    defaults: { recent_form: 25, head_to_head: 15, home_away: 15, player_availability: 20, offensive_efficiency: 12.5, defensive_efficiency: 12.5 } as Record<string, number>,
  },
]

export default function WeightsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [activeDomain, setActiveDomain] = useState('POLITICS')
  const [weights, setWeights] = useState<Record<string, Record<string, number>>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('forecastiq_user')
    if (stored) {
      const u = JSON.parse(stored)
      setUserId(u.id)
      setUsername(u.username)
    }
    // Init all domains with defaults
    const init: Record<string, Record<string, number>> = {}
    for (const d of DOMAINS) init[d.id] = { ...d.defaults }
    setWeights(init)
  }, [])

  const domain = DOMAINS.find(d => d.id === activeDomain)!
  const current = weights[activeDomain] || domain.defaults
  const total = Object.values(current).reduce((s, v) => s + v, 0)
  const isValid = Math.abs(total - 100) < 0.5

  const updateWeight = (factorId: string, value: number) => {
    setWeights(prev => ({
      ...prev,
      [activeDomain]: { ...prev[activeDomain], [factorId]: value },
    }))
    setSaved(false)
  }

  const resetToDefaults = () => {
    setWeights(prev => ({ ...prev, [activeDomain]: { ...domain.defaults } }))
    setSaved(false)
  }

  const saveWeights = async () => {
    if (!userId) return
    for (const d of DOMAINS) {
      await fetch('/api/weights', {
        method: 'POST',
        body: JSON.stringify({ userId, domain: d.id, weights: weights[d.id] || d.defaults }),
        headers: { 'Content-Type': 'application/json' },
      })
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Sample calc preview using current weights
  const sampleScores: Record<string, number> = {
    polling_sentiment: 6.8, political_stability: 5.5, geopolitical_external: 7.0,
    economic_indicators: 5.8, expert_consensus: 6.5, media_narrative: 5.2,
    recent_form: 7.0, head_to_head: 6.0, home_away: 7.0,
    player_availability: 8.0, offensive_efficiency: 6.5, defensive_efficiency: 5.5,
  }
  const previewScore = domain.factors.reduce((sum, f) => {
    return sum + ((current[f.id] || 0) / 100) * (sampleScores[f.id] || 5)
  }, 0)
  const previewPct = Math.max(1, Math.min(99, (previewScore / 10) * 100))

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-200">
      <header className="border-b border-slate-800/60 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xl font-bold text-white tracking-tight hover:text-blue-400 transition">⚡ ForecastIQ</Link>
          <span className="text-slate-600 text-xs">/ Weight Editor</span>
        </div>
        {username && <span className="text-sm text-slate-400">👤 {username}</span>}
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Weight Editor</h1>
          <p className="text-slate-500 text-sm">Customise how much each factor influences the final probability. Weights must sum to 100% per domain.</p>
        </div>

        {!userId && (
          <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4 mb-6 text-sm text-yellow-400">
            ⚠️ You're not logged in. Weights won't be saved. Return to the <Link href="/" className="underline">homepage</Link> and enter a username first.
          </div>
        )}

        {/* Domain tabs */}
        <div className="flex gap-2 mb-6">
          {DOMAINS.map(d => (
            <button key={d.id} onClick={() => setActiveDomain(d.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeDomain === d.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
              {d.label}
            </button>
          ))}
          <div className="ml-auto text-xs text-slate-600 self-center">2 presets · weights must sum to 100%</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weight sliders */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{domain.label} Factors</h2>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold ${isValid ? 'text-green-400' : 'text-red-400'}`}>
                  Total: {total.toFixed(1)}%
                </span>
                {!isValid && <span className="text-xs text-red-400">Must equal 100%</span>}
              </div>
            </div>

            <div className="space-y-5">
              {domain.factors.map(f => (
                <div key={f.id}>
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <div className="text-sm text-slate-200 font-medium">{f.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{f.desc}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <input
                        type="number" min={0} max={100} step={0.5}
                        value={current[f.id] || 0}
                        onChange={e => updateWeight(f.id, Number(e.target.value))}
                        className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-slate-500 text-sm">%</span>
                    </div>
                  </div>
                  <input
                    type="range" min={0} max={60} step={0.5}
                    value={current[f.id] || 0}
                    onChange={e => updateWeight(f.id, Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-slate-700 mt-0.5">
                    <span>0%</span>
                    <span className="text-slate-500">default: {domain.defaults[f.id as keyof typeof domain.defaults]}%</span>
                    <span>60%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={resetToDefaults}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition">
                ↺ Reset to defaults
              </button>
              <button onClick={saveWeights} disabled={!isValid || !userId}
                className={`px-6 py-2 text-sm rounded-lg font-medium transition ${isValid && userId ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
                {saved ? '✓ Saved!' : '💾 Save weights'}
              </button>
            </div>
          </div>

          {/* Preview panel */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Live Preview</h3>
              <p className="text-xs text-slate-500 mb-4">Using sample factor scores to show how your weights affect the output:</p>
              <div className="space-y-2 mb-4">
                {domain.factors.map(f => {
                  const score = sampleScores[f.id] || 5
                  const contribution = ((current[f.id] || 0) / 100) * score
                  return (
                    <div key={f.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 truncate mr-2">{f.label.split(' ')[0]}</span>
                      <span className="text-slate-600 shrink-0">{(current[f.id] || 0)}% × {score} = <span className="text-yellow-400">{contribution.toFixed(2)}</span></span>
                    </div>
                  )
                })}
              </div>
              <div className="border-t border-slate-800 pt-3">
                <div className="text-xs text-slate-500 mb-2">Inside view probability:</div>
                <div className="text-3xl font-bold" style={{ color: previewPct >= 65 ? '#22c55e' : previewPct >= 45 ? '#eab308' : '#ef4444' }}>
                  {previewPct.toFixed(1)}%
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                  <div className="h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${previewPct}%`, backgroundColor: previewPct >= 65 ? '#22c55e' : previewPct >= 45 ? '#eab308' : '#ef4444' }} />
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Weight Distribution</h3>
              <div className="space-y-1.5">
                {domain.factors.map(f => {
                  const pct = current[f.id] || 0
                  return (
                    <div key={f.id}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-slate-400 truncate mr-2">{f.label}</span>
                        <span className="text-slate-300 shrink-0">{pct.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1">
                        <div className="h-1 rounded-full bg-blue-500 transition-all duration-200" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <Link href="/" className="block text-center py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition">
              ← Back to Forecasts
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
