// src/app/api/test-email-subjects/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const userEmail = 'visarcurraj95@gmail.com'

    // Test verschiedene Subject Lines
    const testSubjects = [
      '🚨 Watchlist Alert Test',  // Ähnlich zu Watchlist (die ankommen)
      '📊 Neues 13F-Filing von Guy Spier',  // Original Filing Subject
      '[TEST] Neues 13F-Filing von Guy Spier',  // Mit TEST Tag
      'Guy Spier Portfolio Update',  // Ohne Emojis/Keywords
      'FinClue Notification Test'  // Neutral
    ]

    const results = []

    for (let i = 0; i < testSubjects.length; i++) {
      const subject = testSubjects[i]
      
      try {
        const { data: emailResult, error: emailError } = await resend.emails.send({
          from: 'FinClue <team@finclue.de>',
          to: [userEmail],
          subject: subject,
          html: `
            <h1>${subject}</h1>
            <p>Test #${i + 1} - ${new Date().toISOString()}</p>
            <p>Falls du diese E-Mail erhältst, funktioniert dieses Subject Line.</p>
            <p><strong>Subject:</strong> ${subject}</p>
          `
        })

        results.push({
          subject,
          success: !emailError,
          result: emailResult,
          error: emailError
        })

        // Kurze Pause zwischen E-Mails
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        results.push({
          subject,
          success: false,
          error: error
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `${testSubjects.length} Test-E-Mails mit verschiedenen Subjects gesendet`,
      results,
      instruction: 'Prüfe deinen Posteingang + Spam-Ordner. Welche E-Mails kommen an?'
    })

  } catch (error) {
    console.error('[Subject Test] Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}