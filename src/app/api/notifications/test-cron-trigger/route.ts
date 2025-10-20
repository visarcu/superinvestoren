// src/app/api/notifications/test-cron-trigger/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 [Test Cron] Triggering watchlist check manually...')

    // Rufe den echten Cron-Job mit dem korrekten CRON_SECRET auf
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications/check-watchlist`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    })

    const result = await response.json()
    
    console.log(`🧪 [Test Cron] Response status: ${response.status}`)
    console.log(`🧪 [Test Cron] Response:`, result)

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      cronResult: result,
      message: response.ok 
        ? 'Cron-Job erfolgreich ausgeführt' 
        : 'Cron-Job Fehler'
    })

  } catch (error) {
    console.error('🚨 [Test Cron] Error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}