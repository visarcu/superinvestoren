-- ISIN-Auflösungs-Cache: einmal aufgelöst, nie wieder API-Call.
-- Wird vom /api/v1/isin-search Endpoint befüllt (EODHD-primär, Master-Fallback).
-- Spart EODHD-Calls drastisch — typischer Import bringt 30-50 ISINs,
-- davon sind die meisten ETFs die mehrfach in verschiedenen User-Depots auftauchen.

CREATE TABLE IF NOT EXISTS isin_resolutions (
  isin TEXT PRIMARY KEY,
  ticker TEXT NOT NULL,           -- Resolved Ticker im FMP-Format (AAPL, VWCE.DE etc.)
  name TEXT,
  exchange TEXT,
  currency TEXT,
  type TEXT,                       -- "Common Stock", "ETF", "Index" etc.
  country TEXT,
  source TEXT NOT NULL,            -- 'eodhd' | 'manual' | 'master'
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_isin_resolutions_ticker ON isin_resolutions(ticker);

COMMENT ON TABLE isin_resolutions IS
  'Globaler Cache für ISIN→Ticker-Auflösungen. Read-only für User, Write nur via Server.';

-- WICHTIG: Supabase gibt neuen Tabellen KEINE automatischen Rollen-Grants.
-- Ohne diese GRANTs bekommt service_role "42501 permission denied" trotz RLS=off.
GRANT ALL ON TABLE isin_resolutions TO service_role;
GRANT ALL ON TABLE isin_resolutions TO postgres;
