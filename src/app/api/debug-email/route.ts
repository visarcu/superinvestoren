// src/app/api/debug-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// Lazy initialization - wird erst bei erster Nutzung initialisiert
// Dies verhindert Build-Fehler wenn Umgebungsvariablen nicht gesetzt sind
let _supabaseService: SupabaseClient | null = null

function getSupabaseService(): SupabaseClient {
  if (!_supabaseService) {
    _supabaseService = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  }
  return _supabaseService
}

export async function POST(request: NextRequest) {
  try {
    const targetUserId = 'd5bd6951-6479-4279-afd6-a019d9f6f153'

    // 1. User Email holen
    const { data: { user }, error: userError } = await getSupabaseService().auth.admin.getUserById(targetUserId)

    console.log('[Debug] User data:', { userId: targetUserId, email: user?.email, userError })

    // 2. Letzte Notification Logs prüfen
    const { data: recentLogs, error: logsError } = await getSupabaseService()
      .from('notification_log')
      .select('*')
      .eq('user_id', targetUserId)
      .order('sent_at', { ascending: false })
      .limit(5)

    console.log('[Debug] Recent notification logs:', recentLogs)

    // 3. Direct Resend Test
    if (user?.email) {
      console.log('[Debug] Testing direct Resend API call...')

      try {
        const resend = new Resend(process.env.RESEND_API_KEY)

        const { data: emailResult, error: emailError } = await resend.emails.send({
          from: 'FinClue <team@finclue.de>',
          to: [user.email],
          subject: '[DEBUG] Test E-Mail von FinClue',
          html: `
            <h1>Debug Test E-Mail</h1>
            <p>Wenn du diese E-Mail erhältst, funktioniert Resend.</p>
            <p>Zeit: ${new Date().toISOString()}</p>
            <p>User ID: ${targetUserId}</p>
          `
        })

        console.log('[Debug] Direct Resend result:', { emailResult, emailError })

        return NextResponse.json({
          success: true,
          userEmail: user.email,
          recentLogs,
          directResendTest: {
            success: !emailError,
            result: emailResult,
            error: emailError
          }
        })

      } catch (resendError) {
        console.error('[Debug] Resend import/call error:', resendError)
        return NextResponse.json({
          success: false,
          userEmail: user.email,
          recentLogs,
          error: 'Resend API error',
          details: resendError
        })
      }
    }

    return NextResponse.json({
      success: false,
      userEmail: user?.email || 'Not found',
      recentLogs,
      userError
    })

  } catch (error) {
    console.error('[Debug] Fatal error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
