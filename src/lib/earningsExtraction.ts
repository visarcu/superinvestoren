/**
 * earningsExtraction.ts
 *
 * Pre-Processing für Earnings-Press-Release-Texte vor LLM-Calls.
 * Wird sowohl von /api/cron/detect-earnings als auch von
 * scripts/fetchEarningsPressReleases.ts genutzt.
 *
 * Hintergrund: SEC 8-K Press Releases sind 30-100k Zeichen lang. Die ersten
 * 5-15k Zeichen enthalten meist Forward-Looking-Statements-Boilerplate, die
 * eigentlichen Zahlen-Tabellen (EPS, Outlook, IFRS-Reconciliation) stehen
 * weiter hinten. Wir hatten zuvor bei 16k abgeschnitten und damit alle
 * relevanten Zahlen verloren (z.B. Spotify Q1 2026: EPS bei Pos. 32664).
 */

// Wieviel Text reicht maximal an gpt-4o-mini (Context: 128k Tokens, ~512k Zeichen).
// 100k Zeichen ≈ 25k Tokens — genug Headroom, deckt alle gesehenen Filings ab.
export const MAX_LLM_CHARS = 100_000

// Wieviel wir in der DB speichern. Spotify Q1 2026 = 50k.
// 200k deckt auch sehr lange Filings ab (z.B. Berkshire-style Reports).
export const MAX_STORE_CHARS = 200_000

/**
 * Entfernt typische Boilerplate-Sektionen, die keine inhaltliche Information
 * tragen. Konservativ gehalten: lieber stehen lassen als versehentlich
 * Zahlen-Tabellen entfernen.
 */
export function stripBoilerplate(text: string): string {
  let out = text

  // Forward-Looking-Statements: Header bis zum nächsten harten Marker.
  // Marker = "Investor Contact" / "Media Contact" / "About [Company]" /
  // "For More Information" / "###" (Press-Release-Ende-Marker).
  // {0,12000}? begrenzt damit wir nie ganze Filings auslöschen.
  const flsPattern = new RegExp(
    String.raw`(forward[- ]looking statements?|cautionary (note|statement)( regarding)?( forward[- ]looking statements?)?|safe[- ]harbor)` +
    String.raw`[\s\S]{0,12000}?` +
    String.raw`(?=\n\s*(?:investor contact|investor relations|media contact|press contact|for (?:more |further )?information|about\s+[A-Z][a-z]|###))`,
    'gi',
  )
  out = out.replace(flsPattern, '\n[forward-looking statements removed]\n')

  // "About [Company]" Marketing-Block bis nächster Contact-Header oder Filing-Ende
  const aboutPattern = /\n\s*about\s+(the company|[A-Z][\w&. ]{2,40})\s*\n[\s\S]{0,4000}?(?=\n\s*(?:investor contact|investor relations|media contact|press contact|###|$))/gi
  out = out.replace(aboutPattern, '\n[about-section removed]\n')

  return out
}

/**
 * Bereitet den Press-Release-Text für den LLM-Call vor:
 *   1. Boilerplate-Strip (Forward-Looking, About-Section)
 *   2. Truncation auf MAX_LLM_CHARS
 *
 * Returns auch Stats für Logging/Debugging.
 */
export function prepareForLLM(rawText: string): {
  text: string
  originalChars: number
  strippedChars: number
  finalChars: number
  truncated: boolean
} {
  const originalChars = rawText.length
  const stripped = stripBoilerplate(rawText)
  const strippedChars = stripped.length
  const truncated = strippedChars > MAX_LLM_CHARS
  const text = truncated ? stripped.slice(0, MAX_LLM_CHARS) : stripped
  return { text, originalChars, strippedChars, finalChars: text.length, truncated }
}
