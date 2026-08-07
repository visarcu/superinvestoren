// Vercel Cron Job: Kongress-Trades synchronisieren
// Läuft automatisch via vercel.json cron config (alle 6 Stunden).
//
// Quelle steckt in src/lib/politicianTradesSync.ts hinter dem TradeSource-
// Interface und ist austauschbar. Der Sync ist idempotent (dedupeKey), ein
// erneuter Lauf erzeugt also keine Duplikate.
//
// ?pages=N überschreibt die Seitentiefe pro Kammer (100 Trades je Seite).
// Default 15 = ~1500 Trades pro Kammer, deckt das 6h-Fenster mit Puffer ab.
// Die Quelle liefert maximal 100 Seiten je Kammer, darüber antwortet sie mit 400.
import { NextRequest, NextResponse } from 'next/server'
import { syncPoliticianTrades } from '@/lib/politicianTradesSync'

const CRON_SECRET = process.env.CRON_SECRET

export const maxDuration = 300

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      console.log('⚠️ Unauthorized politician-trades sync request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pagesParam = request.nextUrl.searchParams.get('pages')
    const maxPages = pagesParam ? Math.min(Math.max(parseInt(pagesParam, 10) || 15, 1), 100) : 15

    const startedAt = new Date().toISOString()
    console.log('🚀 Politiker-Trades Sync gestartet:', startedAt, `(${maxPages} Seiten/Kammer)`)

    const result = await syncPoliticianTrades({ maxPages })

    console.log('✅ Politiker-Trades Sync abgeschlossen:', result)

    return NextResponse.json({
      success: result.errors.length === 0,
      startedAt,
      finishedAt: new Date().toISOString(),
      ...result,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('❌ Politiker-Trades Sync error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
