import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Only allow in development or with secret
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (process.env.NODE_ENV !== 'development' && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const results: Record<string, any> = {}

  // Test earnings check
  try {
    const earningsRes = await fetch(`${baseUrl}/api/notifications/check-earnings`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
    })
    results.earnings = await earningsRes.json()
  } catch (e) {
    results.earnings = { error: String(e) }
  }

  // Test filings check
  try {
    const filingsRes = await fetch(`${baseUrl}/api/notifications/check-filings`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
    })
    results.filings = await filingsRes.json()
  } catch (e) {
    results.filings = { error: String(e) }
  }

  // Test watchlist check
  try {
    const watchlistRes = await fetch(`${baseUrl}/api/notifications/check-watchlist`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
    })
    results.watchlist = await watchlistRes.json()
  } catch (e) {
    results.watchlist = { error: String(e) }
  }

  return NextResponse.json({
    message: 'Test triggers completed',
    testMode: !!process.env.TEST_USER_ID,
    testUserId: process.env.TEST_USER_ID,
    results
  })
}
