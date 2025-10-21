// src/app/api/test-spier-workflow/route.ts
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
    const { step } = await request.json()
    const targetUserId = 'd5bd6951-6479-4279-afd6-a019d9f6f153' // Deine User-ID

    console.log(`[Spier Workflow] Executing step ${step}`)

    switch (step) {
      case 1: {
        // Step 1: Guy Spier abonnieren
        const { data: currentSettings } = await supabaseService
          .from('notification_settings')
          .select('*')
          .eq('user_id', targetUserId)
          .maybeSingle()

        let result
        if (currentSettings) {
          // Update existierende Settings
          const currentInvestors = currentSettings.preferred_investors || []
          const updatedInvestors = currentInvestors.includes('spier') 
            ? currentInvestors 
            : [...currentInvestors, 'spier']

          const { data: updatedSettings, error } = await supabaseService
            .from('notification_settings')
            .update({
              preferred_investors: updatedInvestors,
              filings_enabled: true,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', targetUserId)
            .select()
            .single()

          if (error) throw error
          result = { action: 'updated', settings: updatedSettings }
        } else {
          // Neue Settings erstellen
          const { data: newSettings, error } = await supabaseService
            .from('notification_settings')
            .insert({
              user_id: targetUserId,
              preferred_investors: ['spier'],
              filings_enabled: true,
              watchlist_enabled: false,
              watchlist_threshold_percent: 10
            })
            .select()
            .single()

          if (error) throw error
          result = { action: 'created', settings: newSettings }
        }

        return NextResponse.json({
          success: true,
          step: 1,
          message: 'Guy Spier erfolgreich abonniert',
          ...result
        })
      }

      case 2: {
        // Step 2: Settings verifizieren
        const { data: settings } = await supabaseService
          .from('notification_settings')
          .select('*')
          .eq('user_id', targetUserId)
          .maybeSingle()

        const { data: { user } } = await supabaseService.auth.admin.getUserById(targetUserId)

        return NextResponse.json({
          success: true,
          step: 2,
          userId: targetUserId,
          userEmail: user?.email,
          settings,
          hasSpierSubscribed: settings?.preferred_investors?.includes('spier') || false,
          filingsEnabled: settings?.filings_enabled || false
        })
      }

      case 3: {
        // Step 3: Filing-Check triggern
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/notifications/check-filings`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CRON_SECRET}`
          }
        })

        const filingResult = await response.json()

        return NextResponse.json({
          success: response.ok,
          step: 3,
          filingCheckResult: filingResult,
          message: response.ok 
            ? `Filing-Check ausgeführt: ${filingResult.filingEmailsSent || 0} E-Mails gesendet`
            : 'Filing-Check fehlgeschlagen'
        })
      }

      case 4: {
        // Step 4: Test-E-Mail senden
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/notifications/test-filing`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            investorSlug: 'spier'
          })
        })

        const testResult = await response.json()

        return NextResponse.json({
          success: response.ok,
          step: 4,
          testEmailResult: testResult,
          message: response.ok 
            ? 'Test-E-Mail für Guy Spier gesendet'
            : 'Test-E-Mail fehlgeschlagen'
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
    }

  } catch (error) {
    console.error('[Spier Workflow] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}