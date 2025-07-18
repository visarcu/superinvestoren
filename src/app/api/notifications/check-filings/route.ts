// src/app/api/notifications/check-filings/route.ts
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
    'icahn': 'Carl Icahn'
  }
  return names[slug] || slug
}

// Helper: Check für neue Filings (vereinfacht für Test)
async function checkForNewFiling(investorSlug: string): Promise<boolean> {
  // VEREINFACHT: In deinem Fall könntest du hier prüfen:
  // 1. Neue Holdings-Daten in deinem System
  // 2. Letzte Filing-Date vs. aktuelle Date
  // 3. SEC API für echte 13F Filings
  
  // FÜR TEST: Nur für bestimmte Investoren "neue Filings" simulieren
 // const testInvestors = ['buffett', 'ackman'] 
 // return testInvestors.includes(investorSlug)
 return true
}

export async function POST(request: NextRequest) {
  try {
    // Auth-Check
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Filing Cron] Starting filing alerts check...')
    
    // Alle User mit aktivierten Filing-Notifications holen
    const { data: usersWithFilingNotifications, error: usersError } = await supabaseService
      .from('notification_settings')
      .select(`
        user_id,
        preferred_investors,
        profiles!inner(email_verified)
      `)
      .eq('filings_enabled', true)

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
      usersChecked: usersWithFilingNotifications?.length || 0,
      filingNotificationsSent: totalFilingNotifications,
      filingEmailsSent: totalFilingEmails
    })

  } catch (error) {
    console.error('[Filing Cron] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}