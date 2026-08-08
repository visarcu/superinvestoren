// src/lib/marketData/instrumentStore.ts
// Zugriff auf die Instrumenten-Stammdaten (Tabellen `instruments` / `instrument_aliases`).
//
// Nur serverseitig verwenden: schreibt über die Service-Role.

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { Instrument } from './types'
import { normalizeEodhdCurrency, searchEodhd } from './providers/eodhd'
import {
  hasPseudoSuffix,
  isCompatibleExchange,
  isIsin,
  mapType,
  pickPreferredListing,
  pseudoSuffixCandidates,
  yahooSymbolFor,
  yahooSymbolFromEodhd,
} from './symbols'

export { isIsin, mapType, pickPreferredListing, yahooSymbolFor, SUFFIX_TO_EXCHANGE } from './symbols'

interface InstrumentRow {
  isin: string
  name: string
  type: string
  currency: string | null
  exchange: string | null
  eodhd_symbol: string | null
  fmp_symbol: string | null
  yahoo_symbol: string | null
  verified: boolean
}

interface AliasRow {
  alias: string
  isin: string
  eodhd_symbol: string | null
  currency: string | null
  exchange: string | null
}

function toInstrument(row: InstrumentRow): Instrument {
  return {
    isin: row.isin,
    name: row.name,
    type: row.type,
    currency: row.currency,
    exchange: row.exchange,
    eodhdSymbol: row.eodhd_symbol,
    fmpSymbol: row.fmp_symbol,
    yahooSymbol: row.yahoo_symbol,
    verified: row.verified,
  }
}

const SELECT = 'isin, name, type, currency, exchange, eodhd_symbol, fmp_symbol, yahoo_symbol, verified'

/**
 * Auflösung angefragtes Symbol → Instrument.
 * Angefragt wird mit Broker-Tickern ('VHYL.DE') oder ISINs ('IE00B8GKDB10').
 */
export async function getInstrumentsForSymbols(symbols: string[]): Promise<Map<string, Instrument>> {
  const result = new Map<string, Instrument>()
  if (symbols.length === 0) return result

  const upper = [...new Set(symbols.map(s => s.toUpperCase()))]
  const isinLike = upper.filter(isIsin)
  const tickerLike = upper.filter(s => !isIsin(s))

  try {
    const [aliasRes, isinRes] = await Promise.all([
      tickerLike.length > 0
        ? supabaseAdmin
            .from('instrument_aliases')
            .select('alias, isin, eodhd_symbol, currency, exchange')
            .in('alias', tickerLike)
        : Promise.resolve({ data: [] as AliasRow[] }),
      isinLike.length > 0
        ? supabaseAdmin.from('instruments').select(SELECT).in('isin', isinLike)
        : Promise.resolve({ data: [] as InstrumentRow[] }),
    ])

    const aliasRows = (aliasRes.data || []) as unknown as AliasRow[]
    const directRows = (isinRes.data || []) as unknown as InstrumentRow[]

    for (const row of directRows) result.set(row.isin.toUpperCase(), toInstrument(row))

    if (aliasRows.length > 0) {
      const isins = [...new Set(aliasRows.map(a => a.isin))]
      const { data } = await supabaseAdmin.from('instruments').select(SELECT).in('isin', isins)
      const byIsin = new Map<string, Instrument>()
      for (const row of ((data || []) as unknown as InstrumentRow[])) {
        byIsin.set(row.isin.toUpperCase(), toInstrument(row))
      }
      for (const alias of aliasRows) {
        const instrument = byIsin.get(alias.isin.toUpperCase())
        if (!instrument) continue
        // Der Alias kennt seine eigene Notierung: 'AAPL' ist NASDAQ/USD,
        // 'AAPL.DE' ist Xetra/EUR. Ohne diesen Vorrang bekäme jede
        // Zweitnotierung den Kurs der Hauptbörse in der falschen Währung.
        result.set(alias.alias.toUpperCase(), {
          ...instrument,
          eodhdSymbol: alias.eodhd_symbol || instrument.eodhdSymbol,
          currency: alias.currency || instrument.currency,
          exchange: alias.exchange || instrument.exchange,
          // Yahoo braucht den echten Börsenticker der Notierung, nicht den
          // Broker-Alias: 'VHYL.DE' kennt Yahoo nicht, 'VGWD.DE' schon.
          // Ohne das bleibt bei einem EODHD-Ausfall gar kein Kurs übrig.
          yahooSymbol:
            yahooSymbolFromEodhd(alias.eodhd_symbol) ||
            instrument.yahooSymbol ||
            alias.alias.toUpperCase(),
        })
      }
    }

    // Broker-Pseudo-Suffixe auflösen (Freedom24 '.EU' = "irgendeine europäische
    // Börse"). Wichtig: nur derselbe Basis-Code an einer echten Börse — niemals
    // ein anderer Code. CSKR.EU darf nicht bei CEBJ.DE landen.
    const pseudo = tickerLike.filter(s => !result.has(s) && hasPseudoSuffix(s))
    if (pseudo.length > 0) {
      const candidatesBySymbol = new Map<string, string[]>()
      for (const symbol of pseudo) {
        candidatesBySymbol.set(symbol, pseudoSuffixCandidates(symbol))
      }
      const allCandidates = [...new Set([...candidatesBySymbol.values()].flat())]

      const { data } = await supabaseAdmin
        .from('instrument_aliases')
        .select('alias, isin, eodhd_symbol, currency, exchange')
        .in('alias', allCandidates)
      const candidateRows = new Map<string, AliasRow>()
      for (const row of ((data || []) as unknown as AliasRow[])) {
        candidateRows.set(row.alias.toUpperCase(), row)
      }

      const isins = [...new Set([...candidateRows.values()].map(r => r.isin))]
      const byIsin = new Map<string, Instrument>()
      if (isins.length > 0) {
        const { data: instrumentData } = await supabaseAdmin.from('instruments').select(SELECT).in('isin', isins)
        for (const row of ((instrumentData || []) as unknown as InstrumentRow[])) {
          byIsin.set(row.isin.toUpperCase(), toInstrument(row))
        }
      }

      for (const [symbol, candidates] of candidatesBySymbol) {
        // Reihenfolge der Kandidaten = Präferenz der Börse.
        const hit = candidates.map(c => candidateRows.get(c)).find(Boolean)
        if (!hit) continue
        const instrument = byIsin.get(hit.isin.toUpperCase())
        if (!instrument) continue
        result.set(symbol, {
          ...instrument,
          eodhdSymbol: hit.eodhd_symbol || instrument.eodhdSymbol,
          currency: hit.currency || instrument.currency,
          exchange: hit.exchange || instrument.exchange,
          yahooSymbol:
            yahooSymbolFromEodhd(hit.eodhd_symbol) ||
            hit.alias.toUpperCase(),
        })
      }
    }
  } catch (err) {
    // Stammdaten sind eine Optimierung, kein Muss: ohne sie greift die
    // Symbol-Heuristik im Quote-Service.
    console.error('instrumentStore: Lookup fehlgeschlagen', err)
  }

  return result
}

