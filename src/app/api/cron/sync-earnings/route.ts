// Vercel Cron Job: Sync Earnings Calendar täglich
// Läuft automatisch via vercel.json cron config
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const FMP_API_KEY = process.env.FMP_API_KEY
const CRON_SECRET = process.env.CRON_SECRET

interface FMPEarning {
  symbol: string
  date: string
  time?: string
  epsEstimated?: number
  epsActual?: number
  revenueEstimated?: number
  revenueActual?: number
}

// Map FMP time strings to standard codes
function mapTimeToCode(time: string | null | undefined): string {
  if (!time) return 'amc'
  const lowerTime = time.toLowerCase()
  if (lowerTime.includes('bmo') || lowerTime.includes('before') || lowerTime.includes('pre')) return 'bmo'
  if (lowerTime.includes('dmh') || lowerTime.includes('during')) return 'dmh'
  return 'amc'
}

// Calculate fiscal quarter from date
function getFiscalQuarter(date: Date): number {
  const month = date.getMonth() + 1
  if (month >= 1 && month <= 3) return 1
  if (month >= 4 && month <= 6) return 2
  if (month >= 7 && month <= 9) return 3
  return 4
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get('authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      console.log('⚠️ Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!FMP_API_KEY) {
      return NextResponse.json({ error: 'FMP_API_KEY not configured' }, { status: 500 })
    }

    console.log('🚀 Earnings Cron Sync gestartet:', new Date().toISOString())

    // Hole Earnings für die nächsten 90 Tage
    const today = new Date()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 90)

    const from = today.toISOString().split('T')[0]
    const to = futureDate.toISOString().split('T')[0]

    console.log(`📊 Lade Earnings von ${from} bis ${to}...`)

    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/earning_calendar?from=${from}&to=${to}&apikey=${FMP_API_KEY}`
    )

    if (!response.ok) {
      throw new Error(`FMP API error: ${response.status}`)
    }

    const earnings: FMPEarning[] = await response.json()

    if (!Array.isArray(earnings)) {
      console.log('⚠️ Keine Earnings-Daten erhalten')
      return NextResponse.json({ success: true, message: 'No earnings data', synced: 0 })
    }

    console.log(`✅ ${earnings.length} Earnings-Events von FMP erhalten`)

    // Batch upsert
    let synced = 0
    let errors = 0

    // Process in batches of 100
    const batchSize = 100
    for (let i = 0; i < earnings.length; i += batchSize) {
      const batch = earnings.slice(i, i + batchSize)

      const promises = batch.map(async (earning) => {
        if (!earning.symbol || !earning.date) return null

        try {
          const earningDate = new Date(earning.date)

          await prisma.earningsCalendar.upsert({
            where: {
              symbol_date: {
                symbol: earning.symbol,
                date: earningDate,
              },
            },
            update: {
              time: mapTimeToCode(earning.time),
              epsEstimate: earning.epsEstimated ?? null,
              epsActual: earning.epsActual ?? null,
              revenueEstimate: earning.revenueEstimated ?? null,
              revenueActual: earning.revenueActual ?? null,
              updatedAt: new Date(),
            },
            create: {
              symbol: earning.symbol,
              date: earningDate,
              time: mapTimeToCode(earning.time),
              fiscalQuarter: getFiscalQuarter(earningDate),
              fiscalYear: earningDate.getFullYear(),
              epsEstimate: earning.epsEstimated ?? null,
              epsActual: earning.epsActual ?? null,
              revenueEstimate: earning.revenueEstimated ?? null,
              revenueActual: earning.revenueActual ?? null,
            },
          })

          return true
        } catch {
          return false
        }
      })

      const results = await Promise.all(promises)
      synced += results.filter(r => r === true).length
      errors += results.filter(r => r === false).length
    }

    // Lösche alte Earnings (älter als 30 Tage)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const deleted = await prisma.earningsCalendar.deleteMany({
      where: {
        date: {
          lt: thirtyDaysAgo,
        },
      },
    })

    console.log(`✅ Sync abgeschlossen: ${synced} synced, ${errors} errors, ${deleted.count} deleted`)

    return NextResponse.json({
      success: true,
      synced,
      errors,
      deleted: deleted.count,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('❌ Earnings Cron Sync Fehler:', error)
    return NextResponse.json(
      { error: 'Sync failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
