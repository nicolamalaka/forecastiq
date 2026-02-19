import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { forecastId, outcome } = await req.json()
  const forecast = await prisma.forecast.findUnique({ where: { id: forecastId } })
  if (!forecast) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const brierScore = Math.pow(forecast.probability - outcome, 2)
  const updated = await prisma.forecast.update({
    where: { id: forecastId },
    data: { outcome, brierScore, resolvedAt: new Date() },
  })
  return NextResponse.json(updated)
}
