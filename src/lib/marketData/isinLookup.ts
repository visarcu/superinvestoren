// src/lib/marketData/isinLookup.ts
// ISIN → Ticker über die Instrumenten-Stammdaten.
//
// Bisher lief das über etfMaster/xetraETFs und OpenFIGI. Beide liefern zu einer
// ISIN bevorzugt die deutsche Notierung — unabhängig davon, wo der Nutzer das
// Papier tatsächlich hält:
//
//   IE00B5W4TY14 (Freedom24: CSKR.EU, London/USD)  →  CEBJ.DE   anderes Papier
//   AU0000185993 (Freedom24: IREN.US, NASDAQ)      →  F8P.DE    gibt es nicht
//
// Der Broker liefert die Antwort mit: Sein Ticker trägt sowohl den Basis-Code
// als auch die Börse. Genau danach wird hier ausgewählt.

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isCompatibleExchange, pseudoSuffixCandidates, hasPseudoSuffix } from './symbols'

export interface ResolvedInstrument {
  isin: string
  symbol: string
  name: string
  exchange: string | null
  currency: string | null
}

interface AliasRow {
  alias: string
  isin: string
  exchange: string | null
  currency: string | null
}

interface InstrumentRow {
  isin: string
  name: string
  exchange: string | null
  currency: string | null
  yahoo_symbol: string | null
}

/** Basis-Code ohne Börsensuffix: 'IREN.US' → 'IREN', 'CSKR.EU' → 'CSKR'. */
function baseCode(ticker: string): string {
  const upper = ticker.toUpperCase().trim()
  const idx = upper.lastIndexOf('.')
  return idx > 0 ? upper.slice(0, idx) : upper
}

/**
 * Passt die Notierung des Alias zum Broker-Ticker?
 * '.EU' ist eine Sammelkategorie und wird über die Kandidatenliste geprüft.
 */
function venueMatches(brokerTicker: string, alias: AliasRow): boolean {
  if (hasPseudoSuffix(brokerTicker)) {
    const candidates = pseudoSuffixCandidates(brokerTicker).map(c => c.toUpperCase())
    return candidates.includes(alias.alias.toUpperCase())
  }
  return isCompatibleExchange(brokerTicker, alias.exchange)
}

/**
 * Löst ISINs auf und berücksichtigt dabei den Ticker des Brokers.
 *
 * Auswahlreihenfolge:
 *   1. Alias mit demselben Basis-Code UND passender Börse   (IREN.US → IREN)
 *   2. Alias mit demselben Basis-Code                        (CSKR.EU → CSKR.L)
 *   3. Alias mit passender Börse                             (nur ISIN bekannt)
 *   4. Hauptnotierung des Instruments
 *
 * Schritt 1 und 2 gehen der Börsenpräferenz bewusst vor: Ein Wechsel des
 * Basis-Codes hat in der Vergangenheit zu einem anderen Papier geführt.
 */
export async function resolveIsinsViaMaster(
  items: { isin: string; brokerTicker?: string }[]
): Promise<Map<string, ResolvedInstrument>> {
  const result = new Map<string, ResolvedInstrument>()
  const isins = [...new Set(items.map(i => i.isin?.toUpperCase()).filter(Boolean))]
  if (isins.length === 0) return result

  try {
    const instruments = new Map<string, InstrumentRow>()
    const aliasesByIsin = new Map<string, AliasRow[]>()

    for (let i = 0; i < isins.length; i += 200) {
      const chunk = isins.slice(i, i + 200)
      const [instrumentRes, aliasRes] = await Promise.all([
        supabaseAdmin.from('instruments').select('isin, name, exchange, currency, yahoo_symbol').in('isin', chunk),
        supabaseAdmin.from('instrument_aliases').select('alias, isin, exchange, currency').in('isin', chunk),
      ])

      for (const row of ((instrumentRes.data || []) as unknown as InstrumentRow[])) {
        instruments.set(row.isin.toUpperCase(), row)
      }
      for (const row of ((aliasRes.data || []) as unknown as AliasRow[])) {
        const key = row.isin.toUpperCase()
        const list = aliasesByIsin.get(key) || []
        list.push(row)
        aliasesByIsin.set(key, list)
      }
    }

    for (const item of items) {
      const isin = item.isin?.toUpperCase()
      if (!isin || result.has(isin)) continue

      const instrument = instruments.get(isin)
      const aliases = aliasesByIsin.get(isin) || []
      if (!instrument && aliases.length === 0) continue

      const broker = item.brokerTicker?.toUpperCase().trim()
      let chosen: AliasRow | undefined

      if (broker) {
        const base = baseCode(broker)
        const sameCode = aliases.filter(a => baseCode(a.alias) === base)

        // Bei Sammelsuffixen ('.EU') entscheidet die Reihenfolge der Kandidaten,
        // nicht die zufällige Reihenfolge aus der Datenbank: Sonst gewinnt etwa
        // CSKR.SW gegen CSKR.L — und die Schweizer Notierung führt keine Kurse.
        if (hasPseudoSuffix(broker)) {
          for (const candidate of pseudoSuffixCandidates(broker)) {
            const hit = sameCode.find(a => a.alias.toUpperCase() === candidate)
            if (hit) {
              chosen = hit
              break
            }
          }
        }

        chosen =
          chosen ||
          sameCode.find(a => venueMatches(broker, a)) ||
          sameCode[0] ||
          aliases.find(a => venueMatches(broker, a))
      }

      // Bei Sammelsuffixen den Broker-Ticker behalten: Unser Kurs-Layer löst
      // '.EU' selbst auf die richtige Notierung auf, und der Nutzer sieht den
      // Ticker, den sein Broker ihm anzeigt.
      // Der konkrete Alias wäre hier sogar irreführend: CSKR.L notiert in USD,
      // unsere '.L'-Konvention erwartet aber Pence — der Wert stimmt zwar nach
      // Umrechnung, die angezeigte Zahl sähe jedoch aus wie 33.860 statt 456.
      const useBrokerTicker = broker && chosen && hasPseudoSuffix(broker)
      const symbol = useBrokerTicker
        ? broker
        : chosen?.alias || instrument?.yahoo_symbol || aliases[0]?.alias
      if (!symbol) continue

      result.set(isin, {
        isin,
        symbol: symbol.toUpperCase(),
        name: instrument?.name || symbol,
        exchange: chosen?.exchange || instrument?.exchange || null,
        currency: chosen?.currency || instrument?.currency || null,
      })
    }
  } catch (err) {
    // Der Stammsatz ist die beste, aber nicht die einzige Quelle — bei einem
    // Ausfall greifen im Aufrufer weiterhin CUSIP, OpenFIGI und FMP.
    console.error('isinLookup: Stammsatz-Abfrage fehlgeschlagen', err)
  }

  return result
}
