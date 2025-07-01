// src/app/api/portfolio/dividends/route.ts - Dividend Calendar API
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Auth check
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const daysAhead = parseInt(searchParams.get('days') || '90')

    // Get upcoming dividends
    const { data: upcomingDividends, error: dividendsError } = await supabase
      .rpc('get_upcoming_dividends', { 
        input_user_id: userId,
        days_ahead: daysAhead 
      })

    if (dividendsError) {
      console.error('Upcoming dividends error:', dividendsError)
      // Continue with empty array if function fails
    }

    // Get dividend history for the year
    const currentYear = new Date().getFullYear()
    const { data: dividendHistory, error: historyError } = await supabase
      .from('dividend_payments')
      .select('*')
      .eq('user_id', userId)
      .gte('payment_date', `${currentYear}-01-01`)
      .eq('status', 'received')
      .order('payment_date', { ascending: false })

    if (historyError) {
      console.error('Dividend history error:', historyError)
      // Continue without history if it fails
    }

    // Get current portfolio for dividend estimation
    const { data: positions, error: positionsError } = await supabase
      .from('portfolio_positions')
      .select('*')
      .eq('user_id', userId)

    if (positionsError) {
      console.error('Portfolio positions error:', positionsError)
    }

    // Generate estimated upcoming dividends from portfolio
    const estimatedDividends = []
    if (positions && positions.length > 0) {
      for (const position of positions) {
        // Get dividend data from your existing dividend API
        try {
          const dividendResponse = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/dividends/${position.ticker}`
          )
          
          if (dividendResponse.ok) {
            const dividendData = await dividendResponse.json()
            
            // Estimate next dividend based on historical data
            if (dividendData.currentInfo?.dividendPerShareTTM > 0) {
              const quarterlyDividend = dividendData.currentInfo.dividendPerShareTTM / 4
              const totalAmount = quarterlyDividend * position.shares
              
              // Estimate next quarterly date (simplified)
              const nextQuarter = new Date()
              nextQuarter.setMonth(nextQuarter.getMonth() + 3)
              
              estimatedDividends.push({
                ticker: position.ticker,
                company_name: position.company_name,
                ex_dividend_date: nextQuarter.toISOString().split('T')[0],
                payment_date: new Date(nextQuarter.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                amount_per_share: quarterlyDividend,
                estimated_total: totalAmount,
                current_shares: position.shares,
                status: 'estimated'
              })
            }
          }
        } catch (error) {
          console.warn(`Failed to get dividend data for ${position.ticker}:`, error)
        }
      }
    }

    // Calculate summary stats
    const totalReceived = dividendHistory?.reduce((sum, payment) => sum + payment.total_amount, 0) || 0
    const paymentCount = dividendHistory?.length || 0
    const allUpcoming = [...(upcomingDividends || []), ...estimatedDividends]
    const nextDividend = allUpcoming.sort((a, b) => 
      new Date(a.ex_dividend_date).getTime() - new Date(b.ex_dividend_date).getTime()
    )[0] || null

    return NextResponse.json({
      success: true,
      dividends: {
        upcoming: allUpcoming,
        history: dividendHistory || [],
        summary: {
          totalReceivedThisYear: totalReceived,
          paymentCountThisYear: paymentCount,
          nextDividend,
          estimatedMonthly: allUpcoming
            .filter(div => {
              const divDate = new Date(div.ex_dividend_date)
              const now = new Date()
              const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
              return divDate >= now && divDate <= nextMonth
            })
            .reduce((sum, div) => sum + div.estimated_total, 0)
        }
      }
    })

  } catch (error) {
    console.error('Dividend calendar error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}