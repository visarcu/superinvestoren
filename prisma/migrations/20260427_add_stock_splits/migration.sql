-- Stock Splits Cache
-- Splits sind historisch immutable → DB-Cache vermeidet wiederholte EODHD-Calls
-- Quelle: primär EODHD /api/splits, Basis für eigene /api/v1/splits/{ticker}

CREATE TABLE IF NOT EXISTS "StockSplit" (
  "id"          TEXT NOT NULL,
  "symbol"      TEXT NOT NULL,
  "splitDate"   DATE NOT NULL,
  "numerator"   INTEGER NOT NULL,
  "denominator" INTEGER NOT NULL,
  "source"      TEXT NOT NULL DEFAULT 'eodhd',
  "fetchedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StockSplit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StockSplit_symbol_splitDate_key"
  ON "StockSplit"("symbol", "splitDate");
CREATE INDEX IF NOT EXISTS "StockSplit_symbol_idx" ON "StockSplit"("symbol");
CREATE INDEX IF NOT EXISTS "StockSplit_splitDate_idx" ON "StockSplit"("splitDate");

-- PostgREST Schema-Cache reload (Supabase)
NOTIFY pgrst, 'reload schema';
