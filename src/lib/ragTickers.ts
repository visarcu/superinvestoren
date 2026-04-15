// Zentrale Konfiguration: Welche Aktien bekommen RAG-Coverage (Earnings Transcripts, News, SEC Filings)
// Top ~100 US-Aktien nach Marktkapitalisierung + Superinvestor-Favoriten
// Einfach Ticker hinzufügen/entfernen um die RAG-Abdeckung zu ändern

export const RAG_TICKERS = [
  // --- Mega-Caps ($500B+) ---
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'BRK-B', 'TSLA', 'AVGO', 'LLY',

  // --- Large-Cap Tech ---
  'NFLX', 'CRM', 'ADBE', 'ORCL', 'AMD', 'INTC', 'QCOM', 'TXN', 'NOW', 'SHOP',
  'SNOW', 'PLTR', 'PANW', 'CRWD', 'ANET', 'MU', 'KLAC', 'LRCX', 'MRVL', 'SNPS',
  'CDNS', 'ADSK', 'WDAY', 'TEAM', 'DDOG', 'ZS',

  // --- Finance ---
  'JPM', 'V', 'MA', 'BAC', 'GS', 'MS', 'BLK', 'SCHW', 'AXP', 'C',
  'WFC', 'SPGI', 'ICE', 'CME', 'MCO', 'CB',

  // --- Healthcare & Pharma ---
  'UNH', 'JNJ', 'LLY', 'PFE', 'ABBV', 'MRK', 'TMO', 'ABT', 'AMGN', 'ISRG',
  'GILD', 'VRTX', 'REGN', 'MDT', 'BMY', 'ELV',

  // --- Consumer ---
  'WMT', 'COST', 'KO', 'PEP', 'MCD', 'NKE', 'SBUX', 'TGT', 'LOW', 'HD',
  'PG', 'CL', 'EL', 'MNST',

  // --- Industrials & Transport ---
  'CAT', 'BA', 'HON', 'UPS', 'RTX', 'LMT', 'GE', 'DE', 'UNP', 'FDX',

  // --- Energy ---
  'XOM', 'CVX', 'OXY', 'COP', 'SLB', 'EOG',

  // --- Communication & Media ---
  'DIS', 'CMCSA', 'T', 'VZ', 'SPOT', 'RBLX',

  // --- Superinvestor-Favoriten (aus 13F-Daten) ---
  'SIRI', 'VRSN', 'DPZ', 'STZ', 'KHC', 'DVA', 'CHTR', 'LSXMK',
] as const

export type RagTicker = typeof RAG_TICKERS[number]
