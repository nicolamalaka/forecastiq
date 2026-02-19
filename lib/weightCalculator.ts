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

export async function* runForecast(
  question: string,
  preset: string,
  newsWindow: number,
  userWeights: Record<string, number>
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
  const baseRate = detectBaseRate(question, preset)
  const outsideViewPct = baseRate.rate * 100

  yield { type: 'blend', message: `\n── Outside View (Base Rate) ─────────────────` }
  yield { type: 'blend', message: `Reference class: "${baseRate.label}"` }
  yield { type: 'blend', message: `Dataset: ${baseRate.source}` }
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
