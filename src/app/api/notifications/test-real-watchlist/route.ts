// src/app/api/notifications/test-real-watchlist/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function POST(request: NextRequest) {
  try {
    const { userId, testMode = false } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    console.log(`🧪 [Real Test] Testing real watchlist for user: ${userId}`)

    // 1. User's echte Watchlist holen
    const { data: watchlistItems, error: watchlistError } = await supabaseService
      .from('watchlists')
      .select('ticker')
      .eq('user_id', userId)

    if (watchlistError) {
      return NextResponse.json({ error: 'Failed to fetch watchlist', details: watchlistError }, { status: 500 })
    }

    if (!watchlistItems || watchlistItems.length === 0) {
      return NextResponse.json({ 
        message: 'No watchlist items found for this user',
        watchlistCount: 0
      })
    }

    console.log(`📊 [Real Test] Found ${watchlistItems.length} watchlist items:`, watchlistItems.map(item => item.ticker))

    // 2. Notification Settings prüfen
    const { data: notificationSettings } = await supabaseService
      .from('notification_settings')
      .select('watchlist_enabled, watchlist_threshold_percent')
      .eq('user_id', userId)
      .maybeSingle()

    const threshold = notificationSettings?.watchlist_threshold_percent || 10
    const notificationsEnabled = notificationSettings?.watchlist_enabled || false

    console.log(`⚙️ [Real Test] Settings: enabled=${notificationsEnabled}, threshold=${threshold}%`)

    // 3. Für jede echte Aktie: Live-Daten abrufen
    const stockAnalysis = []
    for (const item of watchlistItems.slice(0, 5)) { // Max 5 für Test
      try {
        // Echte FMP API
        const res = await fetch(
          `https://financialmodelingprep.com/api/v3/quote/${item.ticker}?apikey=${process.env.FMP_API_KEY}`
        )
        
        if (!res.ok) {
          stockAnalysis.push({
            ticker: item.ticker,
            error: `API Error: ${res.status}`,
            dipPercent: null,
            wouldTrigger: false
          })
          continue
        }
        
        const [quote] = await res.json()
        if (!quote) {
          stockAnalysis.push({
            ticker: item.ticker,
            error: 'No quote data',
            dipPercent: null,
            wouldTrigger: false
          })
          continue
        }

        // Echte Dip-Berechnung
        const dipPercent = ((quote.price - quote.yearHigh) / quote.yearHigh) * 100
        const wouldTrigger = testMode ? true : dipPercent <= -threshold

        stockAnalysis.push({
          ticker: item.ticker,
          currentPrice: quote.price,
          yearHigh: quote.yearHigh,
          yearLow: quote.yearLow,
          dipPercent: dipPercent.toFixed(2),
          threshold: threshold,
          wouldTrigger,
          error: null
        })

        console.log(`📈 [Real Test] ${item.ticker}: $${quote.price} (${dipPercent.toFixed(1)}% from 52W high) - ${wouldTrigger ? '🚨 WÜRDE TRIGGERN' : '✅ Normal'}`)

      } catch (stockError) {
        console.error(`❌ [Real Test] Error checking ${item.ticker}:`, stockError)
        stockAnalysis.push({
          ticker: item.ticker,
          error: stockError instanceof Error ? stockError.message : 'Unknown error',
          dipPercent: null,
          wouldTrigger: false
        })
      }
    }

    // 4. Zusammenfassung
    const triggeringStocks = stockAnalysis.filter(stock => stock.wouldTrigger)
    const errorStocks = stockAnalysis.filter(stock => stock.error)

    const summary = {
      totalWatchlistItems: watchlistItems.length,
      testedStocks: stockAnalysis.length,
      triggeringStocks: triggeringStocks.length,
      errorStocks: errorStocks.length,
      notificationsEnabled,
      threshold,
      wouldSendEmail: notificationsEnabled && triggeringStocks.length > 0
    }

    console.log(`📊 [Real Test] Summary:`, summary)

    return NextResponse.json({
      success: true,
      summary,
      stockAnalysis,
      triggeringStocks,
      errorStocks,
      message: triggeringStocks.length > 0 
        ? `${triggeringStocks.length} Aktien würden eine E-Mail auslösen!` 
        : 'Keine Aktien unter dem Schwellwert gefunden.'
    })

  } catch (error) {
    console.error('🚨 [Real Test] Error:', error)
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}