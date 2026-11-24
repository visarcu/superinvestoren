// /api/portfolio/historical-prices
// Holt historische Schlusskurse für {symbol, date}-Paare — wird primär für
// Depotübertrag-Transaktionen genutzt, bei denen die Broker-Abrechnung keinen
// Einstandskurs mitliefert (ING ist hier der Hauptfall). Als Einstandskurs
// nehmen wir dann den Close am Transfer-Datum (oder nächst-früheren Börsentag).
//
// Alle Kurse kommen in EUR zurück: FMP liefert in der Börsenwährung (US-Titel
// in USD, London in Pence), das Depot rechnet in Euro. Umgerechnet wird mit
// dem Wechselkurs des Kurstags. Früher ging der USD-Kurs unverändert als Euro
// durch — MBGL am 02.07.2026 stand mit 19,80 € statt 17,32 € im Depot.
//
// Request:
//   POST { items: [{ symbol: 'VGWL.DE', date: '2024-10-17' }, ...] }
// Response:
//   { results: { 'VGWL.DE|2024-10-17': 128.55, ... },
//     details: { 'MBGL|2026-07-02': { close: 19.8, currency: 'USD', eurRate: 0.8746, priceDate: '2026-07-02' }, ... } }
// Nicht gefundene Paare fehlen in beiden Objekten (kein Fehler) — auch dann,
// wenn der Wechselkurs fehlt: lieber kein Kurs als einer in falscher Währung.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { loadEurCloses, type CloseRequest } from '@/lib/historicalEurCloses'

// Jedes Paar kostet einen FMP-Call (plus FX) — ohne Obergrenze ließe sich
// das Kontingent mit einem einzigen Request leerziehen.
const MAX_ITEMS = 500

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(request: Request) {
  // Auth: Die Route verbraucht FMP-Kontingent pro angefragtem Paar — sie war
  // offen und damit für jeden ein kostenloser Kurs-Proxy.
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(authHeader.slice('Bearer '.length))
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  try {
    const { items } = (await request.json()) as { items?: CloseRequest[] }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ results: {}, details: {} })
    }
    if (items.length > MAX_ITEMS) {
      return NextResponse.json({ error: `Maximal ${MAX_ITEMS} Einträge pro Anfrage` }, { status: 400 })
    }

    const { results, details } = await loadEurCloses(items)
    return NextResponse.json({ results, details })
  } catch (error) {
    console.error('historical-prices error:', error)
    return NextResponse.json({ error: 'Fehler beim Abrufen historischer Kurse' }, { status: 500 })
  }
}
