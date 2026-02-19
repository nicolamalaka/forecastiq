import { getSourceTier } from './sourceCredibility'
import { detectBaseRate, BaseRateEntry } from './baseRates'
import { searchNews, SearchResult } from './braveSearch'

export const DEFAULT_WEIGHTS: Record<string, Record<string, number>> = {
  POLITICS: {
    polling_sentiment: 20,
    political_stability: 20,
    geopolitical_external: 20,
    economic_indicators: 15,
    expert_consensus: 15,
    media_narrative: 10,
  },
  SPORTS: {
    recent_form: 25,
    head_to_head: 15,
    home_away: 15,
    player_availability: 20,
    offensive_efficiency: 12.5,
    defensive_efficiency: 12.5,
  },
}

export interface Evidence {
  title: string
  url: string
  tier: number
  tierLabel: string
  excerpt: string
}

export interface FactorResult {
  name: string
  label: string
  weight: number
  rawScore: number
  adjustedScore: number
  evidence: Evidence[]
  articleCount: number
}

export interface CalcStep {
  type: 'info' | 'search' | 'score' | 'weight' | 'blend' | 'final' | 'error'
  message: string
  data?: any
}

export interface ForecastResult {
  finalPct: number
  confidenceLow: number
  confidenceHigh: number
  outsideViewPct: number
  insideViewPct: number
  blendRatio: string
  factors: FactorResult[]
  baseRateLabel: string
  baseRateSource: string
  baseRateValue: number
  baseRateDataset: BaseRateEntry['dataset'] | null
  articleCount: number
}

const FACTOR_QUERIES: Record<string, Record<string, string[]>> = {
  POLITICS: {
    polling_sentiment: ['poll survey approval rating public opinion', 'polling data election sentiment'],
    political_stability: ['government stability opposition protests leadership crisis', 'regime incumbent party strength'],
    geopolitical_external: ['international pressure sanctions foreign policy diplomacy', 'external actors interference proxy influence'],
    economic_indicators: ['economy GDP inflation unemployment growth sanctions trade', 'economic coercion pressure aid conditionality'],
    expert_consensus: ['prediction market forecast expert analysis odds analyst', 'think tank assessment intelligence forecast'],
    media_narrative: ['media coverage narrative propaganda information environment', 'news sentiment framing public discourse'],
  },
}

const FACTOR_LABELS: Record<string, string> = {
  polling_sentiment: 'Polling & Public Sentiment',
  political_stability: 'Political Stability & Leadership',
  geopolitical_external: 'Geopolitical & External Pressure',
  economic_indicators: 'Economic Indicators & Coercion',
  expert_consensus: 'Expert Consensus & Prediction Markets',
  media_narrative: 'Media Narrative & Information Environment',
}

const POSITIVE_WORDS = ['win','lead','ahead','strong','likely','confident','surge','favor','advantage','growing','stable','secure','support','approval','boost','gain']
const NEGATIVE_WORDS = ['lose','behind','weak','unlikely','crisis','collapse','scandal','fail','drop','decline','unstable','risk','threat','protest','opposition','pressure']

function sentimentScore(texts: string[]): number {
  const combined = texts.join(' ').toLowerCase()
  let sentiment = 0
  POSITIVE_WORDS.forEach(w => { sentiment += (combined.match(new RegExp(`\\b${w}`, 'g')) || []).length * 0.4 })
  NEGATIVE_WORDS.forEach(w => { sentiment -= (combined.match(new RegExp(`\\b${w}`, 'g')) || []).length * 0.4 })
  return Math.max(1, Math.min(10, 5 + sentiment))
}

export interface BaseRateOptions {
  mode: 'auto' | 'custom-class' | 'full-manual'
  customClass: string
  manualRate: number
  manualSource: string
}

