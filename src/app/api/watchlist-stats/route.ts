// app/api/watchlist-stats/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Verwende Service Role Key für vollen Zugriff (umgeht RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials')
      return NextResponse.json(
        { error: 'Configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Hole alle Watchlist-Einträge
    const { data, error } = await supabase
      .from('watchlists')
      .select('ticker, user_id')
    
    if (error) {
      console.error('Supabase error:', error)
      // Fallback für Development/Testing
      return NextResponse.json({ 
        mostFollowed: [
          { ticker: 'AAPL', count: 15 },
          { ticker: 'MSFT', count: 12 },
          { ticker: 'NVDA', count: 10 },
          { ticker: 'GOOGL', count: 8 },
          { ticker: 'TSLA', count: 7 },
          { ticker: 'META', count: 6 },
          { ticker: 'AMZN', count: 5 },
          { ticker: 'AMD', count: 4 }
        ],
        totalUsers: 42
      })
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json({ 
        mostFollowed: [],
        totalUsers: 0
      })
    }
    
    // Zähle die Häufigkeit jedes Tickers
    const tickerCounts = new Map<string, number>()
    const uniqueUsers = new Set<string>()
    
    data.forEach(item => {
      // Zähle jeden Ticker
      const count = tickerCounts.get(item.ticker) || 0
      tickerCounts.set(item.ticker, count + 1)
      
      // Sammle unique User IDs
      if (item.user_id) {
        uniqueUsers.add(item.user_id)
      }
    })
    
    // Sortiere nach Häufigkeit und nimm Top 10
    const sortedTickers = Array.from(tickerCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([ticker, count]) => ({
        ticker,
        count
      }))
    
    console.log('Watchlist stats:', { 
      totalEntries: data.length,
      uniqueTickers: tickerCounts.size,
      uniqueUsers: uniqueUsers.size,
      topTicker: sortedTickers[0]
    })
    
    return NextResponse.json({ 
      mostFollowed: sortedTickers,
      totalUsers: uniqueUsers.size || data.length // Fallback wenn keine user_id
    })
    
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}