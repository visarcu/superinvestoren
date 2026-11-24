// src/lib/t212Access.ts
// Anmeldung und Beta-Zugang der Trading-212-Anbindung. Nur für Adressen aus
// T212_SYNC_ALLOWLIST (ersatzweise BROKER_SYNC_BETA_ALLOWLIST): Für fremde Nutzer
// braucht die API vorab die Zustimmung von Trading 212 (API-Terms 6.3).

import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export function isT212Tester(email: string | null | undefined): boolean {
  const list = (process.env.T212_SYNC_ALLOWLIST || process.env.BROKER_SYNC_BETA_ALLOWLIST || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  return !!email && list.includes(email.toLowerCase())
}

export async function authorizeT212(request: Request): Promise<{ user: User } | { error: NextResponse }> {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return { error: NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 }) }
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(header.slice('Bearer '.length))
  if (error || !user) return { error: NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 }) }
  if (!isT212Tester(user.email)) return { error: NextResponse.json({ error: 'Noch nicht freigeschaltet' }, { status: 403 }) }
  return { user }
}