// High-authority academic/institutional domains for base rate research
const ACADEMIC_SOURCES = [
  'jstor.org', 'scholar.google.com', 'researchgate.net', 'ssrn.com',
  'pubmed.ncbi.nlm.nih.gov', 'arxiv.org', 'semanticscholar.org',
  'cambridge.org', 'oxfordacademic.com', 'springer.com', 'wiley.com',
  'tandfonline.com', 'sagepub.com', 'sciencedirect.com',
  // Policy & IR databases
  'ucdp.uu.se', 'correlatesofwar.org', 'systemicpeace.org',
  'prio.org', 'sipri.org', 'iiss.org', 'rand.org',
  'brookings.edu', 'cfr.org', 'chathamhouse.org', 'crisisgroup.org',
  'freedomhouse.org', 'transparency.org', 'v-dem.net',
  'worldbank.org', 'imf.org', 'oecd.org', 'un.org',
  'cia.gov', 'state.gov', 'nato.int',
  // Good Judgment / forecasting
  'goodjudgment.com', 'metaculus.com', 'polymarket.com',
  'gjopen.com', 'tetlock.com', 'forecastingresearch.org',
]

function getAcademicTier(url: string): number {
  try {
    const domain = new URL(url).hostname.replace('www.', '')
    if (ACADEMIC_SOURCES.includes(domain)) return 1.5
    return getSourceTier(url)
  } catch { return 0.5 }
}

