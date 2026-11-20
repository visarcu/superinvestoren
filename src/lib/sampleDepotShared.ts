// Gemeinsame Konstanten für das Beispieldepot (Server und Client).

/** Kennzeichen im Feld portfolios.broker_name: daran erkennt der Workspace das Beispieldepot */
export const SAMPLE_DEPOT_BROKER_NAME = 'Finclue Beispiel'

/**
 * Anfang der Notiz jeder Beispieldepot-Buchung. Zusammen mit dem Kennzeichen
 * oben erkennt der Server das unveränderte Beispieldepot (dort sind die
 * Profi-Analysen auch ohne Premium offen).
 */
export const SAMPLE_DEPOT_NOTE_PREFIX = 'Beispieldepot:'

/** So viel Euro werden im Beispieldepot am Startdatum investiert */
export const SAMPLE_DEPOT_START_VALUE_EUR = 10_000

/** So viele Jahre vor heute liegt das Kaufdatum */
export const SAMPLE_DEPOT_YEARS_BACK = 3
