// scripts/sync-earnings.ts
// Synchronisiert Earnings-Daten von FMP API nach Supabase
import { config } from 'dotenv'
config({ path: '.env.local' })

// Use relative path to prisma client from schema output
import { PrismaClient } from '../prisma/node_modules/@prisma/client'

const prisma = new PrismaClient()
const FMP_API_KEY = process.env.FMP_API_KEY

if (!FMP_API_KEY) {
  console.error('❌ FMP_API_KEY nicht gesetzt')
  process.exit(1)
}

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

  if (lowerTime.includes('bmo') || lowerTime.includes('before') || lowerTime.includes('pre')) {
    return 'bmo'
  }
  if (lowerTime.includes('amc') || lowerTime.includes('after') || lowerTime.includes('post')) {
    return 'amc'
  }
  if (lowerTime.includes('dmh') || lowerTime.includes('during')) {
    return 'dmh'
  }

  // Parse time strings like "9:30 AM"
  if (lowerTime.includes('am')) {
    const hour = parseInt(lowerTime)
    if (hour < 10) return 'bmo'
  }
  if (lowerTime.includes('pm')) {
    const hour = parseInt(lowerTime)
    if (hour >= 4) return 'amc'
  }

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

async function syncEarnings() {
  console.log('🚀 Earnings Sync gestartet')
  console.log('📅', new Date().toISOString())
  console.log('──────────────────────────────────────────────────')

  try {
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
      return
    }

    console.log(`✅ ${earnings.length} Earnings-Events von FMP erhalten`)

    // Batch upsert mit Progress
    let processed = 0
    let errors = 0
    const batchSize = 100
    const validEarnings = earnings.filter(e => e.symbol && e.date)

    console.log(`📦 Verarbeite ${validEarnings.length} gültige Einträge in Batches von ${batchSize}...`)

    for (let i = 0; i < validEarnings.length; i += batchSize) {
      const batch = validEarnings.slice(i, i + batchSize)

      // Process batch in parallel
      const results = await Promise.allSettled(
        batch.map(async (earning) => {
          const earningDate = new Date(earning.date)
          return prisma.earningsCalendar.upsert({
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
        })
      )

      // Count results
      for (const result of results) {
        if (result.status === 'fulfilled') {
          processed++
        } else {
          errors++
        }
      }

      // Progress log every 1000
      if ((i + batchSize) % 1000 === 0 || i + batchSize >= validEarnings.length) {
        const progress = Math.round((processed + errors) / validEarnings.length * 100)
        console.log(`   📊 ${progress}% (${processed + errors}/${validEarnings.length})`)
      }
    }

    const updated = processed

    console.log('──────────────────────────────────────────────────')
    console.log(`✅ Sync abgeschlossen:`)
    console.log(`   📥 ${updated} Earnings upserted`)
    console.log(`   ❌ ${errors} Fehler`)

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

    console.log(`   🗑️ ${deleted.count} alte Einträge gelöscht`)

  } catch (error) {
    console.error('❌ Sync Fehler:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

syncEarnings()
