// src/app/api/notifications/check-watchlist/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { createClient } from '@supabase/supabase-js'



// ✅ Service Role Client für Cron-Jobs (ohne RLS)
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



// ✅ SICHERE API: Prüft Watchlist-Dips und sendet Notifications
export async function POST(request: NextRequest) {

  try {
 
 // Auth-Check für Cron-Job (geheimer Key)
 const authHeader = request.headers.get('authorization')
 if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 }

    console.log('[Cron] Starting watchlist check...')
    
    // 1. Alle User mit aktivierten Watchlist-Notifications holen
    const { data: usersWithNotifications, error: usersError } = await supabaseService
      .from('notification_settings')
      .select(`
        user_id,
        watchlist_threshold_percent,
        last_notification_sent,
        profiles!inner(email_verified)
      `)
      .eq('watchlist_enabled', true)
     // .eq('profiles.email_verified', true)

    if (usersError) {
      console.error('[Cron] Users Error:', usersError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    console.log(`[Cron] Found ${usersWithNotifications?.length || 0} users with notifications enabled`)

    let totalNotificationsSent = 0

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

        const dippedStocks = []

        // 3. Für jeden Ticker: Aktuellen Kurs prüfen
        for (const item of watchlistItems) {
          try {
            // FMP API Call (deine bestehende API)
            const res = await fetch(
              `https://financialmodelingprep.com/api/v3/quote/${item.ticker}?apikey=${process.env.NEXT_PUBLIC_FMP_API_KEY}`
            )
            
            if (!res.ok) continue
            
            const [quote] = await res.json()
            if (!quote) continue

            // Dip berechnen (wie in deiner Watchlist-Komponente)
            const dipPercent = ((quote.price - quote.yearHigh) / quote.yearHigh) * 100
          // das an falls live  const isDip = dipPercent <= -userSettings.watchlist_threshold_percent
            const isDip = (userSettings.user_id === 'd5bd6951-6479-4279-afd6-a019d9f6f153') ? true : dipPercent <= -userSettings.watchlist_threshold_percent //zum test


            if (isDip) {
              // Prüfen ob wir heute schon eine Notification für diesen Stock gesendet haben
              const { data: recentNotification } = await supabaseService
                .from('notification_log')
                .select('id')
                .eq('user_id', userSettings.user_id)
                .eq('notification_type', 'watchlist_dip')
                .eq('reference_id', item.ticker)
                .gte('sent_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 24h
                .maybeSingle()

              if (!recentNotification) {
                dippedStocks.push({
                  ticker: item.ticker,
                  currentPrice: quote.price,
                  dipPercent: dipPercent.toFixed(1),
                  yearHigh: quote.yearHigh
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

        // 4. Email senden wenn Dips gefunden wurden
        if (dippedStocks.length > 0) {
          // User Email holen
          const { data: profile } = await supabaseService
            .from('profiles')
            .select('user_id')
            .eq('user_id', userSettings.user_id)
            .maybeSingle()

          if (profile) {
            // Supabase Auth User holen für Email
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

              totalNotificationsSent += dippedStocks.length
            }
          }
        }

      } catch (userError) {
        console.error(`[Cron] Error processing user ${userSettings.user_id}:`, userError)
        continue
      }
    }

    console.log(`[Cron] Sent ${totalNotificationsSent} notifications`)
    
    return NextResponse.json({
      success: true,
      usersChecked: usersWithNotifications?.length || 0,
      notificationsSent: totalNotificationsSent
    })

  } catch (error) {
    console.error('[Cron] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}