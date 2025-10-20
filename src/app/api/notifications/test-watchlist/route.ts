// src/app/api/notifications/test-watchlist/route.ts
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
    const { userEmail, testTicker = 'AAPL' } = await request.json()

    if (!userEmail) {
      return NextResponse.json({ error: 'userEmail required' }, { status: 400 })
    }

    console.log(`🧪 [Test] Testing watchlist notification for: ${userEmail}`)

    // Mock dipped stock data
    const dippedStocks = [
      {
        ticker: testTicker,
        currentPrice: 180.50,
        dipPercent: '-15.2',
        yearHigh: 213.45
      },
      {
        ticker: 'MSFT',
        currentPrice: 385.25,
        dipPercent: '-12.8',
        yearHigh: 442.00
      }
    ]

    // Test E-Mail senden
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/notifications/send-email`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      },
      body: JSON.stringify({
        type: 'watchlist_dips',
        userEmail,
        data: {
          dippedStocks,
          threshold: 10
        }
      })
    })

    const emailResult = await emailResponse.text()
    
    console.log(`📧 [Test] Email response:`, emailResult)

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${userEmail}`,
      emailResponse: emailResult,
      testData: {
        dippedStocks,
        threshold: 10
      }
    })

  } catch (error) {
    console.error('🚨 [Test] Error:', error)
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}