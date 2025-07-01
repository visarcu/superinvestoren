// src/app/api/portfolio/sync-prices/route.ts - Price Update API
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Auth check  
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get all positions that need price updates
    const { data: positions, error: positionsError } = await supabase
      .from('portfolio_positions')
      .select('id, ticker, current_price, last_price_update')
      .eq('user_id', userId)

    if (positionsError) {
      return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 })
    }

    if (!positions || positions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No positions to update',
        updates: []
      })
    }

    const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // Batch fetch prices for all tickers
    const tickers = positions.map(p => p.ticker).join(',')
    
    let quotes: any[] = []
    try {
      const response = await fetch(
        `https://financialmodelingprep.com/api/v3/quote/${tickers}?apikey=${apiKey}`
      )
      
      if (response.ok) {
        quotes = await response.json()
      } else {
        // Fallback to individual requests if batch fails
        console.warn('Batch quote request failed, falling back to individual requests')
        
        const individualQuotes = await Promise.allSettled(
          positions.map(async (position) => {
            const response = await fetch(
              `https://financialmodelingprep.com/api/v3/quote/${position.ticker}?apikey=${apiKey}`
            )
            if (response.ok) {
              const [quote] = await response.json()
              return quote
            }
            return null
          })
        )
        
        quotes = individualQuotes
          .filter(result => result.status === 'fulfilled' && result.value)
          .map(result => (result as any).value)
      }
    } catch (error) {
      console.error('Error fetching quotes:', error)
      return NextResponse.json({ error: 'Failed to fetch stock prices' }, { status: 500 })
    }

    // Update positions with new prices
    const updatePromises = positions.map(async (position) => {
      try {
        const quote = quotes.find(q => q.symbol === position.ticker)
        
        if (!quote?.price) {
          console.warn(`No price data for ${position.ticker}`)
          return {
            ticker: position.ticker,
            success: false,
            error: 'No price data available'
          }
        }

        // Update position with new price
        const { error: updateError } = await supabase
          .from('portfolio_positions')
          .update({
            current_price: quote.price,
            last_price_update: new Date().toISOString()
          })
          .eq('id', position.id)
          .eq('user_id', userId)

        if (updateError) {
          console.error(`Failed to update price for ${position.ticker}:`, updateError)
          return {
            ticker: position.ticker,
            success: false,
            error: 'Database update failed'
          }
        }

        return {
          ticker: position.ticker,
          oldPrice: position.current_price,
          newPrice: quote.price,
          change: position.current_price ? quote.price - position.current_price : 0,
          changePercent: position.current_price ? 
            ((quote.price - position.current_price) / position.current_price) * 100 : 0,
          success: true
        }
      } catch (error) {
        console.error(`Error updating ${position.ticker}:`, error)
        return {
          ticker: position.ticker,
          success: false,
          error: 'Update failed'
        }
      }
    })

    const results = await Promise.all(updatePromises)
    const successfulUpdates = results.filter(result => result.success)
    const failedUpdates = results.filter(result => !result.success)

    // Optional: Create portfolio snapshot after price update
    if (successfulUpdates.length > 0) {
      try {
        // Get updated portfolio summary
        const { data: summaryData } = await supabase
          .rpc('get_portfolio_summary', { input_user_id: userId })

        if (summaryData?.[0]) {
          const summary = summaryData[0]
          
          // Create daily snapshot
          await supabase
            .from('portfolio_snapshots')
            .upsert({
              user_id: userId,
              total_value: summary.total_value,
              total_cost: summary.total_cost,
              total_gain_loss: summary.total_gain_loss,
              total_gain_loss_percent: summary.total_gain_loss_percent,
              position_count: summary.total_positions,
              snapshot_date: new Date().toISOString().split('T')[0],
              snapshot_type: 'daily'
            }, {
              onConflict: 'user_id,snapshot_date'
            })
        }
      } catch (snapshotError) {
        console.warn('Failed to create portfolio snapshot:', snapshotError)
        // Don't fail the price update if snapshot creation fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated prices for ${successfulUpdates.length} of ${positions.length} positions`,
      updates: successfulUpdates,
      failed: failedUpdates.length > 0 ? failedUpdates : undefined,
      summary: {
        total: positions.length,
        successful: successfulUpdates.length,
        failed: failedUpdates.length
      }
    })

  } catch (error) {
    console.error('Price sync error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}