// src/app/api/portfolio/route.ts - Main Portfolio CRUD
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Types
interface PortfolioPosition {
  id?: number
  ticker: string
  company_name?: string
  shares: number
  avg_price: number
  currency?: string
  purchase_date?: string
  purchase_notes?: string
}

// ✅ STOCK VALIDATION via FMP
async function validateAndEnrichStock(ticker: string): Promise<{
  valid: boolean
  company_name?: string
  current_price?: number
  sector?: string
  error?: string
}> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY
    if (!apiKey) {
      return { valid: false, error: 'API key not configured' }
    }

    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/profile/${ticker}?apikey=${apiKey}`
    )
    
    if (!response.ok) {
      return { valid: false, error: 'Stock not found' }
    }
    
    const [data] = await response.json()
    
    if (!data || !data.companyName) {
      return { valid: false, error: 'Invalid stock data' }
    }
    
    return {
      valid: true,
      company_name: data.companyName,
      current_price: data.price || 0,
      sector: data.sector || 'Unknown'
    }
  } catch (error) {
    console.error('Stock validation error:', error)
    return { valid: false, error: 'Validation failed' }
  }
}

// ✅ GET - Portfolio übersicht
export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Auth check
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get portfolio positions with enriched data
    const { data: positions, error: positionsError } = await supabase
      .from('portfolio_positions_enriched')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (positionsError) {
      console.error('Portfolio fetch error:', positionsError)
      return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 })
    }

    // Get portfolio summary using function
    const { data: summaryData, error: summaryError } = await supabase
      .rpc('get_portfolio_summary', { input_user_id: userId })

    if (summaryError) {
      console.error('Portfolio summary error:', summaryError)
      // Continue without summary if it fails
    }

    const summary = summaryData?.[0] || {
      total_positions: positions?.length || 0,
      total_value: 0,
      total_cost: 0,
      total_gain_loss: 0,
      total_gain_loss_percent: 0,
      annual_dividend_estimate: 0
    }

    return NextResponse.json({
      success: true,
      portfolio: {
        positions: positions || [],
        summary,
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Portfolio GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ✅ POST - Add new position
export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Auth check
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const body: PortfolioPosition = await request.json()

    // Validation
    if (!body.ticker || !body.shares || !body.avg_price) {
      return NextResponse.json({ 
        error: 'Missing required fields: ticker, shares, avg_price' 
      }, { status: 400 })
    }

    if (body.shares <= 0 || body.avg_price <= 0) {
      return NextResponse.json({ 
        error: 'Shares and average price must be positive' 
      }, { status: 400 })
    }

    // Validate and enrich stock data
    const stockValidation = await validateAndEnrichStock(body.ticker.toUpperCase())
    if (!stockValidation.valid) {
      return NextResponse.json({ 
        error: `Stock validation failed: ${stockValidation.error}` 
      }, { status: 400 })
    }

    // Check for existing position
    const { data: existingPosition } = await supabase
      .from('portfolio_positions')
      .select('id')
      .eq('user_id', userId)
      .eq('ticker', body.ticker.toUpperCase())
      .single()

    if (existingPosition) {
      return NextResponse.json({ 
        error: 'Position for this ticker already exists. Use PUT to update.' 
      }, { status: 409 })
    }

    // Insert new position
    const { data: newPosition, error: insertError } = await supabase
      .from('portfolio_positions')
      .insert({
        user_id: userId,
        ticker: body.ticker.toUpperCase(),
        company_name: stockValidation.company_name,
        shares: body.shares,
        avg_price: body.avg_price,
        currency: body.currency || 'USD',
        purchase_date: body.purchase_date || null,
        purchase_notes: body.purchase_notes || null,
        current_price: stockValidation.current_price,
        last_price_update: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Position insert error:', insertError)
      return NextResponse.json({ error: 'Failed to add position' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      position: newPosition,
      message: 'Position added successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Portfolio POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}