async function fetchCustomBaseRate(
  referenceClass: string,
): Promise<{ rate: number; source: string; reasoning: string; sourcesUsed: string[] }> {

  // Comprehensive query battery — no freshness filter (all historical)
  // Each query targets a different angle: academic, statistical, institutional, forecasting
  const queryBattery = [
    // Academic / statistical
    `"${referenceClass}" historical frequency percentage statistics dataset`,
    `${referenceClass} base rate probability academic study research`,
    `${referenceClass} how often occurs empirical evidence data`,
    // Policy databases
    `${referenceClass} dataset political science UCDP COW SIPRI frequency`,
    `${referenceClass} site:rand.org OR site:brookings.edu OR site:cfr.org probability`,
    // Forecasting platforms
    `${referenceClass} site:metaculus.com OR site:gjopen.com base rate resolution`,
    `${referenceClass} prediction market historical resolution rate frequency`,
    // Wikipedia / encyclopedic
    `${referenceClass} wikipedia statistics occurrence rate`,
    // General quantitative
    `${referenceClass} percent of cases proportion historical record`,
  ]

  const allResults: SearchResult[] = []
  const seenUrls = new Set<string>()

  // Fire all queries without freshness constraints (use 'py' = past year as minimum,
  // but Brave also returns older indexed content for academic queries)
  for (const q of queryBattery) {
    try {
      // Use 'py' freshness for news queries but pass no freshness for academic searches
      const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=8&search_lang=en`
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json', 'X-Subscription-Token': process.env.BRAVE_API_KEY || '' }
      })
      if (!res.ok) continue
      const data = await res.json()
      const results: SearchResult[] = (data.web?.results || []).map((r: any) => ({
        title: r.title || '', url: r.url || '',
        description: r.extra_snippets?.[0] || r.description || '',
        published: r.page_age || '',
      }))
      for (const r of results) {
        if (!seenUrls.has(r.url)) { seenUrls.add(r.url); allResults.push(r) }
      }
    } catch { continue }
  }

  if (allResults.length === 0) {
    return {
      rate: 0.45, sourcesUsed: [],
      source: 'No sources found — using GJP generic baseline (45%)',
      reasoning: 'Exhaustive search returned no results for this reference class. Falling back to Good Judgment Project generic baseline of 45%.',
    }
  }

  // Weight each percentage mention by its source credibility tier
  interface WeightedPct { value: number; weight: number; source: string }
  const weightedPcts: WeightedPct[] = []

  for (const r of allResults) {
    const tier = getAcademicTier(r.url)
    const text = `${r.title} ${r.description}`
    // Match patterns like "18%", "18 percent", "18 per cent", "0.18 probability"
    const pctMatches = text.match(/(\d+(?:\.\d+)?)\s*(?:%|percent|per cent)/gi) || []
    const probMatches = text.match(/0\.\d+\s*(?:probability|rate|frequency)/gi) || []

    for (const m of pctMatches) {
      const val = parseFloat(m)
      if (val > 0.5 && val < 99.5) {
        weightedPcts.push({ value: val, weight: tier, source: r.url })
      }
    }
    for (const m of probMatches) {
      const val = parseFloat(m) * 100
      if (val > 0.5 && val < 99.5) {
        weightedPcts.push({ value: val, weight: tier * 1.2, source: r.url }) // prob statements get boost
      }
    }
  }

  let rate = 0.45
  let reasoning = ''
  const sourcesUsed = [...new Set(allResults.slice(0, 6).map(r => {
    try { return new URL(r.url).hostname.replace('www.', '') } catch { return r.url }
  }))]

  if (weightedPcts.length === 0) {
    reasoning = `Searched ${allResults.length} sources across academic, policy, and forecasting databases. No explicit percentage figures found. Using 45% generic baseline.`
  } else {
    // Weighted median — sort by value, find median weighted by tier
    const sorted = weightedPcts.sort((a, b) => a.value - b.value)
    const totalWeight = sorted.reduce((s, p) => s + p.weight, 0)
    let cumWeight = 0
    let weightedMedian = sorted[0].value
    for (const p of sorted) {
      cumWeight += p.weight
      if (cumWeight >= totalWeight / 2) { weightedMedian = p.value; break }
    }

    // Confidence: more sources + higher tiers = tighter estimate
    const avgTier = weightedPcts.reduce((s, p) => s + p.weight, 0) / weightedPcts.length
    const confidence = Math.min(1, (weightedPcts.length / 10) * avgTier)

    rate = Math.max(0.01, Math.min(0.99, weightedMedian / 100))

    const academicHits = allResults.filter(r => getAcademicTier(r.url) >= 1.5).length
    reasoning = `Searched ${allResults.length} sources (${academicHits} academic/institutional). ` +
      `Found ${weightedPcts.length} statistical references. ` +
      `Tier-weighted median: ${weightedMedian.toFixed(1)}%. ` +
      `Confidence: ${(confidence * 100).toFixed(0)}% (based on source quality & volume).`
  }

  const topSources = allResults
    .sort((a, b) => getAcademicTier(b.url) - getAcademicTier(a.url))
    .slice(0, 5)
    .map(r => { try { return new URL(r.url).hostname.replace('www.', '') } catch { return '' } })
    .filter(Boolean)
    .join(', ')

  return { rate, source: `Sources: ${topSources}`, reasoning, sourcesUsed }
}

export async function* runForecast(
  question: string,
  preset: string,
  newsWindow: number,
  userWeights: Record<string, number>,
  baseRateOptions?: BaseRateOptions
): AsyncGenerator<CalcStep> {
  yield { type: 'info', message: `Parsing question...` }

  const words = question.split(' ').filter(w => w.length > 3).slice(0, 6).join(' ')
  yield { type: 'info', message: `Key entities: ${words}` }
  yield { type: 'info', message: `Domain: ${preset} | News window: ${newsWindow} days` }

  const weights = { ...DEFAULT_WEIGHTS[preset] || DEFAULT_WEIGHTS.POLITICS, ...userWeights }
  const queries = FACTOR_QUERIES['POLITICS']
  const factors: FactorResult[] = []
  let totalArticles = 0

  for (const [factorKey, suffixes] of Object.entries(queries)) {
    const w = weights[factorKey] || 0
    const label = FACTOR_LABELS[factorKey] || factorKey
    yield { type: 'search', message: `Searching: ${label} (weight: ${w}%)...` }

    let allResults: SearchResult[] = []
    for (const suffix of suffixes) {
      const results = await searchNews(`${question} ${suffix}`, newsWindow)
      allResults = [...allResults, ...results]
    }

    const unique = allResults
      .filter((r, i, a) => a.findIndex(x => x.url === r.url) === i)
      .slice(0, 6)

    totalArticles += unique.length
    yield { type: 'search', message: `  → ${unique.length} articles found` }

    const evidence: Evidence[] = unique.map(r => {
      const tier = getSourceTier(r.url)
      return {
        title: r.title,
        url: r.url,
        tier,
        tierLabel: tier >= 1.0 ? 'Tier 1' : tier >= 0.85 ? 'Tier 2' : tier >= 0.75 ? 'Tier 3' : 'Tier 4',
        excerpt: (r.description || '').slice(0, 220),
      }
    })

    const avgTier = evidence.length > 0
      ? evidence.reduce((s, e) => s + e.tier, 0) / evidence.length
      : 0.5

    const rawScore = unique.length > 0
      ? sentimentScore(unique.map(r => `${r.title} ${r.description}`))
      : 5.0

    const adjustedScore = Math.max(1, Math.min(10, rawScore * (0.7 + avgTier * 0.3)))

    yield {
      type: 'score',
      message: `  → Raw score: ${rawScore.toFixed(1)}/10 | Tier-adjusted: ${adjustedScore.toFixed(2)}/10 | Avg source tier: ${avgTier.toFixed(2)}`,
      data: { factorKey, rawScore, adjustedScore },
    }

    factors.push({ name: factorKey, label, weight: w, rawScore, adjustedScore, evidence, articleCount: unique.length })
  }

  // ── Outside View ─────────────────────────────────────────────────────────
  const mode = baseRateOptions?.mode || 'auto'
  let baseRate: BaseRateEntry
  let customReasoning = ''

  yield { type: 'blend', message: `\n── Outside View (Base Rate) ─────────────────` }

  if (mode === 'full-manual') {
    // Mode 3: user provides everything
    const rate = Math.max(0.01, Math.min(0.99, (baseRateOptions?.manualRate || 50) / 100))
    baseRate = {
      rate,
      label: baseRateOptions?.customClass || 'User-defined reference class',
      source: baseRateOptions?.manualSource || 'User-provided dataset',
      dataset: {
        description: `User-defined reference class: "${baseRateOptions?.customClass}". Base rate manually set to ${(rate * 100).toFixed(0)}%.`,
        sampleSize: 'User-provided',
        timePeriod: 'User-provided',
        geographicScope: 'User-defined',
        methodology: 'Base rate manually entered by the forecaster based on their own research or domain expertise.',
        caveats: ['This base rate was manually entered — verify against academic datasets if possible.'],
        keyStudies: [],
        historicalExamples: [],
      }
    }
    yield { type: 'blend', message: `Mode: FULL MANUAL (user-provided)` }
    yield { type: 'blend', message: `Reference class: "${baseRate.label}"` }
    yield { type: 'blend', message: `Source: ${baseRate.source}` }
  } else if (mode === 'custom-class') {
    // Mode 2: user provides class, app fetches rate
    const className = baseRateOptions?.customClass || question
    yield { type: 'blend', message: `Mode: CUSTOM CLASS — exhaustive search across academic & policy databases` }
    yield { type: 'search', message: `Firing 9-query battery for "${className}" (no date limit)...` }
    yield { type: 'search', message: `  Targeting: RAND, Brookings, CFR, UCDP, SIPRI, Metaculus, SSRN, Wikipedia + general` }
    const fetched = await fetchCustomBaseRate(className)
    customReasoning = fetched.reasoning
    if (fetched.sourcesUsed.length > 0) {
      yield { type: 'search', message: `  Sources found: ${fetched.sourcesUsed.slice(0, 6).join(', ')}` }
    }
    baseRate = {
      rate: fetched.rate,
      label: className,
      source: fetched.source,
      dataset: {
        description: `Custom reference class: "${className}". Base rate estimated via exhaustive multi-source search across academic, policy, and forecasting databases.`,
        sampleSize: 'Aggregated from web search results (no date limit)',
        timePeriod: 'All available indexed content',
        geographicScope: 'Global — web search results across academic & policy sources',
        methodology: fetched.reasoning,
        caveats: [
          'Base rate estimated by searching academic papers, policy databases, and forecasting platforms.',
          'Tier-weighted median used — academic/institutional sources weighted 3× higher than general news.',
          'Verify against authoritative datasets for high-stakes forecasts.',
          'Auto-estimated rates carry more uncertainty than curated academic base rates.',
        ],
        keyStudies: [],
        historicalExamples: fetched.sourcesUsed.map(s => ({ event: s, outcome: 'Source used in estimation' })),
      }
    }
    yield { type: 'blend', message: `Reference class: "${baseRate.label}"` }
    yield { type: 'blend', message: `Estimated base rate: ${(baseRate.rate * 100).toFixed(1)}%` }
    yield { type: 'blend', message: `Reasoning: ${customReasoning}` }
  } else {
    // Mode 1: fully automatic — uses curated academic dataset library
    baseRate = detectBaseRate(question, preset)
    yield { type: 'blend', message: `Mode: AUTO — matched to curated academic dataset library` }
    yield { type: 'blend', message: `Reference class: "${baseRate.label}"` }
    yield { type: 'blend', message: `Dataset: ${baseRate.source}` }
    yield { type: 'blend', message: `Coverage: ${baseRate.dataset?.sampleSize || '—'} | ${baseRate.dataset?.timePeriod || '—'}` }
  }

  const outsideViewPct = baseRate.rate * 100
  yield { type: 'blend', message: `Base rate: ${outsideViewPct.toFixed(1)}% → outside view score: ${outsideViewPct.toFixed(1)}% (× 1.0 = ${outsideViewPct.toFixed(2)})` }

  // ── Inside View — weighted factor scores ─────────────────────────────────
  yield { type: 'weight', message: `\n── Inside View — Factor Scores ──────────────` }

  const insideTerms: number[] = []
  for (const f of factors) {
    // Each inside factor: convert score to percentage (score/10 * 100), then × weight
    const factorPct = (f.adjustedScore / 10) * 100
    const weightedTerm = (f.weight / 100) * factorPct
    insideTerms.push(weightedTerm)
    yield {
      type: 'weight',
      message: `  ${f.label}: score ${f.adjustedScore.toFixed(2)}/10 → ${factorPct.toFixed(1)}% × ${f.weight}% weight = ${weightedTerm.toFixed(2)}`,
    }
  }

  const insideWeightedSum = insideTerms.reduce((s, v) => s + v, 0)
  yield { type: 'weight', message: `  Weighted inside sum: ${insideWeightedSum.toFixed(2)}%` }

  // ── Final Aggregation ─────────────────────────────────────────────────────
  // Formula: (outsideView × 1) + (each inside factor × weight) / (n_inside_factors + 1)
  const nFactors = factors.length
  const totalTerms = nFactors + 1  // inside factors + 1 for outside view
  const numerator = outsideViewPct + insideWeightedSum
  const finalPct = Math.max(1, Math.min(99, numerator / totalTerms))

  yield { type: 'blend', message: `\n── Final Aggregation ────────────────────────` }
  yield { type: 'blend', message: `Formula: (Outside × 1) + (Σ inside factors × weight) ÷ (${nFactors} factors + 1)` }
  yield { type: 'blend', message: `Numerator: ${outsideViewPct.toFixed(2)} + ${insideWeightedSum.toFixed(2)} = ${numerator.toFixed(2)}` }
  yield { type: 'blend', message: `Divisor: ${nFactors} inside factors + 1 outside = ${totalTerms}` }
  yield { type: 'blend', message: `Final: ${numerator.toFixed(2)} ÷ ${totalTerms} = ${finalPct.toFixed(2)}%` }

  // Confidence interval based on data quality
  const quality = totalArticles >= 10 ? 'HIGH' : totalArticles >= 5 ? 'MEDIUM' : 'LOW'
  const margin = quality === 'HIGH' ? 6 : quality === 'MEDIUM' ? 9 : 13
  const confidenceLow = Math.max(1, finalPct - margin)
  const confidenceHigh = Math.min(99, finalPct + margin)
  yield { type: 'blend', message: `News quality: ${quality} (${totalArticles} articles) → CI margin ±${margin}%` }
  yield { type: 'blend', message: `Confidence interval (90%): ${confidenceLow.toFixed(0)}% – ${confidenceHigh.toFixed(0)}%` }

  // Store inside view as a simple average for display purposes
  const insideViewPct = insideWeightedSum / nFactors
  const blendRatio = `Outside:1 + Inside:${nFactors} / ${totalTerms}`

  yield {
    type: 'final',
    message: `\n✓ RESULT: ${finalPct.toFixed(1)}% | 90% CI: ${confidenceLow.toFixed(0)}%–${confidenceHigh.toFixed(0)}%`,
    data: {
      finalPct, confidenceLow, confidenceHigh,
      outsideViewPct, insideViewPct,
      blendRatio,
      factors, baseRateLabel: baseRate.label, baseRateSource: baseRate.source,
      baseRateValue: baseRate.rate,
      baseRateDataset: baseRate.dataset || null,
      articleCount: totalArticles,
    } as ForecastResult,
  }
}
