// src/app/api/notifications/check-watchlist/route.ts - ERWEITERT
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { createClient } from '@supabase/supabase-js'

// TEST MODE: Set to your user ID to only send notifications to yourself
// Set to null to send to all users
const TEST_USER_ID = process.env.TEST_USER_ID || null

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

// Hilfsfunktion: In-App Notification erstellen
async function createInAppNotification({
  userId,
  type,
  title,
  message,
  data,
  href
}: {
  userId: string
  type: string
  title: string
  message: string
  data?: any
  href?: string
}) {
  try {
    const { error } = await supabaseService
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        data: data || {},
        href
      })
    
    if (error) {
      console.error('Error creating in-app notification:', error)
    } else {
      console.log(`✅ In-app notification created for user ${userId}: ${title}`)
    }
  } catch (error) {
    console.error('Failed to create in-app notification:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth-Check für Cron-Job (geheimer Key)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Starting watchlist check...')
    console.log(`[Cron] Test mode: ${TEST_USER_ID ? 'ON (user: ' + TEST_USER_ID + ')' : 'OFF'}`)

    // 1. Alle User mit aktivierten Watchlist-Notifications holen
    let query = supabaseService
      .from('notification_settings')
      .select(`
        user_id,
        watchlist_threshold_percent,
        last_notification_sent,
        profiles!inner(email_verified)
      `)
      .eq('watchlist_enabled', true)

    // Filter by test user if set
    if (TEST_USER_ID) {
      query = query.eq('user_id', TEST_USER_ID)
    }

    const { data: usersWithNotifications, error: usersError } = await query

    if (usersError) {
      console.error('[Cron] Users Error:', usersError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    console.log(`[Cron] Found ${usersWithNotifications?.length || 0} users with notifications enabled`)

    let totalEmailsSent = 0
    let totalInAppNotifications = 0
    let totalTickersChecked = 0
    let totalDipsFound = 0

    // 2. Für jeden User: Watchlist prüfen
    for (const userSettings of usersWithNotifications || []) {
      try {
        // User's Watchlist holen
        const { data: watchlistItems, error: watchlistError } = await supabaseService
          .from('watchlists')
          .select('ticker')
          .eq('user_id', userSettings.user_id)

        if (watchlistError || !watchlistItems?.length) {
          continue
        }

        totalTickersChecked += watchlistItems.length

        const dippedStocks = []
        const inAppNotificationsToCreate = []

        // 3. Für jeden Ticker: Aktuellen Kurs prüfen
        for (const item of watchlistItems) {
          try {
            // FMP API Call
            const res = await fetch(
              `https://financialmodelingprep.com/api/v3/quote/${item.ticker}?apikey=${process.env.FMP_API_KEY}`
            )
            
            if (!res.ok) continue
            
            const [quote] = await res.json()
            if (!quote) continue

            // Dip berechnen
            const dipPercent = ((quote.price - quote.yearHigh) / quote.yearHigh) * 100
            const isDip = dipPercent <= -userSettings.watchlist_threshold_percent
            
            if (isDip) {
              totalDipsFound++
              // Prüfen letzte Notification für diese Aktie
              const { data: lastNotification } = await supabaseService
                .from('notification_log')
                .select('sent_at, notification_type')
                .eq('user_id', userSettings.user_id)
                .eq('notification_type', 'watchlist_dip')
                .eq('reference_id', item.ticker)
                .order('sent_at', { ascending: false })
                .limit(1)
                .maybeSingle()

              const now = new Date()
              let shouldSendEmail = false
              let alertType = 'new_dip'

              if (!lastNotification) {
                // Erste E-Mail für diese Aktie
                shouldSendEmail = true
                alertType = 'new_dip'
                console.log(`📧 [NEW DIP] ${item.ticker}: Erste E-Mail für ${userSettings.user_id}`)
              } else {
                const lastSent = new Date(lastNotification.sent_at)
                const daysSinceLastEmail = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24)
                
                if (daysSinceLastEmail >= 7) {
                  // Wöchentlicher Reminder für persistente Dips
                  shouldSendEmail = true
                  alertType = 'persistent_dip'
                  console.log(`📧 [WEEKLY REMINDER] ${item.ticker}: ${daysSinceLastEmail.toFixed(1)} Tage seit letzter E-Mail`)
                } else {
                  console.log(`⏰ [SKIP] ${item.ticker}: Nur ${daysSinceLastEmail.toFixed(1)} Tage seit letzter E-Mail`)
                }
              }

              if (shouldSendEmail) {
                const stockData = {
                  ticker: item.ticker,
                  currentPrice: quote.price,
                  dipPercent: dipPercent.toFixed(1),
                  yearHigh: quote.yearHigh
                }

                // Für E-Mail sammeln
                dippedStocks.push(stockData)

                // ✅ In-App Notification vorbereiten
                const title = alertType === 'new_dip' 
                  ? `${item.ticker} ist um ${Math.abs(dipPercent).toFixed(1)}% gefallen`
                  : `${item.ticker} weiterhin ${Math.abs(dipPercent).toFixed(1)}% unter 52W-Hoch`
                
                inAppNotificationsToCreate.push({
                  userId: userSettings.user_id,
                  type: 'watchlist_dip',
                  title,
                  message: `Aktueller Kurs: $${quote.price.toFixed(2)} (${dipPercent.toFixed(1)}% vom 52W-Hoch)`,
                  data: { ...stockData, alertType },
                  href: `/analyse/stocks/${item.ticker.toLowerCase()}`
                })
              }
            }

            // Stock Alert Tabelle updaten (für Tracking)
            await supabaseService
              .from('stock_alerts')
              .upsert({
                ticker: item.ticker,
                current_price: quote.price,
                price_52w_high: quote.yearHigh,
                price_52w_low: quote.yearLow,
                dip_percent: dipPercent,
                last_updated: new Date().toISOString()
              }, {
                onConflict: 'ticker'
              })

          } catch (stockError) {
            console.error(`[Cron] Error checking ${item.ticker}:`, stockError)
            continue
          }
        }

        // ✅ 4. In-App Notifications erstellen (ERST)
        for (const notificationData of inAppNotificationsToCreate) {
          await createInAppNotification(notificationData)
          totalInAppNotifications++
        }

        // 5. Email senden wenn Dips gefunden wurden (DANACH)
        if (dippedStocks.length > 0) {
          const { data: profile } = await supabaseService
            .from('profiles')
            .select('user_id')
            .eq('user_id', userSettings.user_id)
            .maybeSingle()

          if (profile) {
            const { data: { user } } = await supabaseService.auth.admin.getUserById(userSettings.user_id)
            
            if (user?.email) {
              // Email-Service aufrufen
              await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/notifications/send-email`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.CRON_SECRET}`
                },
                body: JSON.stringify({
                  type: 'watchlist_dips',
                  userEmail: user.email,
                  data: {
                    dippedStocks,
                    threshold: userSettings.watchlist_threshold_percent
                  }
                })
              })

              // Notification Log erstellen
              for (const stock of dippedStocks) {
                await supabaseService
                  .from('notification_log')
                  .insert({
                    user_id: userSettings.user_id,
                    notification_type: 'watchlist_dip',
                    reference_id: stock.ticker,
                    content: stock,
                    email_sent: true
                  })
              }

              totalEmailsSent += dippedStocks.length
            }
          }
        }

      } catch (userError) {
        console.error(`[Cron] Error processing user ${userSettings.user_id}:`, userError)
        continue
      }
    }

    console.log(`[Cron] Checked ${totalTickersChecked} tickers, found ${totalDipsFound} dips`)
    console.log(`[Cron] Sent ${totalEmailsSent} email notifications`)
    console.log(`[Cron] Created ${totalInAppNotifications} in-app notifications`)

    return NextResponse.json({
      success: true,
      testMode: !!TEST_USER_ID,
      usersChecked: usersWithNotifications?.length || 0,
      tickersChecked: totalTickersChecked,
      dipsFound: totalDipsFound,
      emailNotificationsSent: totalEmailsSent,
      inAppNotificationsSent: totalInAppNotifications
    })

  } catch (error) {
    console.error('[Cron] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}