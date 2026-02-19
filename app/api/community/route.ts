import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/community — list all users with stats
// GET /api/community?userId=xxx — get one user's public profile + forecasts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (userId) {
    // Single user profile
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const forecasts = await prisma.forecast.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    const resolved = forecasts.filter(f => f.brierScore !== null)
    const avgBrier = resolved.length
      ? resolved.reduce((s, f) => s + (f.brierScore || 0), 0) / resolved.length
      : null

    return NextResponse.json({
      user: { id: user.id, username: user.username, createdAt: user.createdAt },
      forecasts,
      avgBrier,
      stats: {
        total: forecasts.length,
        resolved: resolved.length,
        pending: forecasts.length - resolved.length,
        avgBrier,
        brierLabel: avgBrier === null ? null
          : avgBrier < 0.10 ? 'Superforecaster'
          : avgBrier < 0.20 ? 'Very Good'
          : avgBrier < 0.25 ? 'Average'
          : 'Needs Work',
      },
    })
  }

  // All users leaderboard
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      forecasts: { select: { brierScore: true, outcome: true, createdAt: true } },
    },
  })

  const leaderboard = users.map(u => {
    const resolved = u.forecasts.filter(f => f.brierScore !== null)
    const avgBrier = resolved.length
      ? resolved.reduce((s, f) => s + (f.brierScore || 0), 0) / resolved.length
      : null
    return {
      id: u.id,
      username: u.username,
      createdAt: u.createdAt,
      totalForecasts: u.forecasts.length,
      resolvedForecasts: resolved.length,
      pendingForecasts: u.forecasts.length - resolved.length,
      avgBrier,
      brierLabel: avgBrier === null ? 'Unscored'
        : avgBrier < 0.10 ? 'Superforecaster'
        : avgBrier < 0.20 ? 'Very Good'
        : avgBrier < 0.25 ? 'Average'
        : 'Needs Work',
    }
  })
  // Sort: scored users first (by Brier asc), then unscored by forecast count
  .sort((a, b) => {
    if (a.avgBrier !== null && b.avgBrier !== null) return a.avgBrier - b.avgBrier
    if (a.avgBrier !== null) return -1
    if (b.avgBrier !== null) return 1
    return b.totalForecasts - a.totalForecasts
  })

  return NextResponse.json(leaderboard)
}
