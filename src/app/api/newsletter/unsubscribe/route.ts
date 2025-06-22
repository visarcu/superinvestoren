// src/app/api/newsletter/unsubscribe/route.ts - FINALE PRODUKTIONS-VERSION
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

    // Zuerst prüfen ob E-Mail existiert
    const { data: existingSubscriber, error: fetchError } = await supabase
      .from('newsletter_subscribers')
      .select('email, status')
      .eq('email', normalizedEmail)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Database fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Datenbankfehler beim Suchen' },
        { status: 500 }
      )
    }

    if (!existingSubscriber) {
      return NextResponse.json(
        { error: 'E-Mail-Adresse nicht im Newsletter gefunden' },
        { status: 404 }
      )
    }

    // Wenn bereits abgemeldet
    if (existingSubscriber.status === 'unsubscribed') {
      return NextResponse.json({
        success: true,
        message: 'Du warst bereits vom Newsletter abgemeldet.'
      })
    }

    // E-Mail abmelden
    const { error: updateError } = await supabase
      .from('newsletter_subscribers')
      .update({ status: 'unsubscribed' })
      .eq('email', normalizedEmail)

    if (updateError) {
      console.error('Unsubscribe error:', updateError)
      return NextResponse.json(
        { error: 'Fehler beim Abmelden' },
        { status: 500 }
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
      return new Response(generateErrorPage('E-Mail-Parameter fehlt'), { 
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    const normalizedEmail = decodeURIComponent(email).toLowerCase().trim()

    // Zuerst prüfen ob E-Mail existiert
    const { data: existingSubscriber, error: fetchError } = await supabase
      .from('newsletter_subscribers')
      .select('email, status')
      .eq('email', normalizedEmail)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Database fetch error:', fetchError)
      return new Response(generateErrorPage('Datenbankfehler beim Suchen'), { 
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    if (!existingSubscriber) {
      return new Response(generateErrorPage('E-Mail-Adresse nicht im Newsletter gefunden'), { 
        status: 404,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // Wenn bereits abgemeldet
    if (existingSubscriber.status === 'unsubscribed') {
      return new Response(generateSuccessPage('Du warst bereits vom Newsletter abgemeldet.'), {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // E-Mail abmelden
    const { error: updateError } = await supabase
      .from('newsletter_subscribers')
      .update({ status: 'unsubscribed' })
      .eq('email', normalizedEmail)

    if (updateError) {
      console.error('Unsubscribe update error:', updateError)
      return new Response(generateErrorPage('Fehler beim Abmelden'), { 
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // Erfolgs-Seite
    return new Response(generateSuccessPage('Du wurdest erfolgreich vom Newsletter abgemeldet.'), {
      headers: { 'Content-Type': 'text/html' }
    })

  } catch (error) {
    console.error('Newsletter unsubscribe error:', error)
    return new Response(generateErrorPage('Ein unerwarteter Fehler ist aufgetreten'), { 
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    })
  }
}

function generateSuccessPage(message: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Newsletter Abmelden - FinClue</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; background-color: #f8fafc;">
      <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 24px;">✅</span>
        </div>
        <h1 style="color: #1f2937; margin-bottom: 16px;">Erfolgreich abgemeldet</h1>
        <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          ${message}
        </p>
        <p style="color: #9ca3af; font-size: 14px; line-height: 1.5;">
          Falls du deine Meinung änderst, kannst du dich jederzeit wieder auf
          <a href="https://finclue.de" style="color: #10b981; text-decoration: none; font-weight: 500;">finclue.de</a> anmelden.
        </p>
      </div>
    </body>
    </html>
  `
}

function generateErrorPage(error: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Fehler - FinClue</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; background-color: #f8fafc;">
      <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #ef4444 0%, #f97316 100%); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 24px;">❌</span>
        </div>
        <h1 style="color: #1f2937; margin-bottom: 16px;">Fehler beim Abmelden</h1>
        <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          ${error}
        </p>
        <p style="color: #9ca3af; font-size: 14px; line-height: 1.5;">
          Bitte kontaktiere uns unter 
          <a href="mailto:team@finclue.de" style="color: #3b82f6; text-decoration: none; font-weight: 500;">team@finclue.de</a>
          falls das Problem weiterhin besteht.
        </p>
        <div style="margin-top: 24px;">
          <a href="https://finclue.de" style="background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; display: inline-block;">Zurück zu FinClue</a>
        </div>
      </div>
    </body>
    </html>
  `
}