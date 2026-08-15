// src/data/etfLookthrough.ts
//
// Kuratiertes Look-Through-Mapping: UCITS-ETF → US-Zwillingsfonds (Proxy).
//
// FMPs Holdings-Daten basieren auf SEC-N-PORT-Filings und decken nur
// US-domizilierte Fonds ab. UCITS-ETFs (IE/LU/FR/DE-ISINs) werden deshalb
// über einen US-ETF aufgelöst, der denselben (oder einen sehr ähnlichen)
// Index trackt. `exact: true` heißt: gleicher Index, Holdings praktisch
// identisch. `exact: false` heißt: bewusste Näherung — im UI kennzeichnen.
//
// Matching erfolgt IMMER zuerst über ISIN. Ticker-Aliase sind nur Fallback
// für Positionen ohne ISIN (z.B. ältere Importe).
//
// === PFLEGE ===
// 1. Index des UCITS-ETF auf justetf.com nachschlagen
// 2. US-ETF mit gleichem Index suchen (etfdb.com), sonst nächstliegender
// 3. FMP-Abdeckung prüfen: /api/v3/etf-holder/{PROXY} muss Holdings liefern
// 4. exact ehrlich setzen — Näherungen werden dem Nutzer angezeigt

export interface LookthroughProxy {
  /** US-Ticker des Proxy-ETFs (muss von FMP etf-holder abgedeckt sein) */
  symbol: string
  /** Anteil 0–1; Summe pro Eintrag = 1 (Composite-Proxies für Indizes ohne 1:1-Zwilling) */
  weight: number
}

export type LookthroughAssetClass =
  | 'equity'
  | 'bond'
  | 'commodity'
  | 'money-market'
  | 'leveraged-equity'

export interface EtfLookthroughEntry {
  isin: string
  /** Ticker-Aliase (uppercase), nur Fallback wenn keine ISIN vorliegt */
  tickers: string[]
  name: string
  /** null → kein Aktien-Look-Through möglich (kein Zwilling / kein Aktienfonds) */
  proxies: LookthroughProxy[] | null
  /** true = Proxy trackt denselben Index */
  exact: boolean
  assetClass: LookthroughAssetClass
  /** Nutzer-sichtbarer Hinweis bei Näherungen */
  note?: string
}

