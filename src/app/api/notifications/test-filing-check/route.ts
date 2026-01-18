// src/app/api/notifications/test-filing-check/route.ts
// Test-Endpoint zum manuellen Testen der Filing-Benachrichtigungen
// Sendet NUR an den TEST_USER_ID (dich)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import holdingsHistory from '@/data/holdings'

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

// Deine User-ID für Tests
const TEST_USER_ID = 'd5bd6951-6479-4279-afd6-a019d9f6f153'

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

function getLatestFilingDate(investorSlug: string): { date: string; quarterKey: string } | null {
  const investorData = (holdingsHistory as Record<string, HoldingsSnapshot[]>)[investorSlug]

  if (!investorData || investorData.length === 0) {
    return null
  }

  const sorted = [...investorData].sort((a, b) => b.quarter.localeCompare(a.quarter))
  const latestSnapshot = sorted[0]

  return {
    date: latestSnapshot.data.date,
    quarterKey: latestSnapshot.data.quarterKey
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const investor = searchParams.get('investor') || 'spier'
    const sendEmail = searchParams.get('sendEmail') === 'true'
    const skipDuplicateCheck = searchParams.get('force') === 'true'

    console.log(`[Test Filing] Testing for investor: ${investor}, sendEmail: ${sendEmail}, force: ${skipDuplicateCheck}`)

    // 1. Prüfe ob der Investor existiert
    const latestFiling = getLatestFilingDate(investor)
    if (!latestFiling) {
      return NextResponse.json({
        success: false,
        error: `Investor "${investor}" nicht gefunden in Holdings-Daten`
      }, { status: 404 })
    }

    // 2. Prüfe ob du den Investor abonniert hast
    const { data: userSettings } = await supabaseService
      .from('notification_settings')
      .select('preferred_investors, filings_enabled')
      .eq('user_id', TEST_USER_ID)
      .maybeSingle()

    const isSubscribed = userSettings?.preferred_investors?.includes(investor)
    const filingsEnabled = userSettings?.filings_enabled

    // 3. Prüfe letzte Notification
    const { data: lastNotification } = await supabaseService
      .from('notification_log')
      .select('sent_at, content')
      .eq('user_id', TEST_USER_ID)
      .eq('notification_type', 'filing_alert')
      .eq('reference_id', investor)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastNotifiedQuarter = lastNotification?.content?.quarterKey
    const isNewQuarter = lastNotifiedQuarter !== latestFiling.quarterKey

    // 4. Hole User-Email
    const { data: { user } } = await supabaseService.auth.admin.getUserById(TEST_USER_ID)

    const result: any = {
      testUser: TEST_USER_ID,
      userEmail: user?.email,
      investor,
      investorName: getInvestorName(investor),
      latestFiling,
      subscription: {
        filingsEnabled,
        isSubscribed,
        preferredInvestors: userSettings?.preferred_investors || []
      },
      lastNotification: lastNotification ? {
        sentAt: lastNotification.sent_at,
        quarterKey: lastNotifiedQuarter
      } : null,
      wouldTrigger: isNewQuarter || skipDuplicateCheck,
      reason: !isNewQuarter
        ? `Bereits benachrichtigt für ${lastNotifiedQuarter}`
        : 'Neues Quarter erkannt'
    }

    // 5. Optional: Tatsächlich senden
    if (sendEmail && (isNewQuarter || skipDuplicateCheck)) {
      const investorName = getInvestorName(investor)

      // In-App Notification erstellen
      const { error: notifError } = await supabaseService
        .from('notifications')
        .insert({
          user_id: TEST_USER_ID,
          type: 'filing_alert',
          title: `Neues 13F-Filing von ${investorName}`,
          message: `${latestFiling.quarterKey} Portfolio-Änderungen verfügbar`,
          data: { investor, quarterKey: latestFiling.quarterKey },
          href: `/superinvestor/${investor}`
        })

      result.inAppNotification = notifError ? { error: notifError.message } : { created: true }

      // E-Mail senden
      if (user?.email) {
        const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/notifications/send-filing-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CRON_SECRET}`
          },
          body: JSON.stringify({
            userEmail: user.email,
            investorSlug: investor,
            investorName,
            quarterKey: latestFiling.quarterKey,
            filingDate: latestFiling.date
          })
        })

        const emailResult = await emailResponse.json()
        result.emailSent = emailResponse.ok
        result.emailResult = emailResult

        if (emailResponse.ok) {
          // Log erstellen
          await supabaseService
            .from('notification_log')
            .insert({
              user_id: TEST_USER_ID,
              notification_type: 'filing_alert',
              reference_id: investor,
              content: {
                investor,
                investorName,
                quarterKey: latestFiling.quarterKey,
                filingDate: latestFiling.date,
                isTest: true
              },
              email_sent: true
            })
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...result
    })

  } catch (error) {
    console.error('[Test Filing] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
