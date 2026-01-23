// src/app/api/test-different-emails/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { testEmail } = await request.json()
    
    if (!testEmail) {
      return NextResponse.json({ error: 'testEmail required' }, { status: 400 })
    }

    // Test verschiedene FROM-Adressen und Inhalte
    const tests = [
      {
        name: 'Standard Finclue',
        from: 'Finclue <team@finclue.de>',
        subject: '📊 Guy Spier Filing Test #1',
        html: '<h1>Standard Finclue Test</h1><p>Test um ' + new Date().toLocaleTimeString() + '</p>'
      },
      {
        name: 'Andere FROM Domain',
        from: 'Finclue <noreply@finclue.de>',
        subject: '📊 Guy Spier Filing Test #2', 
        html: '<h1>Andere FROM Domain Test</h1><p>Test um ' + new Date().toLocaleTimeString() + '</p>'
      },
      {
        name: 'Einfacher Text',
        from: 'Finclue <team@finclue.de>',
        subject: 'Einfacher Test',
        html: '<p>Hallo, das ist ein sehr einfacher Test ohne komplexen HTML.</p>'
      },
      {
        name: 'Ähnlich zu Watchlist',
        from: 'Finclue <team@finclue.de>',
        subject: '🚨 Deine Watchlist Update',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>🚨 Watchlist Alert</h2>
            <p>Eine deiner Aktien hat sich verändert:</p>
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px;">
              <p><strong>AAPL:</strong> -5.2% (Test)</p>
            </div>
            <p>Das ist nur ein Test um zu sehen ob Watchlist-ähnliche E-Mails funktionieren.</p>
          </div>
        `
      }
    ]

    const results = []

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i]
      
      try {
        const { data: emailResult, error: emailError } = await resend.emails.send({
          from: test.from,
          to: [testEmail],
          subject: test.subject,
          html: test.html
        })

        results.push({
          name: test.name,
          success: !emailError,
          subject: test.subject,
          from: test.from,
          result: emailResult,
          error: emailError
        })

        // Pause zwischen E-Mails
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (error) {
        results.push({
          name: test.name,
          success: false,
          error: error
        })
      }
    }

    return NextResponse.json({
      success: true,
      testEmail,
      message: `${tests.length} Tests an ${testEmail} gesendet`,
      results,
      instruction: `Prüfe ${testEmail} in den nächsten 5 Minuten`
    })

  } catch (error) {
    console.error('[Email Test] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}