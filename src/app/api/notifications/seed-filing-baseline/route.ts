// src/app/api/notifications/seed-filing-baseline/route.ts
// Einmaliges Script: Markiert alle aktuellen Filings als "bereits notifiziert"
// Damit das System erst bei NEUEN Filings Notifications sendet

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import holdingsHistory from '@/data/holdings'

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

interface QuarterData {
  form: string
  date: string
  period: string
  accession: string
  quarterKey: string
  positions: any[]
  totalValue: number
  positionsCount: number
}

interface HoldingsSnapshot {
  quarter: string
  data: QuarterData
}

// Deine User-ID für Baseline-Einträge (muss ein echter User sein wegen FK constraint)
const BASELINE_USER_ID = 'd5bd6951-6479-4279-afd6-a019d9f6f153'

export async function POST(request: NextRequest) {
  try {
    // Auth-Check
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const holdings = holdingsHistory as Record<string, HoldingsSnapshot[]>
    const investorSlugs = Object.keys(holdings)

    let seededCount = 0
    let skippedCount = 0
    let errorCount = 0
    let noDataCount = 0
    const seededInvestors: string[] = []
    const skippedInvestors: string[] = []
    const errorInvestors: string[] = []

    for (const investorSlug of investorSlugs) {
      const investorData = holdings[investorSlug]

      if (!investorData || investorData.length === 0) {
        noDataCount++
        continue
      }

      // Neuestes Quarter finden
      const sorted = [...investorData].sort((a, b) => b.quarter.localeCompare(a.quarter))
      const latestSnapshot = sorted[0]

      // Sicherstellen dass data existiert
      if (!latestSnapshot.data) {
        errorCount++
        errorInvestors.push(`${investorSlug} (no data object)`)
        continue
      }

      const quarterKey = latestSnapshot.data.quarterKey || latestSnapshot.quarter
      const filingDate = latestSnapshot.data.date || new Date().toISOString().split('T')[0]

      if (!quarterKey) {
        errorCount++
        errorInvestors.push(`${investorSlug} (no quarterKey)`)
        continue
      }

      // Prüfe ob schon ein Baseline-Eintrag existiert
      const { data: existing } = await supabaseService
        .from('notification_log')
        .select('id')
        .eq('notification_type', 'filing_alert')
        .eq('reference_id', investorSlug)
        .filter('content->>quarterKey', 'eq', quarterKey)
        .limit(1)
        .maybeSingle()

      if (existing) {
        skippedCount++
        skippedInvestors.push(`${investorSlug} (${quarterKey})`)
        continue
      }

      // Baseline-Eintrag erstellen (ohne E-Mail)
      const { error } = await supabaseService
        .from('notification_log')
        .insert({
          user_id: BASELINE_USER_ID,
          notification_type: 'filing_alert',
          reference_id: investorSlug,
          content: {
            investor: investorSlug,
            quarterKey,
            filingDate,
            isBaseline: true
          },
          email_sent: false
        })

      if (error) {
        errorCount++
        errorInvestors.push(`${investorSlug}: ${error.message}`)
      } else {
        seededCount++
        seededInvestors.push(`${investorSlug} (${quarterKey})`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Baseline erstellt für ${seededCount} Investoren. ${skippedCount} übersprungen, ${errorCount} Fehler, ${noDataCount} ohne Daten.`,
      seededCount,
      skippedCount,
      errorCount,
      noDataCount,
      totalInvestors: investorSlugs.length,
      seededInvestors,
      skippedInvestors,
      errorInvestors
    })

  } catch (error) {
    console.error('[Seed Baseline] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
