// src/app/api/newsletter/unsubscribe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // E-Mail-Status auf unsubscribed setzen
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .update({ 
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString()
      })
      .eq('email', normalizedEmail)
      .eq('status', 'confirmed') // Nur confirmed Abos können gekündigt werden
      .select()

    if (error) {
      console.error('Unsubscribe error:', error)
      return NextResponse.json(
        { error: 'Fehler beim Abmelden' },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'E-Mail-Adresse nicht im Newsletter gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Du wurdest erfolgreich vom Newsletter abgemeldet.' 
    })

  } catch (error) {
    console.error('Newsletter unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Ein unerwarteter Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}

// GET Route für Unsubscribe-Links in E-Mails
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return new Response('E-Mail-Parameter fehlt', { status: 400 })
    }

    const normalizedEmail = decodeURIComponent(email).toLowerCase().trim()

    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .update({ 
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString()
      })
      .eq('email', normalizedEmail)
      .eq('status', 'confirmed')
      .select()

    if (error) {
      console.error('Unsubscribe error:', error)
      return new Response('Fehler beim Abmelden', { status: 500 })
    }

    // Simple HTML-Response für One-Click Unsubscribe
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Newsletter Abmelden - FinClue</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center;">
          <h1 style="color: #10b981;">✅ Erfolgreich abgemeldet</h1>
          <p>Du wurdest erfolgreich vom FinClue Newsletter abgemeldet.</p>
          <p style="color: #6b7280; font-size: 14px;">
            Falls du deine Meinung änderst, kannst du dich jederzeit wieder auf 
            <a href="https://finclue.de" style="color: #10b981;">finclue.de</a> anmelden.
          </p>
        </body>
      </html>
    `

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    })

  } catch (error) {
    console.error('Newsletter unsubscribe error:', error)
    return new Response('Ein Fehler ist aufgetreten', { status: 500 })
  }
}