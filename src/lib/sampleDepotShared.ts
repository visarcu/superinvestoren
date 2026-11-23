// Gemeinsame Konstanten für das Beispieldepot (Server und Client).

/** Kennzeichen im Feld portfolios.broker_name: daran erkennt der Workspace das Beispieldepot */
export const SAMPLE_DEPOT_BROKER_NAME = 'Finclue Beispiel'

/**
 * Anfang der Notiz jeder Beispieldepot-Buchung. Zusammen mit dem Kennzeichen
 * oben erkennt der Server das unveränderte Beispieldepot (dort sind die
 * Profi-Analysen auch ohne Premium offen).
 */
export const SAMPLE_DEPOT_NOTE_PREFIX = 'Beispieldepot:'

/**
 * US-Quellensteuer auf die Dividenden im Beispieldepot (DBA USA-Deutschland).
 * Mehr zieht ein deutscher Broker bei diesen Beträgen nicht ab, der Rest liegt
 * im Sparerpauschbetrag. Die Dividenden-Ansicht zeigt Beträge netto.
 */
export const SAMPLE_DEPOT_DIVIDEND_WITHHOLDING = 0.15

/** So viel Euro werden im Beispieldepot am Startdatum investiert */
export const SAMPLE_DEPOT_START_VALUE_EUR = 10_000

/** So viele Jahre vor heute liegt das Kaufdatum */
export const SAMPLE_DEPOT_YEARS_BACK = 3

type DepotOwnerFields = { broker_name?: string | null; user_id?: string | null }

export function isSampleDepot(depot: { broker_name?: string | null } | null | undefined): boolean {
  return depot?.broker_name === SAMPLE_DEPOT_BROKER_NAME
}

/**
 * Depots, die in Summen, Mails und Benachrichtigungen zählen. Das Beispieldepot
 * gehört nur dazu, solange der Nutzer kein eigenes Depot hat. Die Liste darf
 * Depots mehrerer Nutzer enthalten, dann muss user_id mitgeladen sein.
 */
export function countedDepots<T extends DepotOwnerFields>(depots: T[]): T[] {
  const ownersWithOwnDepot = new Set(depots.filter(d => !isSampleDepot(d)).map(d => d.user_id ?? ''))
  return depots.filter(d => !isSampleDepot(d) || !ownersWithOwnDepot.has(d.user_id ?? ''))
}

/** Anzeigename neben dem Schild "Beispiel": "Beispieldepot: Warren Buffett" → "Warren Buffett" */
export function depotLabel(depot: { name: string; broker_name?: string | null }): string {
  return isSampleDepot(depot) ? depot.name.replace(/^Beispieldepot:\s*/, '') || depot.name : depot.name
}
