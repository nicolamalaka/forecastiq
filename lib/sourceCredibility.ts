export const SOURCE_TIERS: Record<string, number> = {
  'reuters.com': 1.0, 'apnews.com': 1.0, 'bbc.com': 1.0,
  'nytimes.com': 1.0, 'ft.com': 1.0, 'theguardian.com': 1.0,
  'washingtonpost.com': 1.0, 'bbc.co.uk': 1.0,
  'cnn.com': 0.85, 'bloomberg.com': 0.85, 'politico.com': 0.85,
  'economist.com': 0.85, 'nbcnews.com': 0.85, 'abcnews.go.com': 0.85,
  'cbsnews.com': 0.85, 'wsj.com': 0.85, 'axios.com': 0.85,
  'aljazeera.com': 0.80, 'thehindu.com': 0.80, 'scmp.com': 0.75,
  'foreignpolicy.com': 0.80, 'cfr.org': 0.85, 'chathamhouse.org': 0.85,
  'brookings.edu': 0.85, 'rand.org': 0.85, 'iiss.org': 0.85,
}

export function getSourceTier(url: string): number {
  try {
    const domain = new URL(url).hostname.replace('www.', '')
    return SOURCE_TIERS[domain] || 0.50
  } catch {
    return 0.50
  }
}

export function getTierLabel(tier: number): string {
  if (tier >= 1.0) return 'Tier 1 — Premium'
  if (tier >= 0.85) return 'Tier 2 — Major'
  if (tier >= 0.75) return 'Tier 3 — Established'
  if (tier >= 0.50) return 'Tier 4 — Standard'
  return 'Tier 5 — Unknown'
}
