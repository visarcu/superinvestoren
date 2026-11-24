// src/data/etfMaster.ts
//
// Kuratierte ETF-Referenzdatenbank — Single Source of Truth für ISIN→Ticker-Mapping
// und Preis-Quellen. Jeder Eintrag ist manuell verifiziert.
//
// Kurse kommen weiterhin LIVE von FMP/Yahoo — diese Datei definiert nur WO der
// Kurs herkommt und WIE er gemappt wird (ISIN→Ticker). Keine statischen Preise.
//
// === PFLEGE ===
//
// Neuen Eintrag hinzufügen:
// 1. ISIN + WKN von justetf.com oder Broker bestätigen
// 2. Prüfen ob FMP den XETRA-Ticker direkt liefert (→ fmp_direct)
// 3. Falls nicht: London-Listing (.L) oder Amsterdam (.AS) suchen → fmp_alt
// 4. Falls beides nicht: Yahoo Finance testen → yahoo
// 5. npm run check:isin und npm run validate:etf-prices ausführen
//
// WICHTIG: Keine Duplikate pro ISIN und nur ISINs mit gültiger Prüfziffer.
// Beides prüft checkIsinIntegrity. Ob eine gültige ISIN auch zum Kürzel gehört,
// sieht die Prüfung nicht: immer gegen eine zweite Quelle halten (OpenFIGI, FMP).
// Letzter Gesamtabgleich: 24.11.2026 gegen Stammsatz, FMP und OpenFIGI.

export type PriceSource =
  | { type: 'fmp_direct' }
  | { type: 'fmp_alt'; ticker: string; exchange: 'GBp' | 'GBP' | 'EUR' }
  | { type: 'yahoo'; ticker?: string }

export interface ETFMasterEntry {
  isin: string
  wkn?: string
  xetraTicker: string
  name: string
  issuer: string
  ter: number
  category: string
  priceSource: PriceSource
  verified: true
}

