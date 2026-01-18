// src/app/api/notifications/check-filings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import holdingsHistory from '@/data/holdings'

// TEST MODE: Set to your user ID to only send notifications to yourself
// Set to null to send to all users. Must be a valid UUID format.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const envTestUserId = process.env.TEST_USER_ID || null
const TEST_USER_ID = envTestUserId && UUID_REGEX.test(envTestUserId) ? envTestUserId : null

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

// Holdings-Daten Typ
interface QuarterData {
  form: string
  date: string
  period: string
  accession: string
  quarterKey: string
  positions: any[]
  totalValue: number
  positionsCount: number
}

interface HoldingsSnapshot {
  quarter: string
  data: QuarterData
}

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

// Helper: Hole das neueste Filing-Datum für einen Investor
function getLatestFilingDate(investorSlug: string): { date: string; quarterKey: string } | null {
  const investorData = (holdingsHistory as Record<string, HoldingsSnapshot[]>)[investorSlug]

  if (!investorData || investorData.length === 0) {
    return null
  }

  // Sortiere nach Quarter (neuestes zuerst)
  const sorted = [...investorData].sort((a, b) => {
    return b.quarter.localeCompare(a.quarter)
  })

  const latestSnapshot = sorted[0]
  return {
    date: latestSnapshot.data.date,
    quarterKey: latestSnapshot.data.quarterKey
  }
}

// Helper: Check für neue Filings basierend auf Holdings-Daten
async function checkForNewFiling(investorSlug: string): Promise<{ isNew: boolean; filingDate?: string; quarterKey?: string }> {
  try {
    // Hole das neueste Filing aus den Holdings-Daten
    const latestFiling = getLatestFilingDate(investorSlug)

    if (!latestFiling) {
      console.log(`[Filing Check] No holdings data found for ${investorSlug}`)
      return { isNew: false }
    }

    console.log(`[Filing Check] Latest filing for ${investorSlug}: ${latestFiling.date} (${latestFiling.quarterKey})`)

    // Prüfe ob wir für dieses Filing (basierend auf quarterKey) schon eine Notification gesendet haben
    const { data: existingNotification } = await supabaseService
      .from('notification_log')
      .select('sent_at, content')
      .eq('notification_type', 'filing_alert')
      .eq('reference_id', investorSlug)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Wenn es keine vorherige Notification gibt, ist es neu
    if (!existingNotification) {
      console.log(`[Filing Check] ✅ No previous notification for ${investorSlug}, marking as new`)
      return { isNew: true, filingDate: latestFiling.date, quarterKey: latestFiling.quarterKey }
    }

    // Prüfe ob das quarterKey in der letzten Notification anders ist
    const lastNotifiedQuarter = existingNotification.content?.quarterKey

    if (lastNotifiedQuarter !== latestFiling.quarterKey) {
      console.log(`[Filing Check] ✅ New quarter detected for ${investorSlug}: ${latestFiling.quarterKey} (last notified: ${lastNotifiedQuarter})`)
      return { isNew: true, filingDate: latestFiling.date, quarterKey: latestFiling.quarterKey }
    }

    console.log(`[Filing Check] Already notified for ${investorSlug} ${latestFiling.quarterKey}`)
    return { isNew: false }
  } catch (error) {
    console.error(`[Filing Check] Error checking ${investorSlug}:`, error)
    return { isNew: false }
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
        preferred_investors
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
    let totalInvestorsChecked = 0
    let newFilingsFound = 0
    const newFilingsList: string[] = []

    // Für jeden User prüfen
    for (const userSettings of usersWithFilingNotifications || []) {
      const preferredInvestors = userSettings.preferred_investors || []

      if (preferredInvestors.length === 0) continue

      for (const investorSlug of preferredInvestors) {
        totalInvestorsChecked++
        try {
          // Check für neue Filings für diesen Investor
          const filingCheck = await checkForNewFiling(investorSlug)

          if (filingCheck.isNew) {
            if (!newFilingsList.includes(investorSlug)) {
              newFilingsFound++
              newFilingsList.push(investorSlug)
            }

            // Prüfen ob dieser User schon eine Notification für dieses Quarter bekommen hat
            const { data: existingUserNotification } = await supabaseService
              .from('notification_log')
              .select('id')
              .eq('user_id', userSettings.user_id)
              .eq('notification_type', 'filing_alert')
              .eq('reference_id', investorSlug)
              .filter('content->>quarterKey', 'eq', filingCheck.quarterKey)
              .maybeSingle()

            if (!existingUserNotification) {
              const investorName = getInvestorName(investorSlug)

              // ✅ In-App Notification erstellen
              await createInAppNotification({
                userId: userSettings.user_id,
                type: 'filing_alert',
                title: `Neues 13F-Filing von ${investorName}`,
                message: `${filingCheck.quarterKey} Portfolio-Änderungen verfügbar`,
                data: { investor: investorSlug, quarterKey: filingCheck.quarterKey },
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
                    quarterKey: filingCheck.quarterKey,
                    filingDate: filingCheck.filingDate
                  })
                })

                if (emailResponse.ok) {
                  totalFilingEmails++

                  // Notification Log erstellen (mit quarterKey für Duplikat-Prüfung)
                  await supabaseService
                    .from('notification_log')
                    .insert({
                      user_id: userSettings.user_id,
                      notification_type: 'filing_alert',
                      reference_id: investorSlug,
                      content: {
                        investor: investorSlug,
                        investorName,
                        quarterKey: filingCheck.quarterKey,
                        filingDate: filingCheck.filingDate
                      },
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

    console.log(`[Filing Cron] Checked ${totalInvestorsChecked} investor subscriptions`)
    console.log(`[Filing Cron] Found ${newFilingsFound} new filings: ${newFilingsList.join(', ') || 'none'}`)
    console.log(`[Filing Cron] Created ${totalFilingNotifications} in-app notifications`)
    console.log(`[Filing Cron] Sent ${totalFilingEmails} filing emails`)

    return NextResponse.json({
      success: true,
      testMode: !!TEST_USER_ID,
      usersChecked: usersWithFilingNotifications?.length || 0,
      investorsChecked: totalInvestorsChecked,
      newFilingsFound,
      newFilingsList,
      filingNotificationsSent: totalFilingNotifications,
      filingEmailsSent: totalFilingEmails
    })

  } catch (error) {
    console.error('[Filing Cron] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}