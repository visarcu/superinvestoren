// src/lib/assetParser.ts
// Freitext → strukturierter Vermögens-Eintrag ("Tagesgeld ING jetzt 5.000",
// "Auto ist noch 15k wert"). Erster Baustein der Sprach-/Texteingabe:
// v1 parst NUR Vermögenswerte (Vermögen light), keine Wertpapier-Käufe —
// die brauchen Ticker-Disambiguierung und kommen als eigener Schritt.
//
// Nur serverseitig verwenden (OPENAI_API_KEY). Der Aufrufer zeigt das
// Ergebnis IMMER zur Bestätigung an, bevor irgendetwas gespeichert wird.

export const ASSET_CATEGORIES = [
  'cash',
  'tagesgeld',
  'festgeld',
  'depot_extern',
  'immobilie',
  'fahrzeug',
  'krypto',
  'edelmetall',
  'kredit',
  'sonstiges',
] as const

export type AssetCategory = (typeof ASSET_CATEGORIES)[number]

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  cash: 'Girokonto / Cash',
  tagesgeld: 'Tagesgeld',
  festgeld: 'Festgeld',
  depot_extern: 'Externes Depot',
  immobilie: 'Immobilie',
  fahrzeug: 'Fahrzeug',
  krypto: 'Krypto',
  edelmetall: 'Edelmetall',
  kredit: 'Kredit / Schulden',
  sonstiges: 'Sonstiges',
}

export type ParsedAssetEntry =
  | { ok: true; name: string; category: AssetCategory; value: number }
  | { ok: false; reason: string }

/** Kategorien, die sich wie Konten verhalten (Saldo + Buchungen) */
export const ACCOUNT_CATEGORIES: readonly AssetCategory[] = ['cash', 'tagesgeld', 'festgeld', 'depot_extern']

/** Absurde Beträge abfangen — 500 Mio. € Tagesgeld ist ein Parse-Fehler */
const MAX_VALUE = 100_000_000

export async function parseAssetEntry(text: string): Promise<ParsedAssetEntry> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { ok: false, reason: 'Parser nicht konfiguriert' }

  const cleaned = text.trim().slice(0, 300)
  if (cleaned.length < 3) return { ok: false, reason: 'Eingabe zu kurz' }

  const prompt = `Du wandelst eine deutsche Freitext-Eingabe in einen Vermögens-Eintrag um.

EINGABE: "${cleaned}"

Antworte NUR mit einem JSON-Objekt, keinem anderen Text:
- Erfolgsfall: {"ok": true, "name": "<kurzer Anzeigename>", "category": "<Kategorie>", "value": <Betrag in EUR als Zahl>}
- Wenn KEIN Vermögens-Eintrag mit Betrag erkennbar ist: {"ok": false, "reason": "<kurze deutsche Begründung>"}

Kategorien (genau eine): ${ASSET_CATEGORIES.join(', ')}

REGELN:
- "name" ist ein prägnanter Anzeigename ("Tagesgeld ING", "VW Golf", "Wohnung Köln"), max. 40 Zeichen
- Beträge normalisieren: "15k" = 15000, "1,5 Mio" = 1500000, deutsche Schreibweise "5.000,50" = 5000.50
- Der genannte Betrag ist IMMER der Gesamtwert des Eintrags — niemals mit Stückzahlen multiplizieren oder verrechnen ("0,2 Bitcoin für 12000" → value 12000)
- Kredite/Schulden/Darlehen ("hab noch 20k Autokredit") → category "kredit", value POSITIV erfassen (die Anwendung zieht sie vom Nettovermögen ab)
- Andere Währungen näherungsweise NICHT umrechnen — wenn explizit eine Fremdwährung genannt wird, ok:false mit Begründung
- Wertpapier-/ETF-Käufe ("hab MSCI World gekauft") sind KEINE Vermögens-Einträge → ok:false mit Hinweis, dass Käufe über Transaktionen laufen
- Keine Erfindungen: fehlt der Betrag, ok:false`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Du bist ein präziser Parser. Antworte ausschließlich mit validem JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) return { ok: false, reason: 'Parser momentan nicht erreichbar' }

    const data = await res.json()
    const raw = JSON.parse(data.choices?.[0]?.message?.content || '{}')

    if (raw.ok !== true) {
      return { ok: false, reason: typeof raw.reason === 'string' ? raw.reason : 'Eingabe nicht erkannt' }
    }

    // LLM-Ausgabe strikt validieren — nichts Ungeprüftes zurückgeben
    const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 40) : ''
    const category = (ASSET_CATEGORIES as readonly string[]).includes(raw.category)
      ? (raw.category as AssetCategory)
      : 'sonstiges'
    const value = Number(raw.value)

    if (!name) return { ok: false, reason: 'Kein Name erkannt' }
    if (!Number.isFinite(value) || value <= 0 || value > MAX_VALUE) {
      return { ok: false, reason: 'Kein plausibler Betrag erkannt' }
    }

    return { ok: true, name, category, value: Math.round(value * 100) / 100 }
  } catch {
    return { ok: false, reason: 'Parser momentan nicht erreichbar' }
  }
}

