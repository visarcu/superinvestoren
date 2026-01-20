import type { Stock } from './stocks'

// UK Stocks - London Stock Exchange (.L suffix)
export const stocks: Stock[] = [
  // Financial Services
  { ticker: 'HSBA.L', cusip: '', name: 'HSBC Holdings plc', sector: 'Financial Services', metrics: [] },
  { ticker: 'BARC.L', cusip: '', name: 'Barclays PLC', sector: 'Financial Services', metrics: [] },
  { ticker: 'LLOY.L', cusip: '', name: 'Lloyds Banking Group plc', sector: 'Financial Services', metrics: [] },
  { ticker: 'NWG.L', cusip: '', name: 'NatWest Group plc', sector: 'Financial Services', metrics: [] },
  { ticker: 'STAN.L', cusip: '', name: 'Standard Chartered PLC', sector: 'Financial Services', metrics: [] },
  { ticker: 'LSEG.L', cusip: '', name: 'London Stock Exchange Group plc', sector: 'Financial Services', metrics: [] },

  // Energy
  { ticker: 'SHEL.L', cusip: '', name: 'Shell plc', sector: 'Energy', metrics: [] },
  { ticker: 'BP.L', cusip: '', name: 'BP p.l.c.', sector: 'Energy', metrics: [] },

  // Healthcare
  { ticker: 'AZN.L', cusip: '', name: 'AstraZeneca PLC', sector: 'Healthcare', metrics: [] },
  { ticker: 'GSK.L', cusip: '', name: 'GSK plc', sector: 'Healthcare', metrics: [] },

  // Consumer Defensive
  { ticker: 'ULVR.L', cusip: '', name: 'Unilever PLC', sector: 'Consumer Defensive', metrics: [] },
  { ticker: 'BATS.L', cusip: '', name: 'British American Tobacco p.l.c.', sector: 'Consumer Defensive', metrics: [] },
  { ticker: 'RKT.L', cusip: '', name: 'Reckitt Benckiser Group plc', sector: 'Consumer Defensive', metrics: [] },
  { ticker: 'DGE.L', cusip: '', name: 'Diageo plc', sector: 'Consumer Defensive', metrics: [] },

  // Basic Materials
  { ticker: 'BHP.L', cusip: '', name: 'BHP Group Limited', sector: 'Basic Materials', metrics: [] },
  { ticker: 'RIO.L', cusip: '', name: 'Rio Tinto Group', sector: 'Basic Materials', metrics: [] },
  { ticker: 'GLEN.L', cusip: '', name: 'Glencore plc', sector: 'Basic Materials', metrics: [] },
  { ticker: 'AAL.L', cusip: '', name: 'Anglo American plc', sector: 'Basic Materials', metrics: [] },
  { ticker: 'ANTO.L', cusip: '', name: 'Antofagasta plc', sector: 'Basic Materials', metrics: [] },
  { ticker: 'CRH.L', cusip: '', name: 'CRH plc', sector: 'Basic Materials', metrics: [] },

  // Industrials
  { ticker: 'RR.L', cusip: '', name: 'Rolls-Royce Holdings plc', sector: 'Industrials', metrics: [] },
  { ticker: 'BA.L', cusip: '', name: 'BAE Systems plc', sector: 'Industrials', metrics: [] },
  { ticker: 'FERG.L', cusip: '', name: 'Ferguson plc', sector: 'Industrials', metrics: [] },

  // Consumer Cyclical
  { ticker: 'CPG.L', cusip: '', name: 'Compass Group PLC', sector: 'Consumer Cyclical', metrics: [] },

  // Utilities
  { ticker: 'NG.L', cusip: '', name: 'National Grid plc', sector: 'Utilities', metrics: [] },

  // Communication Services
  { ticker: 'REL.L', cusip: '', name: 'RELX Plc', sector: 'Communication Services', metrics: [] },
  { ticker: 'VOD.L', cusip: '', name: 'Vodafone Group Plc', sector: 'Communication Services', metrics: [] },
]
