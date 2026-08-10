// src/lib/dev/sourceHeader.ts
// Gemeinsame Typen für die Datenherkunft — wird von Server UND Client importiert.
// Bewusst frei von Node-Imports, damit nichts davon im Client-Bundle kaputtgeht.

/** Herkunfts-Info reist als Header auf der ganz normalen API-Antwort mit. */
export const SOURCE_HEADER = 'x-finclue-sources'

/**
 * "eigen"  = Daten, die uns gehören (SEC EDGAR, ESEF, eigene DB) — die wollen wir.
 * "fremd"  = zugekaufte Vendor-Daten (FMP, EODHD, Finnhub) — die wollen wir ablösen.
 */
export type SourceOwnership = 'eigen' | 'fremd' | 'unbekannt'

export interface SourceHit {
  /** Kurzname der Quelle, z.B. "sec", "fmp", "db" */
  source: string
  ownership: SourceOwnership
  /** Pfad ohne Query-String — dort stehen die API-Keys, die werden verworfen. */
  detail: string
  ms: number
  ok: boolean
}

/** Header-sicher kodieren (Pfade können Zeichen enthalten, die Header nicht mögen). */
export function encodeSources(hits: SourceHit[]): string {
  // Deckel gegen überlange Header — 40 Calls pro Request reichen zur Diagnose.
  return encodeURIComponent(JSON.stringify(hits.slice(0, 40)))
}

export function decodeSources(raw: string | null): SourceHit[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(decodeURIComponent(raw))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
