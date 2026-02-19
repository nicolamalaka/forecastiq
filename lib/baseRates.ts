export interface BaseRateEntry {
  rate: number
  label: string
  source: string
}

export function detectBaseRate(question: string, domain: string): BaseRateEntry {
  const q = question.toLowerCase()

  if (domain === 'SPORTS') {
    if (q.includes('home')) return { rate: 0.58, label: 'Home team wins', source: 'NCAA/historical averages' }
    return { rate: 0.50, label: 'Generic sports outcome', source: 'Coin flip baseline' }
  }

  // Politics base rates
  if (q.includes('re-elect') || (q.includes('incumbent') && q.includes('win')))
    return { rate: 0.65, label: 'Incumbent wins re-election', source: 'Tetlock GJP dataset' }
  if (q.includes('snap election') || q.includes('early election') || q.includes('dissolve parliament'))
    return { rate: 0.18, label: 'Snap/early election called', source: 'Historical parliamentary data' }
  if (q.includes('coup') || q.includes('overthrow') || q.includes('military takeover'))
    return { rate: 0.08, label: 'Coup attempt succeeds', source: 'Powell & Thyne coup dataset' }
  if (q.includes('ceasefire') || q.includes('peace deal') || q.includes('peace agreement'))
    return { rate: 0.35, label: 'Ceasefire/peace deal holds 1yr', source: 'UCDP conflict data' }
  if (q.includes('sanction') || q.includes('sanctions'))
    return { rate: 0.42, label: 'New sanctions imposed', source: 'GSDB sanctions dataset' }
  if (q.includes('nuclear') || q.includes('test') || q.includes('missile'))
    return { rate: 0.28, label: 'Nuclear/missile test conducted', source: 'SIPRI/38North data' }
  if (q.includes('resign') || q.includes('resignation'))
    return { rate: 0.22, label: 'Leader resigns', source: 'Archigos dataset' }
  if (q.includes('pass') || q.includes('legislation') || q.includes('bill') || q.includes('law'))
    return { rate: 0.55, label: 'Legislation passes', source: 'Congressional/parliamentary data' }
  if (q.includes('default') || q.includes('debt crisis'))
    return { rate: 0.12, label: 'Sovereign debt default', source: 'Reinhart & Rogoff dataset' }
  if (q.includes('win') && q.includes('election'))
    return { rate: 0.52, label: 'Candidate wins election', source: 'Historical election data' }

  // Nat sec specific
  if (q.includes('invasion') || q.includes('military action') || q.includes('attack'))
    return { rate: 0.15, label: 'Military action initiated', source: 'MID dataset' }
  if (q.includes('alliance') || q.includes('treaty'))
    return { rate: 0.40, label: 'Alliance/treaty concluded', source: 'ATOP dataset' }

  return { rate: 0.45, label: 'Generic political event occurs', source: 'GJP baseline' }
}
