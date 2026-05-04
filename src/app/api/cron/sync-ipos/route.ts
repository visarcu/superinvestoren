// Vercel Cron Job: Sync IPO Calendar wöchentlich
// Läuft automatisch via vercel.json cron config.
//
// Quelle: SEC EDGAR Full-Text-Search (eigene Daten, kein FMP/EODHD).
//   - 424B4 = Pricing-Prospectus
//   - S-1 / S-1/A = Initial Registration
//
// Default: 30 Tage rückwärts. Reicht für wöchentliches Schedule + Puffer.
import { NextRequest, NextResponse } from 'next/server'
import { syncIpoCalendar } from '@/lib/ipoCalendarSync'

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      console.log('⚠️ Unauthorized IPO sync cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const startedAt = new Date().toISOString()
    console.log('🚀 IPO Cron Sync gestartet:', startedAt)

    const result = await syncIpoCalendar(30, 100)

    console.log('✅ IPO Sync abgeschlossen:', result)

    return NextResponse.json({
      success: true,
      startedAt,
      finishedAt: new Date().toISOString(),
      ...result,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('❌ IPO Sync error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
