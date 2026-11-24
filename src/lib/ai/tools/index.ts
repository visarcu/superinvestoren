// src/lib/ai/tools/index.ts
// Alle Werkzeuge der Finclue AI. Die Reihenfolge ist fest: Sie gehört zum
// zwischengespeicherten Anfang jeder Anfrage.

import type { AiTool } from './base'
import { kurs, kursbewegung, kursverlauf, marktHeute, wertpapierSuchen } from './market'
import { dividenden, finanzzahlen, kennzahlVerlauf, quartalszahlen, schaetzungen, unternehmensprofil, vergleich } from './fundamentals'
import { insiderPolitiker, superinvestor, superinvestorenAktie } from './investors'
import { etf, nachrichten, rechne, termine } from './misc'
import { depotBuchungen, depotDividenden, depotInvestiert, depotPositionen, depotRealisiert, depotUebersicht } from './depot'
import { depotDurchsicht, depotRendite, depotRisiko, depotSuperinvestoren, depotTermine, depotThema } from './depotAnalysis'

export const AI_TOOLS: AiTool[] = [
  wertpapierSuchen, kurs, kursverlauf, kursbewegung, marktHeute,
  kennzahlVerlauf, finanzzahlen, schaetzungen, quartalszahlen, dividenden, vergleich, unternehmensprofil,
  superinvestorenAktie, superinvestor, insiderPolitiker,
  nachrichten, etf, termine, rechne,
  depotUebersicht, depotPositionen, depotInvestiert, depotRendite, depotRisiko, depotDurchsicht, depotThema,
  depotDividenden, depotBuchungen, depotRealisiert, depotTermine, depotSuperinvestoren,
]

/** Werkzeuge, die eigene Daten des Nutzers lesen. Solche Antworten werden nie geteilt. */
export const isPersonalTool = (name: string): boolean => name.startsWith('depot_')

export const TOOL_BY_NAME = new Map(AI_TOOLS.map(t => [t.name, t]))
