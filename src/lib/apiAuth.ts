// src/lib/apiAuth.ts
//
// Anmeldeprüfung für API-Routen: Supabase-Zugangstoken aus dem
// Authorization-Header ("Bearer <token>"), geprüft über den Service-Client.
// Für Routen ohne Premium-Prüfung; Finclue AI nutzt weiterhin getAiUser.

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export interface ApiUser {
  id: string
  email: string | null
}

export async function getRequestUser(request: Request): Promise<ApiUser | null> {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length).trim()
  if (!token) return null
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data.user) return null
    return { id: data.user.id, email: data.user.email ?? null }
  } catch {
    return null
  }
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
}

/** FMP-Symbole: Buchstaben, Ziffern, Punkt, Bindestrich, ^ und = (Indizes, Futures) */
const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9.\-^=]{0,19}$/i

/**
 * Nur gültige, eindeutige Symbole in Großschreibung. Mehr als `max` Symbole
 * oder gar keine Liste → null. Ein Symbol wie "../../v4/…" landete sonst als
 * Pfad in der FMP-Adresse, zusammen mit dem Server-Schlüssel.
 */
export function sanitizeSymbols(input: unknown, max: number): string[] | null {
  if (!Array.isArray(input)) return null
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of input) {
    if (typeof raw !== 'string') continue
    const symbol = raw.trim().toUpperCase()
    if (!SYMBOL_PATTERN.test(symbol) || seen.has(symbol)) continue
    seen.add(symbol)
    out.push(symbol)
    if (out.length > max) return null
  }
  return out
}
