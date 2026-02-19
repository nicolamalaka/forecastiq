export interface SearchResult {
  title: string
  url: string
  description: string
  published?: string
}

export async function searchNews(query: string, daysBack: number = 14): Promise<SearchResult[]> {
  const freshness = daysBack <= 7 ? 'pw' : daysBack <= 30 ? 'pm' : 'py'
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8&freshness=${freshness}&search_lang=en`

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': process.env.BRAVE_API_KEY || '',
      },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.web?.results || []).map((r: any) => ({
      title: r.title || '',
      url: r.url || '',
      description: r.extra_snippets?.[0] || r.description || '',
      published: r.page_age || '',
    }))
  } catch {
    return []
  }
}
