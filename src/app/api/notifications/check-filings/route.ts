// src/app/api/notifications/check-filings/route.ts
import { NextRequest, NextResponse } from 'next/server'
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

// Helper: In-App Notification erstellen
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
      console.log(`✅ Filing notification created for user ${userId}`)
    }
  } catch (error) {
    console.error('Failed to create in-app notification:', error)
  }
}

// Helper: Investor Namen
function getInvestorName(slug: string): string {
  const names: Record<string, string> = {
    'buffett': 'Warren Buffett',
    'ackman': 'Bill Ackman',
    'gates': 'Bill Gates',
    'burry': 'Michael Burry',
    'soros': 'George Soros',
    'icahn': 'Carl Icahn',
    'spier': 'Guy Spier'
  }
  return names[slug] || slug
}

// Helper: Check für neue Filings basierend auf Holdings-Daten
async function checkForNewFiling(investorSlug: string): Promise<boolean> {
  try {
    // Checke ob heute schon eine Notification gesendet wurde
    const today = new Date().toISOString().split('T')[0]
    
    const { data: recentCheck } = await supabaseService
      .from('notification_log')
      .select('sent_at')
      .eq('notification_type', 'filing_alert')
      .eq('reference_id', investorSlug)
      .gte('sent_at', `${today}T00:00:00.000Z`)
      .maybeSingle()
    
    if (recentCheck) {
      console.log(`[Filing Check] Already sent notification for ${investorSlug} today`)
      return false
    }

    // Prüfe ob es neue Holdings-Daten gibt (vereinfacht: checke letztes Quarter)
    // In Production würdest du hier die Holdings-API oder File-System prüfen
    
    // Für Test: Spezielle Investoren haben "neue Filings"
    const hasNewFilingToday = ['spier'].includes(investorSlug)
    
    if (hasNewFilingToday) {
      console.log(`[Filing Check] ✅ New filing detected for ${investorSlug}`)
      return true
    }
    
    return false
  } catch (error) {
    console.error(`[Filing Check] Error checking ${investorSlug}:`, error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth-Check
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Filing Cron] Starting filing alerts check...')
    console.log(`[Filing Cron] Test mode: ${TEST_USER_ID ? 'ON (user: ' + TEST_USER_ID + ')' : 'OFF'}`)

    // Alle User mit aktivierten Filing-Notifications holen
    let query = supabaseService
      .from('notification_settings')
      .select(`
        user_id,
        preferred_investors,
        profiles!inner(email_verified)
      `)
      .eq('filings_enabled', true)

    // Filter by test user if set
    if (TEST_USER_ID) {
      query = query.eq('user_id', TEST_USER_ID)
    }

    const { data: usersWithFilingNotifications, error: usersError } = await query

    if (usersError) {
      console.error('[Filing Cron] Users Error:', usersError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    console.log(`[Filing Cron] Found ${usersWithFilingNotifications?.length || 0} users with filing notifications enabled`)

    let totalFilingNotifications = 0
    let totalFilingEmails = 0

    // Für jeden User prüfen
    for (const userSettings of usersWithFilingNotifications || []) {
      const preferredInvestors = userSettings.preferred_investors || []
      
      if (preferredInvestors.length === 0) continue

      for (const investorSlug of preferredInvestors) {
        try {
          // Check für neue Filings für diesen Investor
          const hasNewFiling = await checkForNewFiling(investorSlug)
          
          if (hasNewFiling) {
            // Prüfen ob wir schon heute eine Filing-Notification gesendet haben
            const today = new Date().toISOString().split('T')[0]
            
            const { data: recentNotification } = await supabaseService
              .from('notification_log')
              .select('id')
              .eq('user_id', userSettings.user_id)
              .eq('notification_type', 'filing_alert')
              .eq('reference_id', investorSlug)
              .gte('sent_at', `${today}T00:00:00.000Z`)
              .maybeSingle()

            if (!recentNotification) {
              const investorName = getInvestorName(investorSlug)

              // ✅ In-App Notification erstellen
              await createInAppNotification({
                userId: userSettings.user_id,
                type: 'filing_alert',
                title: `Neues 13F-Filing von ${investorName}`,
                message: `Neue Portfolio-Änderungen verfügbar`,
                data: { investor: investorSlug },
                href: `/superinvestor/${investorSlug}`
              })
              
              totalFilingNotifications++

              // ✅ E-Mail senden
              const { data: { user } } = await supabaseService.auth.admin.getUserById(userSettings.user_id)
              
              if (user?.email) {
                // Filing E-Mail senden
                const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/notifications/send-filing-email`, {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.CRON_SECRET}`
                  },
                  body: JSON.stringify({
                    userEmail: user.email,
                    investorSlug,
                    investorName,
                    isTest: false // Für Test-Modus
                  })
                })

                if (emailResponse.ok) {
                  totalFilingEmails++
                  
                  // Notification Log erstellen
                  await supabaseService
                    .from('notification_log')
                    .insert({
                      user_id: userSettings.user_id,
                      notification_type: 'filing_alert',
                      reference_id: investorSlug,
                      content: { investor: investorSlug, investorName },
                      email_sent: true
                    })
                }
              }
            }
          }
        } catch (investorError) {
          console.error(`[Filing Cron] Error checking ${investorSlug}:`, investorError)
          continue
        }
      }
    }

    console.log(`[Filing Cron] Created ${totalFilingNotifications} in-app notifications`)
    console.log(`[Filing Cron] Sent ${totalFilingEmails} filing emails`)
    
    return NextResponse.json({
      success: true,
      testMode: !!TEST_USER_ID,
      usersChecked: usersWithFilingNotifications?.length || 0,
      filingNotificationsSent: totalFilingNotifications,
      filingEmailsSent: totalFilingEmails
    })

  } catch (error) {
    console.error('[Filing Cron] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}