export const etfMaster: ETFMasterEntry[] = [

  // ============================================================================
  // FMP via alternativen Börsen (fmp_alt)
  // FMP liefert für diese XETRA-Ticker keine/falsche Kurse. Stattdessen wird
  // der Kurs vom London- oder Amsterdam-Listing geholt und umgerechnet.
  // ============================================================================

  // --- VANGUARD ---
  {
    isin: 'IE00BK5BQT80',
    wkn: 'A2PKXG',
    xetraTicker: 'VWCE.DE',
    name: 'Vanguard FTSE All-World UCITS ETF (Acc)',
    issuer: 'Vanguard',
    ter: 0.22,
    category: 'Global All-World',
    // VWCE.L gibt es weder bei FMP noch bei Yahoo — der Kurs kam nur über den
    // Yahoo-Rückfall. FMP führt VWCE.DE direkt (geprüft 21.10.2026: 171,32 €).
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'IE00B8GKDB10',
    wkn: 'A1T8FV',
    xetraTicker: 'VHYL.DE',
    name: 'Vanguard FTSE All-World High Dividend Yield UCITS ETF',
    issuer: 'Vanguard',
    ter: 0.29,
    category: 'Dividend',
    priceSource: { type: 'fmp_alt', ticker: 'VHYL.AS', exchange: 'EUR' },
    verified: true,
  },

  // --- iSHARES ---
  {
    isin: 'IE00B4L5YC18',
    xetraTicker: 'EUNM.DE',
    name: 'iShares MSCI EM UCITS ETF (Acc)',
    issuer: 'iShares',
    ter: 0.18,
    category: 'Emerging Markets',
    // IEMA.DE liefert auf FMP/Yahoo nichts. EUNM.DE ist der andere XETRA-Ticker
    // für denselben Fonds und funktioniert auf FMP direkt (51,78 EUR).
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'IE00B3WJKG14',
    wkn: 'A142N1',
    xetraTicker: 'IUIT.DE',
    name: 'iShares S&P 500 Information Technology Sector UCITS ETF',
    issuer: 'iShares',
    ter: 0.15,
    category: 'Technology',
    // IUIT.L notiert in USD, nicht in Pence — als GBp gelesen kam der Kurs
    // rund 100× zu niedrig an. QDVE.DE ist die Xetra-Notierung derselben ISIN
    // in EUR (geprüft 21.10.2026: 46,46 € vs. IUIT.L umgerechnet 46,44 €).
    priceSource: { type: 'fmp_alt', ticker: 'QDVE.DE', exchange: 'EUR' },
    verified: true,
  },
  {
    isin: 'IE00BF4RFH31',
    xetraTicker: 'WSML.DE',
    name: 'iShares MSCI World Small Cap UCITS ETF',
    issuer: 'iShares',
    ter: 0.35,
    category: 'Global Small Cap',
    // WSML.L notiert in USD, nicht in Pence (siehe IUIT). IUSN.DE ist die
    // Xetra-Notierung derselben ISIN in EUR (geprüft 21.10.2026: 9,10 €).
    priceSource: { type: 'fmp_alt', ticker: 'IUSN.DE', exchange: 'EUR' },
    verified: true,
  },

  // --- HSBC ---
  {
    isin: 'IE00B4X9L533',
    wkn: 'A1C9KL',
    xetraTicker: 'HMWO.DE',
    name: 'HSBC MSCI World UCITS ETF',
    issuer: 'HSBC',
    ter: 0.15,
    category: 'Global Developed',
    priceSource: { type: 'fmp_alt', ticker: 'HMWO.L', exchange: 'GBp' },
    verified: true,
  },

  // --- INVESCO ---
  {
    isin: 'IE0032077012',
    wkn: '801498',
    xetraTicker: 'EQQQ.DE',
    name: 'Invesco EQQQ NASDAQ-100 UCITS ETF',
    issuer: 'Invesco',
    ter: 0.30,
    category: 'Technology',
    priceSource: { type: 'fmp_alt', ticker: 'EQQQ.L', exchange: 'GBp' },
    verified: true,
  },
  {
    // SPGP.L = iShares Gold Producers UCITS ETF (GBp auf LSE)
    // ACHTUNG: SPGP auf NYSE ist ein ANDERER ETF (Invesco S&P 500 GARP)!
    isin: 'IE00B6R52036',
    xetraTicker: 'SPGP.DE',
    name: 'iShares Gold Producers UCITS ETF',
    issuer: 'iShares',
    ter: 0.55,
    category: 'Gold',
    priceSource: { type: 'fmp_alt', ticker: 'SPGP.L', exchange: 'GBp' },
    verified: true,
  },

  // --- VANECK ---
  {
    isin: 'IE000M7V94E1',
    xetraTicker: 'NUKL.DE',
    name: 'VanEck Uranium and Nuclear Technologies UCITS ETF',
    issuer: 'VanEck',
    ter: 0.55,
    category: 'Thematic',
    // FMP kennt weder NUKL.DE noch NUKL.L → Yahoo ist die einzige Quelle
    priceSource: { type: 'yahoo' },
    verified: true,
  },

  // --- GLOBAL X ---
  {
    isin: 'IE00BM8R0J59',
    wkn: 'A2QR39',
    xetraTicker: 'QYLE.DE',
    name: 'Global X Nasdaq 100 Covered Call UCITS ETF D',
    issuer: 'Global X',
    ter: 0.45,
    category: 'Covered Call',
    // FMP kennt weder QYLE.DE noch QYLE.L
    priceSource: { type: 'yahoo' },
    verified: true,
  },

  // --- EINZELAKTIEN (gleiche Preis-Routing-Logik wie ETFs) ---
  {
    isin: 'AU000000BHP4',
    xetraTicker: 'BHP.DE',
    name: 'BHP Group Limited',
    issuer: 'BHP',
    ter: 0,
    category: 'Materials',
    priceSource: { type: 'fmp_alt', ticker: 'BHP.L', exchange: 'GBp' },
    verified: true,
  },

  {
    isin: 'CNE100000296',
    xetraTicker: 'BYDDF',
    name: 'BYD Company Limited',
    issuer: '',
    ter: 0.0,
    category: '',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  }
,
{
  isin: 'CA09173B1076',
  xetraTicker: 'BITF',
  name: 'BITFARMS LTD.',
  issuer: '',
  ter: 0.0,
  category: '',
  priceSource: { type: 'fmp_direct' },
  verified: true,
}

,
{
  isin: 'KYG9830T1067',
  xetraTicker: 'XIACF',
  name: 'XIAOMI',
  issuer: '',
  ter: 0.0,
  category: '',
  priceSource: { type: 'fmp_direct' },
  verified: true,
}

,
{
  isin: 'KYG3R83K1037',
  xetraTicker: 'FITGF',
  name: 'Foxconn Interconnect Technology',
  issuer: '',
  ter: 0.0,
  category: '',
  priceSource: { type: 'fmp_direct' },
  verified: true,
}

,

  // ============================================================================
  // Yahoo Finance (yahoo)
  // FMP kann weder den XETRA-Ticker noch ein alternatives Listing liefern.
  // Yahoo Finance ist die einzige zuverlässige Quelle.
  // ============================================================================

  {
    isin: 'IE000716YHJ7',
    wkn: 'A3D7QX',
    xetraTicker: 'FWIA.DE',
    name: 'Invesco FTSE All-World UCITS ETF (Acc)',
    issuer: 'Invesco',
    ter: 0.15,
    category: 'Global All-World',
    // ACHTUNG: FWIA.DE darf NICHT auf FWRA.L gemappt werden! Das sind verschiedene
    // Share-Classes (FWIA=~7€ vs. FWRA=~10€ umgerechnet, 35% Abweichung).
    priceSource: { type: 'yahoo' },
    verified: true,
  },

  // ============================================================================
  // FMP direkt (fmp_direct)
  // FMP liefert zuverlässige EUR-Kurse für den XETRA-Ticker.
  // ============================================================================

  // --- VANGUARD ---
  {
    isin: 'IE00B3RBWM25',
    wkn: 'A1JX52',
    xetraTicker: 'VGWL.DE',
    name: 'Vanguard FTSE All-World UCITS ETF (Dist)',
    issuer: 'Vanguard',
    ter: 0.22,
    category: 'Global All-World',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'IE00B3XXRP09',
    wkn: 'A1JX53',
    xetraTicker: 'VUSA.DE',
    name: 'Vanguard S&P 500 UCITS ETF',
    issuer: 'Vanguard',
    ter: 0.07,
    category: 'US Large Cap',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'IE00BNG8L278',
    xetraTicker: 'V3AA.DE',
    name: 'Vanguard ESG Global All Cap UCITS ETF',
    issuer: 'Vanguard',
    ter: 0.24,
    category: 'ESG Global',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'IE00BKX55T58',
    wkn: 'A12CX1',
    xetraTicker: 'VDEV.DE',
    name: 'Vanguard FTSE Developed World UCITS ETF',
    issuer: 'Vanguard',
    ter: 0.12,
    category: 'Global Developed',
    // Unter VDEV.DE gibt es keine Kurse; die Xetra-Notierung dieser ISIN ist
    // VGVE.DE (geprüft 21.10.2026: 128,80 €). VDEV.L notiert in USD.
    priceSource: { type: 'fmp_alt', ticker: 'VGVE.DE', exchange: 'EUR' },
    verified: true,
  },

  // --- iSHARES ---
  {
    isin: 'IE00B4L5Y983',
    wkn: 'A0RPWH',
    xetraTicker: 'EUNL.DE',
    name: 'iShares Core MSCI World UCITS ETF',
    issuer: 'iShares',
    ter: 0.20,
    category: 'Global Developed',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'DE0005933931',
    wkn: '593393',
    xetraTicker: 'EXS1.DE',
    name: 'iShares Core DAX UCITS ETF',
    issuer: 'iShares',
    ter: 0.16,
    category: 'Germany',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'IE00B5BMR087',
    wkn: 'A0YEDG',
    xetraTicker: 'SXR8.DE',
    name: 'iShares Core S&P 500 UCITS ETF',
    issuer: 'iShares',
    ter: 0.07,
    category: 'US Large Cap',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'DE0002635307',
    xetraTicker: 'EXSA.DE',
    name: 'iShares STOXX Europe 600 UCITS ETF',
    issuer: 'iShares',
    ter: 0.20,
    category: 'Europe',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'IE00B1YZSC51',
    xetraTicker: 'IQQY.DE',
    name: 'iShares Core MSCI Europe UCITS ETF',
    issuer: 'iShares',
    ter: 0.12,
    category: 'Europe',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'IE00B53QG562',
    xetraTicker: 'SXR7.DE',
    name: 'iShares Core MSCI EMU UCITS ETF',
    issuer: 'iShares',
    ter: 0.12,
    category: 'Eurozone',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'DE0002635299',
    // Vorher TDIV.DE mit dem Namen des EURO-STOXX-Fonds — TDIV ist aber der
    // VanEck Dividend Leaders (NL0011683594, bei uns VDIV.DE). Diese ISIN ist
    // laut FMP und Yahoo der STOXX-Europe-Fonds mit Xetra-Ticker EXSH.
    xetraTicker: 'EXSH.DE',
    name: 'iShares STOXX Europe Select Dividend 30 UCITS ETF (DE)',
    issuer: 'iShares',
    ter: 0.31,
    category: 'Dividend',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'IE00BP3QZB59',
    xetraTicker: 'IS3S.DE',
    name: 'iShares Edge MSCI World Value Factor UCITS ETF',
    issuer: 'iShares',
    ter: 0.30,
    category: 'Value Factor',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },

  // --- XTRACKERS ---
  {
    isin: 'IE00BTJRMP35',
    wkn: 'A12GVR',
    xetraTicker: 'XMME.DE',
    name: 'Xtrackers MSCI Emerging Markets UCITS ETF',
    issuer: 'Xtrackers',
    ter: 0.18,
    category: 'Emerging Markets',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'LU0290358497',
    wkn: 'DBX0AN',
    xetraTicker: 'XEON.DE',
    name: 'Xtrackers II EUR Overnight Rate Swap UCITS ETF',
    issuer: 'Xtrackers',
    ter: 0.10,
    category: 'Money Market',
    // FMP führt XEON.DE nicht, Yahoo schon (geprüft 21.10.2026: 150,53 €).
    priceSource: { type: 'yahoo' },
    verified: true,
  },
  {
    // DX2J.DE ist ein veralteter Ticker — FMP liefert 61€ (FALSCH, echter Kurs ~72€).
    // XXSC.DE ist der aktuelle Ticker, FMP kennt ihn nicht, Yahoo liefert korrekt.
    isin: 'LU0322253906',
    wkn: 'DBX1AU',
    xetraTicker: 'XXSC.DE',
    name: 'Xtrackers MSCI Europe Small Cap UCITS ETF',
    issuer: 'Xtrackers',
    ter: 0.30,
    category: 'Europe Small Cap',
    priceSource: { type: 'yahoo' },
    verified: true,
  },
  {
    // Vorher IE00BFNM3G45 — das ist der iShares MSCI USA Screened. Ein Import
    // dieser ISIN landete dadurch als Xtrackers MSCI Europe im Depot.
    isin: 'LU0274209237',
    xetraTicker: 'XMEU.DE',
    name: 'Xtrackers MSCI Europe UCITS ETF 1C',
    issuer: 'Xtrackers',
    ter: 0.12,
    category: 'Europe',
    // FMP führt XMEU.DE nicht (DBXA.DE erst ab 06/2026), Yahoo mit voller
    // Historie (geprüft 21.10.2026: 119,86 €).
    priceSource: { type: 'yahoo' },
    verified: true,
  },
  {
    isin: 'IE00BM67HT60',
    xetraTicker: 'XDWT.DE',
    name: 'Xtrackers MSCI World Information Technology UCITS ETF',
    issuer: 'Xtrackers',
    ter: 0.25,
    category: 'Technology',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    // Vorher XCS6.DE: Das ist der Xtrackers MSCI China (LU0514695690). Der
    // Xetra-Ticker dieser ISIN ist XD9U.
    isin: 'IE00BJ0KDR00',
    xetraTicker: 'XD9U.DE',
    name: 'Xtrackers MSCI USA UCITS ETF 1C',
    issuer: 'Xtrackers',
    ter: 0.03,
    category: 'US Broad Market',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    // Vorher als "MSCI World High Dividend Yield" mit der ISIN eines
    // iShares-Fonds (IE00BZ0PKV06). XDWD ist der thesaurierende MSCI World.
    isin: 'IE00BJ0KDQ92',
    wkn: 'A1XB5U',
    xetraTicker: 'XDWD.DE',
    name: 'Xtrackers MSCI World UCITS ETF 1C',
    issuer: 'Xtrackers',
    ter: 0.12,
    category: 'Global Developed',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'LU0274211480',
    xetraTicker: 'DBXD.DE',
    name: 'Xtrackers DAX UCITS ETF',
    issuer: 'Xtrackers',
    ter: 0.09,
    category: 'Germany',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'IE00BGQYRS42',
    xetraTicker: 'XUTC.DE',
    name: 'Xtrackers MSCI USA Information Technology UCITS ETF 1D',
    issuer: 'Xtrackers',
    ter: 0.12,
    category: 'Technology',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    // Ausschüttende Klasse. Vorher stand hier die ISIN der thesaurierenden
    // (IE00BJ0KDQ92, XDWD.DE): Importe landeten dadurch unter dem falschen Kurs.
    isin: 'IE00BK1PV551',
    wkn: 'A1XEY2',
    xetraTicker: 'XDWL.DE',
    name: 'Xtrackers MSCI World UCITS ETF 1D',
    issuer: 'Xtrackers',
    ter: 0.12,
    category: 'Global Developed',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'IE00BZ02LR44',
    xetraTicker: 'XZW0.DE',
    name: 'Xtrackers MSCI World ESG UCITS ETF',
    issuer: 'Xtrackers',
    ter: 0.19,
    category: 'ESG Global',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'IE00BM67HV82',
    xetraTicker: 'XDWI.DE',
    name: 'Xtrackers MSCI World Industrials UCITS ETF',
    issuer: 'Xtrackers',
    ter: 0.25,
    category: 'Industrials',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },

  // --- AMUNDI / LYXOR ---
  {
    isin: 'IE0009HF1MK9',
    xetraTicker: 'WEBG.DE',
    // Ausschüttende Klasse (laut Yahoo „Inc“); die thesaurierende hat die ISIN
    // IE0003XJA0J9 (Xetra WEBN).
    name: 'Amundi Prime All Country World UCITS ETF (Dist)',
    issuer: 'Amundi',
    ter: 0.07,
    category: 'Global All-World',
    // FMP führt WEBG.DE nicht, Yahoo schon (geprüft 21.10.2026: 13,77 €).
    priceSource: { type: 'yahoo' },
    verified: true,
  },
  {
    isin: 'LU0908500753',
    xetraTicker: 'LYX0YD.DE',
    name: 'Amundi Core STOXX Europe 600 UCITS ETF',
    issuer: 'Amundi',
    ter: 0.07,
    category: 'Europe',
    // Unter LYX0YD.DE gibt es keine Kurse; Xetra-Ticker dieser ISIN ist LYP6
    // (geprüft 21.10.2026: 318,40 €).
    priceSource: { type: 'fmp_alt', ticker: 'LYP6.DE', exchange: 'EUR' },
    verified: true,
  },

  // --- STATE STREET (SPDR) ---
  {
    isin: 'IE00B3YLTY66',
    xetraTicker: 'SPYI.DE',
    name: 'SPDR MSCI ACWI IMI UCITS ETF',
    issuer: 'State Street',
    ter: 0.17,
    category: 'Global All Cap',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'IE00BFY0GT14',
    xetraTicker: 'SPPW.DE',
    name: 'SPDR MSCI World UCITS ETF',
    issuer: 'State Street',
    ter: 0.12,
    category: 'Global Developed',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },

  // --- INVESCO ---
  {
    isin: 'IE00B60SX394',
    xetraTicker: 'SC0J.DE',
    name: 'Invesco MSCI World UCITS ETF',
    issuer: 'Invesco',
    ter: 0.19,
    category: 'Global Developed',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },

  // --- Weitere EU-ETFs (ex etfs.ts) ---
  {
    isin: 'FR0010315770',
    // LYXE.DE ist nur noch unser interner Schlüssel — unter dem Symbol liegen
    // bestehende Depot-Buchungen. An der Börse ist LYXE ein Amundi-High-Yield-
    // Anleihen-ETF: Ohne Kursquelle fiel die Historie auf Yahoo LYXE.DE zurück
    // und bewertete diesen MSCI World mit ~73 € statt ~442 €. Der Xetra-Ticker
    // dieser ISIN ist LYYA (geprüft 21.10.2026: 441,95 €).
    xetraTicker: 'LYXE.DE',
    name: 'Amundi MSCI World Swap II UCITS ETF Dist (ex Lyxor MSCI World)',
    issuer: 'Amundi',
    ter: 0.30,
    category: 'Global Developed',
    priceSource: { type: 'fmp_alt', ticker: 'LYYA.DE', exchange: 'EUR' },
    verified: true,
  },
  {
    // Vorher FR0013412020 (Amundi PEA Emerging Markets) unter 18MP.DE. 18MP ist
    // seit 2021 ohne Handel, FMP liefert dort bis heute den Kurs vom 29.04.2021.
    // Xetra führt diese ISIN als ACM9, FMP nur Paris (geprüft 24.11.2026:
    // CM9.PA 719,59 €, ACM9.DE bei Yahoo 718,40 €).
    isin: 'FR0010756114',
    xetraTicker: 'ACM9.DE',
    name: 'Amundi MSCI World ex EMU UCITS ETF (Acc)',
    issuer: 'Amundi',
    ter: 0.35,
    category: 'World ex Eurozone',
    priceSource: { type: 'fmp_alt', ticker: 'CM9.PA', exchange: 'EUR' },
    verified: true,
  },
  {
    isin: 'LU1681043599',
    xetraTicker: 'AMEW.DE',
    name: 'Amundi MSCI World UCITS ETF',
    issuer: 'Amundi',
    ter: 0.38,
    category: 'Global Developed',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },

  // --- Einzelaktien (gleiche Routing-Logik) ---
  {
    isin: 'NL0015002MS2',
    xetraTicker: 'MICC',
    name: 'The Magnum Ice Cream Company N.V.',
    issuer: 'Magnum',
    ter: 0,
    category: 'Consumer Staples',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },

  // ============================================================================
  // US-ETFs (ex etfs.ts)
  // FMP liefert USD-Kurse, Konvertierung USD→EUR passiert in den API-Routes.
  // ============================================================================

  // --- VANGUARD US ---
  {
    isin: 'US9229087690',
    xetraTicker: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    issuer: 'Vanguard',
    ter: 0.03,
    category: 'Total Market',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US9229083632',
    xetraTicker: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    issuer: 'Vanguard',
    ter: 0.03,
    category: 'Large Cap',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US9229087369',
    xetraTicker: 'VUG',
    name: 'Vanguard Growth ETF',
    issuer: 'Vanguard',
    ter: 0.04,
    category: 'Large Cap Growth',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US9229087443',
    xetraTicker: 'VTV',
    name: 'Vanguard Value ETF',
    issuer: 'Vanguard',
    ter: 0.04,
    category: 'Large Cap Value',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US9219464065',
    xetraTicker: 'VYM',
    name: 'Vanguard High Dividend Yield ETF',
    issuer: 'Vanguard',
    ter: 0.06,
    category: 'Dividend',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US9220428588',
    xetraTicker: 'VWO',
    name: 'Vanguard FTSE Emerging Markets ETF',
    issuer: 'Vanguard',
    ter: 0.08,
    category: 'Emerging Markets',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US9219438580',
    xetraTicker: 'VEA',
    name: 'Vanguard FTSE Developed Markets ETF',
    issuer: 'Vanguard',
    ter: 0.05,
    category: 'International Developed',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US92204A7028',
    xetraTicker: 'VGT',
    name: 'Vanguard Information Technology ETF',
    issuer: 'Vanguard',
    ter: 0.10,
    category: 'Technology',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US92204A3068',
    xetraTicker: 'VDE',
    name: 'Vanguard Energy ETF',
    issuer: 'Vanguard',
    ter: 0.10,
    category: 'Energy',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US9220428745',
    xetraTicker: 'VGK',
    name: 'Vanguard FTSE Europe ETF',
    issuer: 'Vanguard',
    ter: 0.08,
    category: 'Europe',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US92204A5048',
    xetraTicker: 'VHT',
    name: 'Vanguard Health Care ETF',
    issuer: 'Vanguard',
    ter: 0.10,
    category: 'Healthcare',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US9229085538',
    xetraTicker: 'VNQ',
    name: 'Vanguard Real Estate ETF',
    issuer: 'Vanguard',
    ter: 0.12,
    category: 'Real Estate',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US9219378356',
    xetraTicker: 'BND',
    name: 'Vanguard Total Bond Market ETF',
    issuer: 'Vanguard',
    ter: 0.03,
    category: 'Aggregate Bond',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US9219097683',
    xetraTicker: 'VXUS',
    name: 'Vanguard Total International Stock ETF',
    issuer: 'Vanguard',
    ter: 0.08,
    category: 'Total International',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US9229077469',
    xetraTicker: 'VTEB',
    name: 'Vanguard Tax-Exempt Bond ETF',
    issuer: 'Vanguard',
    ter: 0.05,
    category: 'Municipal Bond',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US9219107334',
    xetraTicker: 'ESGV',
    name: 'Vanguard ESG U.S. Stock ETF',
    issuer: 'Vanguard',
    ter: 0.09,
    category: 'ESG',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },

  // --- STATE STREET US ---
  {
    isin: 'US78462F1030',
    xetraTicker: 'SPY',
    name: 'SPDR S&P 500 ETF Trust',
    issuer: 'State Street',
    ter: 0.09,
    category: 'Large Cap',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US78463V1070',
    xetraTicker: 'GLD',
    name: 'SPDR Gold Shares',
    issuer: 'State Street',
    ter: 0.40,
    category: 'Gold',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US78463X2027',
    xetraTicker: 'FEZ',
    name: 'SPDR EURO STOXX 50 ETF',
    issuer: 'State Street',
    ter: 0.29,
    category: 'Europe',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US78464A8707',
    xetraTicker: 'XBI',
    name: 'SPDR S&P Biotech ETF',
    issuer: 'State Street',
    ter: 0.35,
    category: 'Biotechnology',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US81369Y8030',
    xetraTicker: 'XLK',
    name: 'Technology Select Sector SPDR Fund',
    issuer: 'State Street',
    ter: 0.10,
    category: 'Technology',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US81369Y2090',
    xetraTicker: 'XLV',
    name: 'Health Care Select Sector SPDR Fund',
    issuer: 'State Street',
    ter: 0.10,
    category: 'Healthcare',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US81369Y6059',
    xetraTicker: 'XLF',
    name: 'Financial Select Sector SPDR Fund',
    issuer: 'State Street',
    ter: 0.10,
    category: 'Financials',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US81369Y5069',
    xetraTicker: 'XLE',
    name: 'Energy Select Sector SPDR Fund',
    issuer: 'State Street',
    ter: 0.10,
    category: 'Energy',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US81369Y8600',
    xetraTicker: 'XLRE',
    name: 'Real Estate Select Sector SPDR Fund',
    issuer: 'State Street',
    ter: 0.10,
    category: 'Real Estate',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US81369Y7040',
    xetraTicker: 'XLI',
    name: 'Industrial Select Sector SPDR Fund',
    issuer: 'State Street',
    ter: 0.10,
    category: 'Industrials',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US81369Y3080',
    xetraTicker: 'XLP',
    name: 'Consumer Staples Select Sector SPDR Fund',
    issuer: 'State Street',
    ter: 0.10,
    category: 'Consumer Staples',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US81369Y4070',
    xetraTicker: 'XLY',
    name: 'Consumer Discretionary Select Sector SPDR Fund',
    issuer: 'State Street',
    ter: 0.10,
    category: 'Consumer Discretionary',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US81369Y1001',
    xetraTicker: 'XLB',
    name: 'Materials Select Sector SPDR Fund',
    issuer: 'State Street',
    ter: 0.10,
    category: 'Materials',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US81369Y8865',
    xetraTicker: 'XLU',
    name: 'Utilities Select Sector SPDR Fund',
    issuer: 'State Street',
    ter: 0.10,
    category: 'Utilities',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },

  // --- iSHARES US ---
  {
    isin: 'US4642876555',
    xetraTicker: 'IWM',
    name: 'iShares Russell 2000 ETF',
    issuer: 'iShares',
    ter: 0.19,
    category: 'Small Cap',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US4642874659',
    xetraTicker: 'EFA',
    name: 'iShares MSCI EAFE ETF',
    issuer: 'iShares',
    ter: 0.32,
    category: 'International Developed',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US4642872349',
    xetraTicker: 'EEM',
    name: 'iShares MSCI Emerging Markets ETF',
    issuer: 'iShares',
    ter: 0.68,
    category: 'Emerging Markets',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US4642872265',
    xetraTicker: 'AGG',
    name: 'iShares Core U.S. Aggregate Bond ETF',
    issuer: 'iShares',
    ter: 0.03,
    category: 'Aggregate Bond',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US4642874329',
    xetraTicker: 'TLT',
    name: 'iShares 20+ Year Treasury Bond ETF',
    issuer: 'iShares',
    ter: 0.15,
    category: 'Treasury',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US46428Q1094',
    xetraTicker: 'SLV',
    name: 'iShares Silver Trust',
    issuer: 'iShares',
    ter: 0.50,
    category: 'Silver',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US46432F8427',
    xetraTicker: 'IEFA',
    name: 'iShares Core MSCI EAFE IMI Index ETF',
    issuer: 'iShares',
    ter: 0.07,
    category: 'International Developed',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US4642875078',
    xetraTicker: 'IJH',
    name: 'iShares Core S&P Mid-Cap ETF',
    issuer: 'iShares',
    ter: 0.05,
    category: 'Mid Cap',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US4642878049',
    xetraTicker: 'IJR',
    name: 'iShares Core S&P Small-Cap ETF',
    issuer: 'iShares',
    ter: 0.06,
    category: 'Small Cap',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US4642875151',
    xetraTicker: 'IGV',
    name: 'iShares Expanded Tech-Software Sector ETF',
    issuer: 'iShares',
    ter: 0.45,
    category: 'Technology',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US4642882249',
    xetraTicker: 'ICLN',
    name: 'iShares Global Clean Energy ETF',
    issuer: 'iShares',
    ter: 0.42,
    category: 'Clean Energy',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US4642871846',
    xetraTicker: 'FXI',
    name: 'iShares China Large-Cap ETF',
    issuer: 'iShares',
    ter: 0.72,
    category: 'China',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US46434G8226',
    xetraTicker: 'EWJ',
    name: 'iShares MSCI Japan ETF',
    issuer: 'iShares',
    ter: 0.50,
    category: 'Japan',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US4642868065',
    xetraTicker: 'EWG',
    name: 'iShares MSCI Germany ETF',
    issuer: 'iShares',
    ter: 0.50,
    category: 'Germany',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US4642871762',
    xetraTicker: 'TIP',
    name: 'iShares TIPS Bond ETF',
    issuer: 'iShares',
    ter: 0.19,
    category: 'TIPS',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US4642872422',
    xetraTicker: 'LQD',
    name: 'iShares iBoxx $ Investment Grade Corporate Bond ETF',
    issuer: 'iShares',
    ter: 0.14,
    category: 'Corporate Bond',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US4642885135',
    xetraTicker: 'HYG',
    name: 'iShares iBoxx $ High Yield Corporate Bond ETF',
    issuer: 'iShares',
    ter: 0.49,
    category: 'High Yield',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US4642875565',
    xetraTicker: 'IBB',
    name: 'iShares Biotechnology ETF',
    issuer: 'iShares',
    ter: 0.44,
    category: 'Biotechnology',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US4642887602',
    xetraTicker: 'ITA',
    name: 'iShares U.S. Aerospace & Defense ETF',
    issuer: 'iShares',
    ter: 0.40,
    category: 'Aerospace & Defense',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US4642888022',
    xetraTicker: 'SUSA',
    name: 'iShares MSCI USA ESG Select ETF',
    issuer: 'iShares',
    ter: 0.25,
    category: 'ESG',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US46432F3964',
    xetraTicker: 'MTUM',
    name: 'iShares MSCI USA Momentum Factor ETF',
    issuer: 'iShares',
    ter: 0.15,
    category: 'Momentum',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US46432F3394',
    xetraTicker: 'QUAL',
    name: 'iShares MSCI USA Quality Factor ETF',
    issuer: 'iShares',
    ter: 0.15,
    category: 'Quality',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US46432F3709',
    xetraTicker: 'SIZE',
    name: 'iShares MSCI USA Size Factor ETF',
    issuer: 'iShares',
    ter: 0.15,
    category: 'Size',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },

  // --- INVESCO US ---
  {
    isin: 'US46090E1038',
    xetraTicker: 'QQQ',
    name: 'Invesco QQQ Trust',
    issuer: 'Invesco',
    ter: 0.20,
    category: 'Technology',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US46137V1347',
    xetraTicker: 'PBW',
    name: 'Invesco WilderHill Clean Energy ETF',
    issuer: 'Invesco',
    ter: 0.70,
    category: 'Clean Energy',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US46141D2036',
    xetraTicker: 'UUP',
    name: 'Invesco DB US Dollar Index Bullish Fund',
    issuer: 'Invesco',
    ter: 0.75,
    category: 'Currency',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },

  // --- ARK ---
  {
    isin: 'US00214Q1040',
    xetraTicker: 'ARKK',
    name: 'ARK Innovation ETF',
    issuer: 'ARK',
    ter: 0.75,
    category: 'Innovation',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US00214Q2030',
    xetraTicker: 'ARKQ',
    name: 'ARK Autonomous Technology & Robotics ETF',
    issuer: 'ARK',
    ter: 0.75,
    category: 'Technology',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US00214Q4010',
    xetraTicker: 'ARKW',
    name: 'ARK Next Generation Internet ETF',
    issuer: 'ARK',
    ter: 0.75,
    category: 'Internet',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US00214Q3020',
    xetraTicker: 'ARKG',
    name: 'ARK Genomics Revolution ETF',
    issuer: 'ARK',
    ter: 0.75,
    category: 'Genomics',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },

  // --- SCHWAB ---
  {
    isin: 'US8085247976',
    xetraTicker: 'SCHD',
    name: 'Schwab US Dividend Equity ETF',
    issuer: 'Schwab',
    ter: 0.06,
    category: 'Dividend',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },

  // --- FIDELITY ---
  {
    isin: 'US3161463563',
    xetraTicker: 'FXNAX',
    name: 'Fidelity U.S. Bond Index Fund',
    issuer: 'Fidelity',
    ter: 0.03,
    category: 'Aggregate Bond',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },
  {
    isin: 'US31635T7081',
    xetraTicker: 'FZROX',
    name: 'Fidelity ZERO Total Market Index Fund',
    issuer: 'Fidelity',
    ter: 0,
    category: 'Total Market',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },

  // --- SONSTIGE US ---
  {
    isin: 'US91232N2071',
    xetraTicker: 'USO',
    name: 'United States Oil Fund',
    issuer: 'United States Commodity Funds',
    ter: 0.75,
    category: 'Oil',
    priceSource: { type: 'fmp_direct' },
    verified: true,
  },

 


]
