// src/lib/ai/depot/classify.ts
// Einordnung eines Wertpapiers als Aktie, ETF, Fonds, Rohstoff oder Krypto.
//
// Reihenfolge: Stammdaten (instruments.type) und kuratierte ETF-Listen vor dem
// Namen. Der Name entscheidet nur, wo beides fehlt (Importe ohne Stammdaten).

import { findLookthroughEntry } from '@/data/etfLookthrough'
import { getETFBySymbol } from '@/lib/etfUtils'
import { fmpList } from '../data/fmp'

export type Art = 'Aktie' | 'ETF' | 'Fonds' | 'Rohstoff' | 'Krypto'
export type EtfKlasse = 'Aktien' | 'Anleihen' | 'Geldmarkt' | 'gehebelt'

export interface SecurityClass {
  art: Art
  /** nur bei ETFs und Fonds */
  klasse: EtfKlasse | null
  /** nur aus dem Namen geschlossen */
  unsicher: boolean
}

const CRYPTO_PAIR = /^(?:BTC|ETH|SOL|ADA|XRP|DOGE|DOT|LTC|BNB|AVAX|LINK|MATIC|POL|SHIB|UNI|ATOM|XLM|TRX|BCH|USDT|USDC|NEAR|APT|ARB|SUI)[-/]?(?:USD|EUR|USDT)$/
const CRYPTO_NAME = /\b(?:bitcoin|ethereum|crypto|krypto|solana|cardano|ripple|polkadot|tether|dogecoin|litecoin)\b/i
const COMMODITY_NAME = /\bETC\b|\beuwax gold\b|\bxetra[- ]gold\b|\bphysical (?:gold|silver|platinum|palladium|metals)\b|\b(?:gold|silver) (?:bullion|trust|shares)\b|\bWT (?:copper|gold|silver)\b/i
const BOND_NAME = /\btreasury\b|\bbonds?\b|\banleihen?\b|\bgov(?:t|ernment)?(?:vbd| bd| bond)|\bcorp(?:orate)? bond|\bTIPS\b|\bhigh yield corp|\bEURGVBD\b|fixed income/i
const MONEY_NAME = /\bovernight\b|\bmoney market\b|\bcash swap\b|€STR|\bgeldmarkt\b|0-3 month treasury|\bT-bill/i
const LEVERAGE_NAME = /\bleverag(?:e|ed)\b|\b[23]x\b|\blev eur\b/i
const ETF_NAME = /\bUCITS\b|\bETFs?\b|\biShares\b|^ISH(?:ARES)? |\bXtrackers\b|\bXTRCKRS\b|^X (?:EUR|DAX|STOXX|MSCI)|\bLyxor\b|^(?:AMUNDI|AM) (?:MSCI|CR|PRIM|DJ|STOXX|MS)|^VANG(?:UARD)? (?:ESG|FTSE|S&P)|\bSPDR\b|^WISDOMTREE /i
const FUND_NAME = /\b(?:FD|FND|FUND|FUNDS|FONDS|SICAV|GIF|AMI|MSIF)\b|F(?:U)?NDS(?:-|\b)|^(?:BGF|MSIF|PICTET|FVS|DWS|PHAIDROS|ACATIS)\b|^JPM .*\bEQ\b|\bAKTI?E?N FR STIFTUNG\b/i

function etfClass(name: string, category = ''): EtfKlasse {
  const text = `${name} ${category}`
  if (MONEY_NAME.test(text)) return 'Geldmarkt'
  if (LEVERAGE_NAME.test(text)) return 'gehebelt'
  if (BOND_NAME.test(text)) return 'Anleihen'
  return 'Aktien'
}

export interface SecurityInput {
  symbol: string
  name: string
  isin?: string | null
  /** instruments.type */
  type?: string | null
  instrumentName?: string | null
}

export function classifySecurity(input: SecurityInput): SecurityClass | null {
  const symbol = input.symbol.toUpperCase()
  const names = [input.name, input.instrumentName].filter((n): n is string => !!n)
  const text = names.join(' | ')
  const is = (re: RegExp) => names.some(n => re.test(n))

  if (CRYPTO_PAIR.test(symbol)) return { art: 'Krypto', klasse: null, unsicher: false }
  // "Bitcoin Group SE" ist eine Aktie, "21Shares Bitcoin ETP" nicht
  if (input.type === 'stock') return { art: 'Aktie', klasse: null, unsicher: false }
  if (is(CRYPTO_NAME) && (input.type === 'etf' || is(/\b(?:ETP|tracker|trust|physical)\b/i) || input.name.trim().split(/\s+/).length === 1)) {
    return { art: 'Krypto', klasse: null, unsicher: false }
  }

  const entry = findLookthroughEntry(input.isin ?? null, symbol)
  if (entry) {
    if (entry.assetClass === 'commodity') return { art: 'Rohstoff', klasse: null, unsicher: false }
    return {
      art: 'ETF',
      klasse: entry.assetClass === 'bond' ? 'Anleihen' : entry.assetClass === 'money-market' ? 'Geldmarkt' : entry.assetClass === 'leveraged-equity' ? 'gehebelt' : 'Aktien',
      unsicher: false,
    }
  }
  if (is(COMMODITY_NAME) && !is(/\b(?:miners|producers)\b/i)) return { art: 'Rohstoff', klasse: null, unsicher: input.type !== 'etf' }
  if (input.type === 'etf') return { art: 'ETF', klasse: etfClass(text), unsicher: false }

  const known = getETFBySymbol(symbol)
  if (known) {
    if (known.assetClass === 'Commodity') return { art: 'Rohstoff', klasse: null, unsicher: false }
    return { art: 'ETF', klasse: known.assetClass === 'Fixed Income' ? 'Anleihen' : etfClass(text, known.category), unsicher: false }
  }
  if (is(ETF_NAME)) return { art: 'ETF', klasse: etfClass(text), unsicher: true }
  if (is(FUND_NAME)) return { art: 'Fonds', klasse: etfClass(text), unsicher: true }
  return null
}

/** Wie classifySecurity, fragt für Unbekanntes einmal das Firmenprofil (7 Tage zwischengespeichert). */
export async function classifyAll(inputs: SecurityInput[]): Promise<Map<string, SecurityClass>> {
  const result = new Map<string, SecurityClass>()
  const open: SecurityInput[] = []
  for (const input of inputs) {
    const hit = classifySecurity(input)
    if (hit) result.set(input.symbol.toUpperCase(), hit)
    else open.push(input)
  }
  for (let i = 0; i < open.length; i += 6) {
    await Promise.all(
      open.slice(i, i + 6).map(async input => {
        const symbol = input.symbol.toUpperCase()
        const [profile] = await fmpList(`/api/v3/profile/${encodeURIComponent(symbol)}`, {}, { revalidate: 604_800 })
        const art: Art = profile?.isEtf ? 'ETF' : profile?.isFund ? 'Fonds' : 'Aktie'
        result.set(symbol, { art, klasse: art === 'Aktie' ? null : etfClass(input.name), unsicher: !profile })
      })
    )
  }
  return result
}
