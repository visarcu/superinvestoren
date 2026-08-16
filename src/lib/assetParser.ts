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
