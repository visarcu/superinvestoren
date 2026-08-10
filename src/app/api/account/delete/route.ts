// src/app/api/account/delete/route.ts
// Endgültige Konto-Löschung (DSGVO Art. 17 / App Store Guideline 5.1.1(v)).
// Wird von App und Website genutzt. Auth via Supabase-Bearer-Token.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {})

/**
 * Tabellen ohne FK auf auth.users bzw. mit ON DELETE RESTRICT müssen manuell
 * geräumt werden. Alles andere (profiles, portfolios → holdings/transactions/
 * depots, watchlists, notifications, notification_settings, notification_log,
 * device_tokens, price_alerts, premium_subscriptions, widget_api_keys) hängt
 * per ON DELETE CASCADE an auth.users und verschwindet mit deleteUser().
 */
const TABLES_BY_USER_ID = ['chart_presets', 'onboarding_email_log'] as const
// Reihenfolge zählt: RESTRICT-Kinder vor dem User-Datensatz löschen.
const PRISMA_CHILDREN = [
  'WatchlistItem',
  'EmailVerificationToken',
  'PasswordResetToken',
  'AIReportDownload',
] as const

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.split(' ')[1]
  const { data: { user }, error: authError } = await supabaseService.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const userId = user.id
  const email = user.email ?? null
  const failures: string[] = []

  // 1) Laufendes Stripe-Abo kündigen, damit nach der Löschung nicht
  //    weiter abgerechnet wird.
  try {
    const { data: profile } = await supabaseService
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .maybeSingle()

    const subId = profile?.stripe_subscription_id
    if (subId) {
      await stripe.subscriptions.cancel(subId)
    }
  } catch (e: any) {
    // Ein bereits gekündigtes Abo ist kein Fehler — alles andere schon.
    if (e?.code !== 'resource_missing') {
      console.error('[account/delete] Stripe cancel failed:', e?.message)
      failures.push('stripe')
    }
  }

  // 2) Legacy-Prisma-Tabellen (RESTRICT-FKs auf "User").
  for (const table of PRISMA_CHILDREN) {
    const { error } = await supabaseService.from(table).delete().eq('userId', userId)
    if (error) {
      console.error(`[account/delete] ${table} failed:`, error.message)
      failures.push(table)
    }
  }
  {
    const { error } = await supabaseService.from('User').delete().eq('id', userId)
    if (error) {
      console.error('[account/delete] User failed:', error.message)
      failures.push('User')
    }
  }

  // 3) Tabellen ohne FK auf auth.users.
  for (const table of TABLES_BY_USER_ID) {
    const { error } = await supabaseService.from(table).delete().eq('user_id', userId)
    if (error) {
      console.error(`[account/delete] ${table} failed:`, error.message)
      failures.push(table)
    }
  }

  // 4) Newsletter-Einträge hängen an der E-Mail, nicht an der User-ID.
  if (email) {
    for (const table of ['newsletter_subscribers', 'Subscriber']) {
      const { error } = await supabaseService.from(table).delete().eq('email', email)
      if (error) {
        console.error(`[account/delete] ${table} failed:`, error.message)
        failures.push(table)
      }
    }
  }

  // 5) Auth-User zuletzt — löst den Cascade für alles Übrige aus.
  //    Schlägt das fehl, bleibt das Konto nutzbar; Teillöschung wäre schlimmer
  //    als gar keine, deshalb hier ein harter Fehler.
  const { error: deleteError } = await supabaseService.auth.admin.deleteUser(userId)
  if (deleteError) {
    console.error('[account/delete] auth.deleteUser failed:', deleteError.message)
    return NextResponse.json(
      { error: 'Konto konnte nicht vollständig gelöscht werden. Bitte kontaktiere den Support.' },
      { status: 500 }
    )
  }

  if (failures.length) {
    // Der Account ist weg — Restdaten müssen manuell nachgezogen werden.
    console.error('[account/delete] Partial cleanup for', userId, '→', failures.join(', '))
  }

  return NextResponse.json({ success: true })
}
