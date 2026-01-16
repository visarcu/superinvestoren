// src/app/api/direct-resend-test/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

// Lazy initialization - wird erst bei erster Nutzung initialisiert
// Dies verhindert Build-Fehler wenn RESEND_API_KEY nicht gesetzt ist
let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Direct Test] Starting direct Resend test...')
    console.log('[Direct Test] API Key exists:', !!process.env.RESEND_API_KEY)
    console.log('[Direct Test] API Key prefix:', process.env.RESEND_API_KEY?.substring(0, 8))

    // Direkte E-Mail ohne irgendwelche API-Aufrufe
    const { data: emailResult, error: emailError } = await getResend().emails.send({
      from: 'FinClue <team@finclue.de>',
      to: ['visarcurraj95@gmail.com'],
      subject: '🧪 DIRECT TEST - ' + new Date().toLocaleTimeString(),
      html: `
        <h1>🧪 Direct Resend Test</h1>
        <p><strong>Zeit:</strong> ${new Date().toISOString()}</p>
        <p><strong>Test:</strong> Direkte E-Mail ohne API-Umwege</p>
        <p>Wenn du das siehst, funktioniert Resend grundsätzlich!</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          Gesendet von: direct-resend-test API
        </p>
      `
    })

    console.log('[Direct Test] Email result:', { emailResult, emailError })

    if (emailError) {
      console.error('[Direct Test] Email error:', emailError)
      return NextResponse.json({ 
        success: false, 
        error: 'Email send failed',
        details: emailError 
      }, { status: 500 })
    }

    console.log('[Direct Test] ✅ Email sent successfully, ID:', emailResult?.id)

    return NextResponse.json({
      success: true,
      message: 'Direct email sent successfully',
      emailId: emailResult?.id,
      timestamp: new Date().toISOString(),
      apiKeyExists: !!process.env.RESEND_API_KEY
    })

  } catch (error) {
    console.error('[Direct Test] Fatal error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}