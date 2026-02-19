import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { userId, domain, weights } = await req.json()
  if (!userId || !domain || !weights) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const record = await prisma.userWeights.upsert({
    where: { userId_domain: { userId, domain } },
    update: { weights: JSON.stringify(weights) },
    create: { userId, domain, weights: JSON.stringify(weights) },
  })
  return NextResponse.json(record)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const domain = searchParams.get('domain')
  if (!userId || !domain) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const record = await prisma.userWeights.findUnique({
    where: { userId_domain: { userId, domain } },
  })
  if (!record) return NextResponse.json(null)
  return NextResponse.json(JSON.parse(record.weights))
}