export interface UpsertInstrumentInput {
  isin: string
  name: string
  type?: string
  currency?: string | null
  exchange?: string | null
  eodhdSymbol?: string | null
  fmpSymbol?: string | null
  yahooSymbol?: string | null
  source?: string
  verified?: boolean
  aliases?: string[]
}

export async function upsertInstruments(inputs: UpsertInstrumentInput[]): Promise<number> {
  if (inputs.length === 0) return 0

  const rows = inputs.map(i => ({
    isin: i.isin.toUpperCase(),
    name: i.name,
    type: i.type || 'unknown',
    currency: i.currency ?? null,
    exchange: i.exchange ?? null,
    eodhd_symbol: i.eodhdSymbol ?? null,
    fmp_symbol: i.fmpSymbol ?? null,
    yahoo_symbol: i.yahooSymbol ?? null,
    source: i.source || 'manual',
    verified: i.verified ?? false,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabaseAdmin.from('instruments').upsert(rows, { onConflict: 'isin' })
  if (error) throw error

  // Der Alias erbt die Notierung, unter der er gefunden wurde — sonst würde er
  // später zur Hauptnotierung der ISIN aufgelöst und ggf. in fremder Währung.
  const aliasRows = inputs.flatMap(i =>
    (i.aliases || []).map(alias => ({
      alias: alias.toUpperCase(),
      isin: i.isin.toUpperCase(),
      source: i.source || 'manual',
      eodhd_symbol: i.eodhdSymbol ?? null,
      currency: i.currency ?? null,
      exchange: i.exchange ?? null,
    }))
  )
  if (aliasRows.length > 0) {
    const { error: aliasError } = await supabaseAdmin
      .from('instrument_aliases')
      .upsert(aliasRows, { onConflict: 'alias' })
    if (aliasError) throw aliasError
  }

  return rows.length
}

/**
 * Unbekanntes Symbol über die EODHD-Suche auflösen und dauerhaft ablegen.
 * Dadurch lernt der Stammsatz im Betrieb weiter — ein Symbol muss nur einmal
 * unbekannt sein.
 */
export async function resolveSymbolViaSearch(symbol: string): Promise<Instrument | null> {
  const query = isIsin(symbol) ? symbol : symbol.replace(/\.[A-Z]+$/i, '')
  const hits = await searchEodhd(query)
  if (hits.length === 0) return null

  // Bei Ticker-Suche kann alles Mögliche zurückkommen; auf plausible Treffer filtern:
  // gleicher Code UND ein Handelsplatz, der zum angefragten Suffix passt.
  // Ohne die zweite Bedingung landete 'DRH.DE' bei DiamondRock Hospitality (NYSE).
  const wanted = symbol.toUpperCase()
  const base = query.toUpperCase()
  const candidates = isIsin(symbol)
    ? hits
    : hits.filter(h => h.Code?.toUpperCase() === base && isCompatibleExchange(wanted, h.Exchange))
  if (candidates.length === 0) return null

  const preferred = pickPreferredListing(candidates, wanted)
  if (!preferred) return null

  const isin = (preferred.ISIN || (isIsin(symbol) ? symbol : '')).toUpperCase()
  if (!isIsin(isin)) return null

  const instrument: UpsertInstrumentInput = {
    isin,
    name: preferred.Name || symbol,
    type: mapType(preferred.Type),
    currency: normalizeEodhdCurrency(preferred.Currency, preferred.Exchange),
    exchange: preferred.Exchange,
    eodhdSymbol: `${preferred.Code}.${preferred.Exchange}`,
    yahooSymbol: yahooSymbolFor(preferred.Code, preferred.Exchange),
    source: 'eodhd_search',
    verified: false,
    aliases: [wanted],
  }

  try {
    await upsertInstruments([instrument])
  } catch (err) {
    console.error('instrumentStore: Upsert nach Suche fehlgeschlagen', err)
  }

  return {
    isin: instrument.isin,
    name: instrument.name,
    type: instrument.type || 'unknown',
    currency: instrument.currency ?? null,
    exchange: instrument.exchange ?? null,
    eodhdSymbol: instrument.eodhdSymbol ?? null,
    fmpSymbol: null,
    yahooSymbol: instrument.yahooSymbol ?? null,
    verified: false,
  }
}
