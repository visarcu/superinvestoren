// src/app/api/newsletter/subscribe/route.ts - MIT WILLKOMMENS-EMAIL
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { sendWelcomeEmail } from '@/lib/resend'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Email-Validierung
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Ungültige E-Mail-Adresse' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Prüfen ob E-Mail bereits existiert
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

    // Falls E-Mail bereits existiert
    if (existingSubscriber) {
      if (existingSubscriber.status === 'confirmed') {
        return NextResponse.json(
          { error: 'Diese E-Mail-Adresse ist bereits für den Newsletter angemeldet' },
          { status: 409 }
        )
      } else if (existingSubscriber.status === 'unsubscribed') {
        // Reactivate unsubscribed user
        const { error: updateError } = await supabase
          .from('newsletter_subscribers')
          .update({ 
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            unsubscribed_at: null
          })
          .eq('email', normalizedEmail)

        if (updateError) {
          console.error('Update error:', updateError)
          return NextResponse.json(
            { error: 'Fehler beim Reaktivieren des Abonnements' },
            { status: 500 }
          )
        }

        // Willkommens-E-Mail auch bei Reaktivierung senden
        await sendWelcomeEmail(normalizedEmail)

        return NextResponse.json({ 
          success: true, 
          message: 'Newsletter-Abonnement erfolgreich reaktiviert! Check deine E-Mails.' 
        })
      }
    }

    // Neue E-Mail hinzufügen
    const { error: insertError } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email: normalizedEmail,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        subscription_source: 'website'
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: 'Fehler beim Speichern der E-Mail-Adresse' },
        { status: 500 }
      )
    }

    // 🎉 Willkommens-E-Mail senden
    const emailResult = await sendWelcomeEmail(normalizedEmail)
    
    if (!emailResult.success) {
      console.error('Welcome email failed:', emailResult.error)
      // Aber trotzdem Success zurückgeben - Newsletter-Anmeldung war erfolgreich
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Erfolgreich angemeldet! Check deine E-Mails für eine Willkommensnachricht.' 
    })

  } catch (error) {
    console.error('Newsletter signup error:', error)
    return NextResponse.json(
      { error: 'Ein unerwarteter Fehler ist aufgetreten' },
      { status: 500 }
    )
  }
}