// =====================================================
// Konto-Buchungen: "500 Miete vom Girokonto", "Gehalt 3500 aufs Girokonto"
// =====================================================

export interface ParsedAccountTxOk {
  ok: true
  /** Konto, wie der Nutzer es genannt hat ("Girokonto", "Geschäftskonto Sparkasse") */
  accountQuery: string
  /** Signiert: + Eingang, − Ausgang */
  amount: number
  /** Kurzbeschreibung ("Miete", "Gehalt", "Abhebung") */
  description: string
  /** ISO-Datum; relative Angaben werden aufgelöst */
  date: string
}

export type ParsedAccountTx = ParsedAccountTxOk | { ok: false; reason: string }

export async function parseAccountTransaction(text: string): Promise<ParsedAccountTx> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { ok: false, reason: 'Parser nicht konfiguriert' }

  const cleaned = text.trim().slice(0, 300)
  if (cleaned.length < 3) return { ok: false, reason: 'Eingabe zu kurz' }

  const today = new Date().toISOString().split('T')[0]

  const prompt = `Du wandelst eine deutsche Freitext-Eingabe in eine Konto-Buchung um. Heute ist ${today}.

EINGABE: "${cleaned}"

Antworte NUR mit einem JSON-Objekt:
- Erfolgsfall: {"ok": true, "accountQuery": "<Konto wie genannt>", "amount": <signierte Zahl in EUR>, "description": "<Kurzbeschreibung>", "date": "<yyyy-mm-dd>"}
- Wenn keine Konto-Buchung erkennbar ist: {"ok": false, "reason": "<kurze deutsche Begründung>"}

REGELN:
- "amount": NEGATIV bei Ausgaben/Abhebungen/Überweisungen weg vom Konto ("500 Miete vom Girokonto" → -500), POSITIV bei Eingängen ("Gehalt 3500 aufs Girokonto" → 3500)
- "accountQuery" ist der Konto-Bezug so wie genannt ("Girokonto", "Geschäftskonto", "Tagesgeld ING")
- "description" prägnant, max. 40 Zeichen ("Miete", "Gehalt", "Abhebung", "Einkauf Rewe")
- Beträge normalisieren: "1,5k" = 1500, "5.000" = 5000; Fremdwährung → ok:false
- "gestern"/"letzten Montag" relativ zu heute auflösen; ohne Angabe: heute
- Wertpapier-Käufe/-Verkäufe → ok:false mit Hinweis, dass die über den Transaktionen-Tab laufen
- Reine Saldo-Angaben ("Girokonto ist jetzt 2000") → ok:false mit Hinweis, dass Kontostände über die Vermögens-Seite aktualisiert werden`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Du bist ein präziser Parser. Antworte ausschließlich mit validem JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) return { ok: false, reason: 'Parser momentan nicht erreichbar' }

    const data = await res.json()
    const raw = JSON.parse(data.choices?.[0]?.message?.content || '{}')

    if (raw.ok !== true) {
      return { ok: false, reason: typeof raw.reason === 'string' ? raw.reason : 'Eingabe nicht erkannt' }
    }

    const accountQuery = typeof raw.accountQuery === 'string' ? raw.accountQuery.trim().slice(0, 60) : ''
    const description = typeof raw.description === 'string' ? raw.description.trim().slice(0, 40) : ''
    const amount = Number(raw.amount)

    if (!accountQuery) return { ok: false, reason: 'Kein Konto erkannt' }
    if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > MAX_VALUE) {
      return { ok: false, reason: 'Kein plausibler Betrag erkannt' }
    }

    const today2 = new Date().toISOString().split('T')[0]
    const date = typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : today2

    return {
      ok: true,
      accountQuery,
      amount: Math.round(amount * 100) / 100,
      description: description || (amount > 0 ? 'Eingang' : 'Ausgang'),
      date,
    }
  } catch {
    return { ok: false, reason: 'Parser momentan nicht erreichbar' }
  }
}

/**
 * Konto-Kandidaten für einen genannten Konto-Bezug finden — Matching gegen
 * die Konten des Nutzers (Token-basiert, wie die Instrument-Auflösung).
 */
export function resolveAccount(
  query: string,
  accounts: { id: string; name: string }[],
): { id: string; name: string }[] {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9äöüß ]/g, ' ').replace(/\s+/g, ' ').trim()
  const q = normalize(query)
  if (!q) return []
  const tokens = q.split(' ').filter(t => t.length > 1)

  const scored = accounts
    .map(account => {
      const name = normalize(account.name)
      let score = 0
      if (name === q) score = 100
      else if (name.startsWith(q) || q.startsWith(name)) score = 80
      else if (tokens.length > 0 && tokens.every(t => name.includes(t))) score = 60
      else if (tokens.some(t => name.includes(t))) score = 30
      return { account, score }
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || a.account.name.length - b.account.name.length)

  return scored.slice(0, 4).map(x => x.account)
}
