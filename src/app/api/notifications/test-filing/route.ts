// src/app/api/notifications/test-filing/route.ts
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
    // Auth-Check (Cron Secret oder nur in Development)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { investorSlug, testUserId } = await request.json()
    
    if (!investorSlug) {
      return NextResponse.json({ error: 'investorSlug required' }, { status: 400 })
    }

    console.log(`[Test] Testing filing notifications for ${investorSlug}...`)
    
    // ✅ NUR für Test-User oder deine User-ID
    const targetUserId = testUserId || 'd5bd6951-6479-4279-afd6-a019d9f6f153' // Deine User-ID
    
    // Nur den Test-User finden
    const { data: usersWithNotifications, error: usersError } = await supabaseService
      .from('notification_settings')
      .select(`
        user_id,
        preferred_investors
      `)
      .eq('user_id', targetUserId)
      .eq('filings_enabled', true)

    if (usersError) {
      console.error('[Test] Users Error:', usersError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    console.log(`[Test] Found ${usersWithNotifications?.length || 0} test users`)

    let notificationsSent = 0

    // Für den Test-User: Test-Notification senden
    for (const userSettings of usersWithNotifications || []) {
      try {
        // ✅ Prüfen ob User dem Investor folgt (optional)
        const isFollowing = userSettings.preferred_investors?.includes(investorSlug)
        
        if (!isFollowing) {
          console.log(`[Test] User ${userSettings.user_id} is not following ${investorSlug}, but sending test anyway...`)
        }

        // User Email holen
        const { data: { user } } = await supabaseService.auth.admin.getUserById(userSettings.user_id)
        
        if (user?.email) {
          console.log(`[Test] Sending test email to ${user.email}`)
          
          // Base URL für API Call
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
          
          // Test-Email senden
          const emailResponse = await fetch(`${baseUrl}/api/notifications/send-filing-email`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.CRON_SECRET}`
            },
            body: JSON.stringify({
              userEmail: user.email,
              investorSlug,
              investorName: getInvestorName(investorSlug),
              isTest: true // Flag für Test-Email
            })
          })

          if (emailResponse.ok) {
            notificationsSent++
            
            // Test-Log erstellen
            await supabaseService
              .from('notification_log')
              .insert({
                user_id: userSettings.user_id,
                notification_type: 'filing_test',
                reference_id: investorSlug,
                content: { test: true, investor: investorSlug },
                email_sent: true
              })
          } else {
            console.error(`[Test] Email failed for ${user.email}`)
          }
        }
      } catch (userError) {
        console.error(`[Test] Error processing user ${userSettings.user_id}:`, userError)
        continue
      }
    }

    console.log(`[Test] Sent ${notificationsSent} test notifications for ${investorSlug} to test user`)
    
    return NextResponse.json({
      success: true,
      investorSlug,
      testUserId: targetUserId,
      notificationsSent,
      message: `Test email sent to test user only`
    })

  } catch (error) {
    console.error('[Test] Fatal error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function
function getInvestorName(slug: string): string {
  const names: Record<string, string> = {
    buffett: 'Warren Buffett',
    ackman: 'Bill Ackman',
    gates: 'Bill Gates',
    burry: 'Michael Burry',
    soros: 'George Soros',
    icahn: 'Carl Icahn',
    spier: 'Guy Spier'
  }
  return names[slug] || slug.charAt(0).toUpperCase() + slug.slice(1)
}