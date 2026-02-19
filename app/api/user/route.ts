import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { username } = await req.json()
  if (!username?.trim()) return NextResponse.json({ error: 'Username required' }, { status: 400 })
  let user = await prisma.user.findUnique({ where: { username: username.trim() } })
  if (!user) user = await prisma.user.create({ data: { username: username.trim() } })
  return NextResponse.json(user)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
  const forecasts = await prisma.forecast.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
  const resolved = forecasts.filter(f => f.brierScore !== null)
  const avgBrier = resolved.length
    ? resolved.reduce((s, f) => s + (f.brierScore || 0), 0) / resolved.length
    : null
  return NextResponse.json({ forecasts, avgBrier })
}
