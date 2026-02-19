import { NextRequest } from 'next/server'
import { runForecast, ForecastResult, DEFAULT_WEIGHTS } from '@/lib/weightCalculator'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { question, preset, newsWindow, userId, userWeights: providedWeights, baseRateMode, customClass, manualRate, manualSource } = await req.json()

  // Load saved user weights from DB and merge with defaults
  let userWeights: Record<string, number> = {}
  if (userId) {
    const saved = await prisma.userWeights.findUnique({
      where: { userId_domain: { userId, domain: preset || 'POLITICS' } },
    })
    if (saved) {
      try { userWeights = JSON.parse(saved.weights) } catch {}
    }
  }
  // Provided weights (from request) override saved weights
  if (providedWeights && Object.keys(providedWeights).length > 0) {
    userWeights = { ...userWeights, ...providedWeights }
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

      try {
        let finalData: ForecastResult | null = null

        for await (const step of runForecast(question, preset || 'POLITICS', newsWindow || 14, userWeights || {}, {
          mode: baseRateMode || 'auto',
          customClass: customClass || '',
          manualRate: manualRate || 50,
          manualSource: manualSource || '',
        })) {
          send(step)
          if (step.type === 'final' && step.data) finalData = step.data as ForecastResult
        }

        if (finalData && userId) {
          await prisma.forecast.create({
            data: {
              userId,
              question,
              domain: preset || 'POLITICS',
              newsWindow: newsWindow || 14,
              probability: finalData.finalPct / 100,
              confidenceLow: finalData.confidenceLow / 100,
              confidenceHigh: finalData.confidenceHigh / 100,
              outsideView: finalData.outsideViewPct / 100,
              insideView: finalData.insideViewPct / 100,
              blendRatio: finalData.blendRatio,
              factors: JSON.stringify(finalData.factors),
              baseRateLabel: finalData.baseRateLabel,
              baseRateSource: finalData.baseRateSource,
              baseRateValue: finalData.baseRateValue,
              baseRateDataset: finalData.baseRateDataset ? JSON.stringify(finalData.baseRateDataset) : '',
              articleCount: finalData.articleCount,
            },
          })
          send({ type: 'saved', message: 'Forecast saved to your history.' })
        }

        send({ type: 'done', message: 'Complete.' })
      } catch (e: any) {
        send({ type: 'error', message: e?.message || 'Unknown error' })
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
