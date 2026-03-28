// src/app/api/cron/check-price-alerts/route.ts
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

async function sendPushNotification(userId: string, title: string, body: string, data?: any) {
  try {
    const secret = process.env.INTERNAL_API_SECRET
    if (!secret) return

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://finclue.de'
    await fetch(`${baseUrl}/api/notifications/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': secret,
      },
      body: JSON.stringify({ userIds: [userId], title, body, data }),
    })
  } catch (e) {
    console.error('[PriceAlerts] Failed to send push notification:', e)
  }
}

async function createInAppNotification(
  userId: string,
  title: string,
  message: string,
  data?: any,
  href?: string
) {
  try {
    const { error } = await supabaseService
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'price_alert',
        title,
        message,
        data: data || {},
        href
      })

    if (error) {
      console.error('[PriceAlerts] Error creating in-app notification:', error)
    } else {
      await sendPushNotification(userId, title, message, data)
    }
  } catch (error) {
    console.error('[PriceAlerts] Failed to create in-app notification:', error)
  }
}

async function handlePriceAlertCheck() {
  try {
    console.log('[PriceAlerts] Starting price alert check...')

    // 1. Get all active, non-triggered alerts
    const { data: alerts, error: alertsError } = await supabaseService
      .from('price_alerts')
      .select('*')
      .eq('active', true)
      .eq('triggered', false)

    if (alertsError) {
      console.error('[PriceAlerts] Error fetching alerts:', alertsError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!alerts || alerts.length === 0) {
      console.log('[PriceAlerts] No active alerts found')
      return NextResponse.json({ success: true, alertsChecked: 0, alertsTriggered: 0 })
    }

    console.log(`[PriceAlerts] Found ${alerts.length} active alerts`)

    // 2. Collect unique symbols and batch fetch prices from FMP
    const uniqueSymbols = [...new Set(alerts.map((a: any) => a.symbol))]
    const symbolsString = uniqueSymbols.join(',')

    const fmpRes = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${symbolsString}?apikey=${process.env.FMP_API_KEY}`
    )

    if (!fmpRes.ok) {
      console.error('[PriceAlerts] FMP API error:', fmpRes.status)
      return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 })
    }

    const quotes = await fmpRes.json()
    if (!Array.isArray(quotes)) {
      console.error('[PriceAlerts] Invalid FMP response')
      return NextResponse.json({ error: 'Invalid price data' }, { status: 500 })
    }

    // Build a price map for quick lookup
    const priceMap: Record<string, number> = {}
    for (const q of quotes) {
      if (q.symbol && q.price != null) {
        priceMap[q.symbol] = q.price
      }
    }

    console.log(`[PriceAlerts] Got prices for ${Object.keys(priceMap).length} symbols`)

    // 3. Check each alert
    let alertsTriggered = 0

    for (const alert of alerts) {
      const currentPrice = priceMap[alert.symbol]

      if (currentPrice == null) {
        console.log(`[PriceAlerts] No price found for ${alert.symbol}, skipping`)
        continue
      }

      const targetPrice = parseFloat(alert.target_price)
      const isTriggered =
        (alert.condition === 'above' && currentPrice >= targetPrice) ||
        (alert.condition === 'below' && currentPrice <= targetPrice)

      if (!isTriggered) continue

      console.log(
        `[PriceAlerts] Alert triggered: ${alert.symbol} ${alert.condition} ${targetPrice} (current: ${currentPrice})`
      )

      // 4. Mark alert as triggered
      const { error: updateError } = await supabaseService
        .from('price_alerts')
        .update({
          triggered: true,
          triggered_at: new Date().toISOString(),
          active: false,
          current_price: currentPrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', alert.id)

      if (updateError) {
        console.error('[PriceAlerts] Error updating alert:', updateError)
        continue
      }

      // 5. Build notification texts (German)
      const priceFormatted = currentPrice.toLocaleString('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
      const targetFormatted = targetPrice.toLocaleString('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })

      const title = `🔔 Kursalert: ${alert.symbol}`
      const body =
        alert.condition === 'below'
          ? `${alert.symbol} ist auf ${priceFormatted}$ gefallen – unter dein Ziel von ${targetFormatted}$`
          : `${alert.symbol} hat ${priceFormatted}$ erreicht – über dein Ziel von ${targetFormatted}$`

      // 6. Create in-app notification + send push
      await createInAppNotification(
        alert.user_id,
        title,
        body,
        {
          symbol: alert.symbol,
          condition: alert.condition,
          targetPrice,
          currentPrice,
          alertId: alert.id
        },
        `/analyse/stocks/${alert.symbol.toLowerCase()}`
      )

      alertsTriggered++
    }

    console.log(
      `[PriceAlerts] Done: checked ${alerts.length} alerts, triggered ${alertsTriggered}`
    )

    return NextResponse.json({
      success: true,
      alertsChecked: alerts.length,
      alertsTriggered
    })

  } catch (error) {
    console.error('[PriceAlerts] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return handlePriceAlertCheck()
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return handlePriceAlertCheck()
}
