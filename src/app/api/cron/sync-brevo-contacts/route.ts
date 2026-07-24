// src/app/api/cron/sync-brevo-contacts/route.ts
// Cron: synct alle registrierten Finclue-User + bestätigte Newsletter-Abonnenten
// nach Brevo (in eine feste Liste). Idempotent — kann beliebig oft laufen:
// neue User werden automatisch ergänzt, bestehende aktualisiert. Der erste Lauf
// macht gleich ein Backfill aller Bestandsnutzer.
//
// Benötigte Env-Vars:
//   BREVO_API_KEY  — API v3 Key aus Brevo (SMTP & API → API Keys)
//   BREVO_LIST_ID  — numerische ID der Ziel-Liste in Brevo
//   CRON_SECRET    — wie bei den anderen Crons (von Vercel automatisch gesetzt)

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncContactsToBrevo, type BrevoContact } from '@/lib/brevo'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

// Vollständigen Namen in FIRSTNAME / LASTNAME aufteilen (Brevo-Standardattribute)
function splitName(fullName?: string): { FIRSTNAME?: string; LASTNAME?: string } {
  const name = (fullName || '').trim()
  if (!name) return {}
  const parts = name.split(/\s+/)
  if (parts.length === 1) return { FIRSTNAME: parts[0] }
  return { FIRSTNAME: parts[0], LASTNAME: parts.slice(1).join(' ') }
}

export async function GET(request: Request) {
  // Auth: nur Vercel-Cron / interner Aufruf (analog zu den übrigen Crons)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const listId = Number(process.env.BREVO_LIST_ID)
  if (!process.env.BREVO_API_KEY || !listId) {
    return NextResponse.json(
      { ok: false, error: 'BREVO_API_KEY oder BREVO_LIST_ID nicht gesetzt' },
      { status: 500 },
    )
  }

  try {
    // Dedupe per E-Mail — Account-User und Newsletter-Abonnenten können sich überschneiden
    const byEmail = new Map<string, BrevoContact>()

    // 1) Alle Auth-User paginiert laden
    const perPage = 1000
    let page = 1
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
      if (error) throw error

      const users = data.users
      for (const u of users) {
        if (!u.email) continue
        const email = u.email.toLowerCase().trim()
        const meta = (u.user_metadata || {}) as { full_name?: string; newsletter_opt_in?: boolean }
        byEmail.set(email, {
          email,
          attributes: {
            ...splitName(meta.full_name),
            OPT_IN: meta.newsletter_opt_in === true, // Newsletter-Einwilligung als Segment-Flag
            QUELLE: 'account',
          },
        })
      }

      if (users.length < perPage) break
      page++
      if (page > 50) break // Sicherheitslimit (max. 50k User)
    }

    // 2) Bestätigte Newsletter-Abonnenten ohne Account ergänzen
    const { data: subs, error: subsError } = await supabase
      .from('newsletter_subscribers')
      .select('email, status')
      .eq('status', 'confirmed')
    if (subsError) throw subsError

    for (const s of subs || []) {
      const email = (s.email || '').toLowerCase().trim()
      if (!email || byEmail.has(email)) continue // Account-User haben Vorrang
      byEmail.set(email, {
        email,
        attributes: { OPT_IN: true, QUELLE: 'newsletter' },
      })
    }

    const contacts = Array.from(byEmail.values())
    const result = await syncContactsToBrevo(contacts, listId)

    console.log(`[Brevo Sync] ${result.imported}/${contacts.length} Kontakte in Liste ${listId} (${result.chunks} Chunks)`)

    return NextResponse.json({
      ok: result.ok,
      total: contacts.length,
      imported: result.imported,
      chunks: result.chunks,
      errors: result.errors.length ? result.errors : undefined,
    })
  } catch (error) {
    console.error('[Brevo Sync] Fatal error:', error)
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}

// POST für manuelle Trigger (z.B. aus der Konsole)
export const POST = GET
