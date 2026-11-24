// src/data/crossListings.ts
//
// Eigene Datei ohne weitere Importe, damit auch der Look-Through sie nutzen kann,
// ohne die großen 13F-Daten mitzuladen.

// Cross-Listings: lokale Börsen-Ticker → US-Listing/ADR, wie es in
// 13F-Filings auftaucht. Ohne diese Map bekämen ETF-Bestandteile wie
// 2330.TW (TSMC) oder Direktpositionen wie NOV.DE (Novo Nordisk) nie
// Superinvestor-Treffer, obwohl die Investoren dieselbe Firma via ADR halten.
// Kuratiert auf Werte mit realer 13F-Präsenz — bei Neuzugängen hier ergänzen.
export const US_LISTING_BY_LOCAL: Record<string, string> = {
  // Taiwan / Asien
  '2330.TW': 'TSM', '2330.TWO': 'TSM',
  '9988.HK': 'BABA', 'BABA.SW': 'BABA',
  '0700.HK': 'TCEHY', '700.HK': 'TCEHY',
  '7203.T': 'TM',   // Toyota
  '6758.T': 'SONY', // Sony
  '005930.KS': 'SSNLF', // Samsung (OTC, selten in 13F — schadet nicht)
  // Europa: Ordinaries → NYSE/Nasdaq-Listing bzw. ADR
  'ASML.AS': 'ASML', 'ASME.DE': 'ASML',
  'SAP.DE': 'SAP',
  'NOV.DE': 'NVO', 'NOVO-B.CO': 'NVO', 'NOVOB.CO': 'NVO',
  'AZN.L': 'AZN', 'AZN.ST': 'AZN',
  'SHEL.L': 'SHEL',
  'ULVR.L': 'UL',
  'BATS.L': 'BTI',
  'HSBA.L': 'HSBC',
  'RIO.L': 'RIO',
  'BHP.L': 'BHP', 'BHP.AX': 'BHP',
  'GSK.L': 'GSK',
  'BP.L': 'BP',
  'NESN.SW': 'NSRGY',  // Nestlé
  'ROG.SW': 'RHHBY',   // Roche
  'NOVN.SW': 'NVS',    // Novartis
  'MC.PA': 'LVMUY',    // LVMH
  'TTE.PA': 'TTE',     // TotalEnergies
  'SAN.PA': 'SNY',     // Sanofi
  'SPOT.SW': 'SPOT',
}
