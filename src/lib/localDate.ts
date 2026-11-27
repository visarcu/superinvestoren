// src/lib/localDate.ts
// Datumsangaben für Buchungen in der Zeitzone der Nutzer.
//
// new Date().toISOString().split('T')[0] ist das UTC-Datum: Zwischen 0 und 1 Uhr
// (Sommer 2 Uhr) stand so noch der Vortag im Buchungsformular, und eine
// Cash-Korrektur um 00:30 Uhr wurde auf gestern datiert.

/** Heutiges Datum in Berlin als YYYY-MM-DD */
export function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date())
}