export const etfLookthrough: EtfLookthroughEntry[] = [

  // ============================================================================
  // Global All-World / All Cap → VT (Vanguard Total World, FTSE Global All Cap)
  // ============================================================================
  {
    isin: 'IE00BK5BQT80',
    tickers: ['VWCE.DE', 'VWCE.L'],
    name: 'Vanguard FTSE All-World UCITS ETF (Acc)',
    proxies: [{ symbol: 'VT', weight: 1 }],
    exact: false,
    assetClass: 'equity',
    note: 'Proxy VT trackt FTSE Global All Cap (enthält zusätzlich Small Caps, ~2% Abweichung)',
  },
  {
    isin: 'IE00B3RBWM25',
    tickers: ['VGWL.DE'],
    name: 'Vanguard FTSE All-World UCITS ETF (Dist)',
    proxies: [{ symbol: 'VT', weight: 1 }],
    exact: false,
    assetClass: 'equity',
    note: 'Proxy VT trackt FTSE Global All Cap (enthält zusätzlich Small Caps, ~2% Abweichung)',
  },
  {
    isin: 'IE000716YHJ7',
    tickers: ['FWIA.DE'],
    name: 'Invesco FTSE All-World UCITS ETF (Acc)',
    proxies: [{ symbol: 'VT', weight: 1 }],
    exact: false,
    assetClass: 'equity',
    note: 'Proxy VT trackt FTSE Global All Cap (enthält zusätzlich Small Caps, ~2% Abweichung)',
  },
  {
    isin: 'IE0009HF1MK9',
    tickers: ['WEBG.DE'],
    name: 'Amundi Prime All Country World UCITS ETF (Acc)',
    proxies: [{ symbol: 'VT', weight: 1 }],
    exact: false,
    assetClass: 'equity',
    note: 'Solactive-Index, über FTSE-Pendant VT angenähert',
  },
  {
    isin: 'IE00BNG8L278',
    tickers: ['V3AA.DE'],
    name: 'Vanguard ESG Global All Cap UCITS ETF',
    proxies: [{ symbol: 'VT', weight: 1 }],
    exact: false,
    assetClass: 'equity',
    note: 'ESG-Ausschlüsse im Proxy nicht abgebildet',
  },
  {
    isin: 'IE00B3YLTY66',
    tickers: ['SPYI.DE'],
    name: 'SPDR MSCI ACWI IMI UCITS ETF',
    proxies: [{ symbol: 'VT', weight: 1 }],
    exact: false,
    assetClass: 'equity',
    note: 'MSCI ACWI IMI über FTSE-Pendant VT angenähert',
  },

  // ============================================================================
  // MSCI World → URTH (iShares MSCI World ETF, gleicher Index)
  // ============================================================================
  {
    isin: 'IE00B4L5Y983',
    tickers: ['EUNL.DE', 'IWDA.L', 'IWDA.AS'],
    name: 'iShares Core MSCI World UCITS ETF',
    proxies: [{ symbol: 'URTH', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    isin: 'IE00BJ0KDQ92',
    tickers: ['XDWL.DE', 'XDWD.L'],
    name: 'Xtrackers MSCI World UCITS ETF (Acc)',
    proxies: [{ symbol: 'URTH', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    isin: 'IE00BFY0GT14',
    tickers: ['SPPW.DE'],
    name: 'SPDR MSCI World UCITS ETF',
    proxies: [{ symbol: 'URTH', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    isin: 'IE00B4X9L533',
    tickers: ['HMWO.DE', 'HMWO.L'],
    name: 'HSBC MSCI World UCITS ETF',
    proxies: [{ symbol: 'URTH', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    isin: 'IE00B60SX394',
    tickers: ['SC0J.DE'],
    name: 'Invesco MSCI World UCITS ETF',
    proxies: [{ symbol: 'URTH', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    isin: 'FR0010315770',
    tickers: ['LYXE.DE'],
    name: 'Lyxor MSCI World UCITS ETF',
    proxies: [{ symbol: 'URTH', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    isin: 'LU1681043599',
    tickers: ['AMEW.DE'],
    name: 'Amundi MSCI World UCITS ETF',
    proxies: [{ symbol: 'URTH', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    isin: 'IE00BZ02LR44',
    tickers: ['XZW0.DE'],
    name: 'Xtrackers MSCI World ESG UCITS ETF',
    proxies: [{ symbol: 'URTH', weight: 1 }],
    exact: false,
    assetClass: 'equity',
    note: 'ESG-Ausschlüsse im Proxy nicht abgebildet',
  },
  {
    isin: 'IE00BKX55T58',
    tickers: ['VDEV.DE'],
    name: 'Vanguard FTSE Developed World UCITS ETF',
    proxies: [{ symbol: 'URTH', weight: 1 }],
    exact: false,
    assetClass: 'equity',
    note: 'FTSE Developed über MSCI-World-Pendant angenähert (Abweichung u.a. Südkorea)',
  },

  // ============================================================================
  // S&P 500 → VOO
  // ============================================================================
  {
    isin: 'IE00B3XXRP09',
    tickers: ['VUSA.DE', 'VUSA.AS'],
    name: 'Vanguard S&P 500 UCITS ETF (Dist)',
    proxies: [{ symbol: 'VOO', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    isin: 'IE00BFMXXD54',
    tickers: ['VUAA.DE', 'VUAA.L'],
    name: 'Vanguard S&P 500 UCITS ETF (Acc)',
    proxies: [{ symbol: 'VOO', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    // ISIN gehört zu iShares Core S&P 500 (SXR8) — in etfMaster historisch
    // unter dem Ticker IQQH.DE geführt, der real der Clean-Energy-ETF ist.
    // Deshalb hier bewusst NUR SXR8-Aliase, kein IQQH.
    isin: 'IE00B5BMR087',
    tickers: ['SXR8.DE', 'CSPX.L'],
    name: 'iShares Core S&P 500 UCITS ETF (Acc)',
    proxies: [{ symbol: 'VOO', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    isin: 'IE00B1XNHC34',
    tickers: ['IQQH.DE'],
    name: 'iShares Global Clean Energy UCITS ETF',
    proxies: [{ symbol: 'ICLN', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },

  // ============================================================================
  // Nasdaq 100
  // ============================================================================
  {
    isin: 'IE0032077012',
    tickers: ['EQQQ.DE', 'EQQQ.L'],
    name: 'Invesco EQQQ NASDAQ-100 UCITS ETF',
    proxies: [{ symbol: 'QQQ', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    isin: 'IE00BM8R0J59',
    tickers: ['QYLE.DE'],
    name: 'Global X Nasdaq 100 Covered Call UCITS ETF',
    proxies: [{ symbol: 'QYLD', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    isin: 'FR0010342592',
    tickers: ['L8I7.DE', 'LQQ.PA'],
    name: 'Amundi Nasdaq-100 Daily (2x) Leveraged UCITS ETF',
    proxies: [{ symbol: 'QQQ', weight: 1 }],
    exact: false,
    assetClass: 'leveraged-equity',
    note: '2× gehebelt — tatsächliches Markt-Exposure entspricht ca. dem doppelten Positionswert, hier 1× gerechnet',
  },

  // ============================================================================
  // Emerging Markets
  // ============================================================================
  {
    isin: 'IE00BTJRMP35',
    tickers: ['XMME.DE'],
    name: 'Xtrackers MSCI Emerging Markets UCITS ETF',
    proxies: [{ symbol: 'EEM', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    isin: 'IE00B4L5YC18',
    tickers: ['EUNM.DE', 'IEMA.DE'],
    name: 'iShares MSCI EM UCITS ETF (Dist)',
    proxies: [{ symbol: 'EEM', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    isin: 'IE00BKM4GZ66',
    tickers: ['IS3N.DE', 'EIMI.L'],
    name: 'iShares Core MSCI EM IMI UCITS ETF (Acc)',
    proxies: [{ symbol: 'IEMG', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    isin: 'IE00BD45KH83',
    tickers: ['IBC3.DE'],
    name: 'iShares Core MSCI EM IMI UCITS ETF (Dist)',
    proxies: [{ symbol: 'IEMG', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    isin: 'IE00BQT3WG13',
    tickers: ['36BZ.DE'],
    name: 'iShares MSCI China A UCITS ETF',
    proxies: [{ symbol: 'CNYA', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    isin: 'IE00BZCQB185',
    tickers: ['QDV5.DE', 'NDIA.L'],
    name: 'iShares MSCI India UCITS ETF',
    proxies: [{ symbol: 'INDA', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },

  // ============================================================================
  // Dividenden
  // ============================================================================
  {
    isin: 'IE00B8GKDB10',
    tickers: ['VHYL.DE', 'VHYL.AS'],
    name: 'Vanguard FTSE All-World High Dividend Yield UCITS ETF',
    proxies: [
      { symbol: 'VYM', weight: 0.45 },
      { symbol: 'VYMI', weight: 0.55 },
    ],
    exact: false,
    assetClass: 'equity',
    note: 'Kein US-Zwilling — über VYM (USA) + VYMI (International) zusammengesetzt',
  },
  {
    isin: 'IE00BZ0PKV06',
    tickers: ['XZDW.DE', 'XDWD.DE'],
    name: 'Xtrackers MSCI World High Dividend Yield UCITS ETF',
    proxies: [
      { symbol: 'VYM', weight: 0.45 },
      { symbol: 'VYMI', weight: 0.55 },
    ],
    exact: false,
    assetClass: 'equity',
    note: 'Kein US-Zwilling — über VYM (USA) + VYMI (International) zusammengesetzt',
  },
  {
    isin: 'NL0011683594',
    tickers: ['VDIV.DE', 'TDIV.AS'],
    name: 'VanEck Developed Markets Dividend Leaders UCITS ETF',
    proxies: null,
    exact: false,
    assetClass: 'equity',
    note: 'Kein passender US-Zwilling verfügbar',
  },
  {
    isin: 'DE0002635299',
    tickers: ['TDIV.DE', 'EXSG.DE'],
    name: 'iShares EURO STOXX Select Dividend 30 UCITS ETF',
    proxies: null,
    exact: false,
    assetClass: 'equity',
    note: 'Kein passender US-Zwilling verfügbar',
  },

  // ============================================================================
  // Europa
  // ============================================================================
  {
    isin: 'DE0002635307',
    tickers: ['EXSA.DE'],
    name: 'iShares STOXX Europe 600 UCITS ETF',
    proxies: [{ symbol: 'IEUR', weight: 1 }],
    exact: false,
    assetClass: 'equity',
    note: 'STOXX Europe 600 über MSCI-Europe-Pendant IEUR angenähert',
  },
  {
    isin: 'LU0908500753',
    tickers: ['LYX0YD.DE', 'MEUD.PA'],
    name: 'Amundi Core STOXX Europe 600 UCITS ETF',
    proxies: [{ symbol: 'IEUR', weight: 1 }],
    exact: false,
    assetClass: 'equity',
    note: 'STOXX Europe 600 über MSCI-Europe-Pendant IEUR angenähert',
  },
  {
    isin: 'IE00B1YZSC51',
    tickers: ['IQQY.DE'],
    name: 'iShares Core MSCI Europe UCITS ETF',
    proxies: [{ symbol: 'IEUR', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    isin: 'IE00BFNM3G45',
    tickers: ['XMEU.DE'],
    name: 'Xtrackers MSCI Europe UCITS ETF',
    proxies: [{ symbol: 'IEUR', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    isin: 'IE00B53L3W79',
    tickers: ['SXR7.DE'],
    name: 'iShares Core MSCI EMU UCITS ETF',
    proxies: [{ symbol: 'EZU', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    isin: 'LU0322253906',
    tickers: ['XXSC.DE', 'DX2J.DE'],
    name: 'Xtrackers MSCI Europe Small Cap UCITS ETF',
    proxies: [{ symbol: 'IEUS', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },

  // ============================================================================
  // Deutschland (DAX hat keinen US-Zwilling → MSCI Germany)
  // ============================================================================
  {
    isin: 'DE0005933931',
    tickers: ['EXS1.DE'],
    name: 'iShares Core DAX UCITS ETF',
    proxies: [{ symbol: 'EWG', weight: 1 }],
    exact: false,
    assetClass: 'equity',
    note: 'DAX über MSCI-Germany-Pendant EWG angenähert',
  },
  {
    isin: 'LU0274211838',
    tickers: ['DBXD.DE'],
    name: 'Xtrackers DAX UCITS ETF',
    proxies: [{ symbol: 'EWG', weight: 1 }],
    exact: false,
    assetClass: 'equity',
    note: 'DAX über MSCI-Germany-Pendant EWG angenähert',
  },

  // ============================================================================
  // Welt ex USA / ex EMU
  // ============================================================================
  {
    isin: 'IE0006WW1TQ4',
    tickers: ['EXUS.DE'],
    name: 'Xtrackers MSCI World ex USA UCITS ETF',
    proxies: [{ symbol: 'VEA', weight: 1 }],
    exact: false,
    assetClass: 'equity',
    note: 'Über FTSE Developed ex US (VEA) angenähert (enthält zusätzlich Südkorea)',
  },
  {
    isin: 'FR0013412020',
    tickers: ['18MP.DE'],
    name: 'Amundi MSCI World ex EMU UCITS ETF',
    proxies: null,
    exact: false,
    assetClass: 'equity',
    note: 'Kein passender US-Zwilling verfügbar',
  },

  // ============================================================================
  // Sektoren & Themen
  // ============================================================================
  {
    isin: 'IE00BM67HT60',
    tickers: ['XDWT.DE'],
    name: 'Xtrackers MSCI World Information Technology UCITS ETF',
    proxies: [{ symbol: 'VGT', weight: 1 }],
    exact: false,
    assetClass: 'equity',
    note: 'World-IT über US-IT-Pendant VGT angenähert (Index ist zu ~90% USA)',
  },
  {
    isin: 'IE00B3WJKG14',
    tickers: ['IUIT.DE', 'IUIT.L'],
    name: 'iShares S&P 500 Information Technology Sector UCITS ETF',
    proxies: [{ symbol: 'XLK', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    isin: 'IE00BM67HL84',
    tickers: ['XUTC.DE'],
    name: 'Xtrackers MSCI USA Information Technology UCITS ETF',
    proxies: [{ symbol: 'VGT', weight: 1 }],
    exact: false,
    assetClass: 'equity',
    note: 'MSCI USA IT über VGT (MSCI US IMI IT) angenähert',
  },
  {
    isin: 'IE00BM67HV82',
    tickers: ['XDWI.DE'],
    name: 'Xtrackers MSCI World Industrials UCITS ETF',
    proxies: [{ symbol: 'XLI', weight: 1 }],
    exact: false,
    assetClass: 'equity',
    note: 'World-Industrials über US-Pendant XLI angenähert',
  },
  {
    isin: 'IE00BF4RFH31',
    tickers: ['WSML.DE', 'WSML.L'],
    name: 'iShares MSCI World Small Cap UCITS ETF',
    proxies: [
      { symbol: 'VB', weight: 0.6 },
      { symbol: 'SCZ', weight: 0.4 },
    ],
    exact: false,
    assetClass: 'equity',
    note: 'Kein US-Zwilling — über VB (US Small Cap) + SCZ (International Small Cap) zusammengesetzt',
  },
  {
    isin: 'IE000M7V94E1',
    tickers: ['NUKL.DE'],
    name: 'VanEck Uranium and Nuclear Technologies UCITS ETF',
    proxies: [{ symbol: 'NLR', weight: 1 }],
    exact: false,
    assetClass: 'equity',
    note: 'Über das US-Schwesterprodukt NLR angenähert',
  },
  {
    isin: 'IE00BK5BCD43',
    tickers: ['XMLD.DE', 'AIAI.L'],
    name: 'L&G Artificial Intelligence UCITS ETF',
    proxies: [{ symbol: 'THNQ', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    isin: 'IE00B6R52143',
    tickers: ['IS0C.DE', 'SPAG.L'],
    name: 'iShares Agribusiness UCITS ETF',
    proxies: [{ symbol: 'VEGI', weight: 1 }],
    exact: false,
    assetClass: 'equity',
    note: 'Über MSCI-Agriculture-Pendant VEGI angenähert',
  },
  {
    isin: 'IE0003Z9E2Y3',
    tickers: ['4COP.DE'],
    name: 'Global X Copper Miners UCITS ETF',
    proxies: [{ symbol: 'COPX', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    isin: 'IE000UL6CLP7',
    tickers: ['SLVR.DE'],
    name: 'Global X Silver Miners UCITS ETF',
    proxies: [{ symbol: 'SIL', weight: 1 }],
    exact: true,
    assetClass: 'equity',
  },
  {
    isin: 'IE00B6R52036',
    tickers: ['SPGP.DE', 'SPGP.L'],
    name: 'iShares Gold Producers UCITS ETF',
    proxies: [{ symbol: 'GDX', weight: 1 }],
    exact: false,
    assetClass: 'equity',
    note: 'Über Gold-Miners-Pendant GDX angenähert',
  },
  {
    isin: 'IE000I8KRLL9',
    tickers: ['SEC0.DE'],
    name: 'iShares MSCI Global Semiconductors UCITS ETF',
    proxies: [{ symbol: 'SMH', weight: 1 }],
    exact: false,
    assetClass: 'equity',
    note: 'Über Semiconductor-Pendant SMH angenähert',
  },
  {
    isin: 'IE00BP3QZB59',
    tickers: ['IS3S.DE'],
    name: 'iShares Edge MSCI World Value Factor UCITS ETF',
    proxies: null,
    exact: false,
    assetClass: 'equity',
    note: 'Kein passender US-Zwilling verfügbar',
  },

  // ============================================================================
  // Dimensional (aktiv-systematisch — Näherung über Dimensional-US-ETFs bzw. Markt)
  // ============================================================================
  {
    isin: 'IE000EGGFVG6',
    tickers: ['DEGC.DE'],
    name: 'Dimensional Global Core Equity UCITS ETF',
    proxies: [{ symbol: 'VT', weight: 1 }],
    exact: false,
    assetClass: 'equity',
    note: 'Aktiv-systematischer Fonds — über den Weltmarkt (VT) angenähert, Dimensional-Tilts nicht abgebildet',
  },
  {
    isin: 'IE000S67ID55',
    tickers: ['DEGT.DE'],
    name: 'Dimensional Global Targeted Value UCITS ETF',
    proxies: [
      { symbol: 'DFSV', weight: 0.55 },
      { symbol: 'DISV', weight: 0.45 },
    ],
    exact: false,
    assetClass: 'equity',
    note: 'Über Dimensional US + International Small Cap Value zusammengesetzt',
  },

  // ============================================================================
  // Nicht-Aktien (kein Look-Through sinnvoll)
  // ============================================================================
  {
    isin: 'LU0290358497',
    tickers: ['XEON.DE', 'DBX0AN'],
    name: 'Xtrackers II EUR Overnight Rate Swap UCITS ETF',
    proxies: null,
    exact: false,
    assetClass: 'money-market',
  },
]

const byIsin = new Map(etfLookthrough.map(e => [e.isin.toUpperCase(), e]))
const byTicker = new Map(
  etfLookthrough.flatMap(e => e.tickers.map(t => [t.toUpperCase(), e] as const)),
)

/**
 * Look-Through-Eintrag für eine Position finden.
 * ISIN hat Vorrang — Ticker nur als Fallback (Broker-Importe ohne ISIN).
 */
export function findLookthroughEntry(
  isin: string | null | undefined,
  symbol: string | null | undefined,
): EtfLookthroughEntry | undefined {
  if (isin) {
    const hit = byIsin.get(isin.toUpperCase())
    if (hit) return hit
  }
  if (symbol) {
    const hit = byTicker.get(symbol.toUpperCase())
    if (hit) return hit
  }
  return undefined
}
