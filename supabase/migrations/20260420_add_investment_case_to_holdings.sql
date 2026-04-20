-- Investment-Case (persönliche Notiz) pro Position.
-- Idee: User schreibt "warum kaufe ich das" beim Kauf auf — Disziplin gegen FOMO/Panik-Verkäufe.
-- Premium-Cap (3-5 Cases free, danach Premium) wird im UI gemacht, DB-Schema bleibt offen.

ALTER TABLE portfolio_holdings
  ADD COLUMN IF NOT EXISTS investment_case TEXT,
  ADD COLUMN IF NOT EXISTS investment_case_updated_at TIMESTAMPTZ;

-- Optional: Index für "alle Holdings mit Case" Queries (gering, kann auch weg)
-- CREATE INDEX IF NOT EXISTS idx_holdings_investment_case_present
--   ON portfolio_holdings ((investment_case IS NOT NULL));

COMMENT ON COLUMN portfolio_holdings.investment_case IS
  'User-Notiz zur Anlagestrategie für diese Position. Max 1000 Zeichen.';
COMMENT ON COLUMN portfolio_holdings.investment_case_updated_at IS
  'Zeitpunkt der letzten Änderung — wird im UI für "Case ist X Monate alt"-Hinweise genutzt.';
