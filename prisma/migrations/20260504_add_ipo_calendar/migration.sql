-- IPO Calendar – eigene Daten direkt aus SEC EDGAR
-- Befüllt vom wöchentlichen Cron /api/cron/sync-ipos.
-- 424B4 = Pricing-Prospectus (Listing 1-2 Tage später)
-- S-1 / S-1/A = Initial Registration (geplanter IPO, kein Pricing)

CREATE TABLE IF NOT EXISTS "IpoCalendar" (
  "id"          TEXT NOT NULL,
  "cik"         TEXT NOT NULL,
  "ticker"      TEXT,
  "companyName" TEXT NOT NULL,
  "filingType"  TEXT NOT NULL,
  "filingDate"  DATE NOT NULL,
  "accessionNo" TEXT NOT NULL,
  "filingUrl"   TEXT NOT NULL,
  "status"      TEXT NOT NULL,
  "sicCode"     TEXT,
  "bizState"    TEXT,
  "bizLocation" TEXT,
  "incState"    TEXT,
  "source"      TEXT NOT NULL DEFAULT 'sec-edgar',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IpoCalendar_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IpoCalendar_accessionNo_key"
  ON "IpoCalendar"("accessionNo");
CREATE INDEX IF NOT EXISTS "IpoCalendar_filingDate_idx" ON "IpoCalendar"("filingDate");
CREATE INDEX IF NOT EXISTS "IpoCalendar_status_idx" ON "IpoCalendar"("status");
CREATE INDEX IF NOT EXISTS "IpoCalendar_ticker_idx" ON "IpoCalendar"("ticker");
CREATE INDEX IF NOT EXISTS "IpoCalendar_cik_idx" ON "IpoCalendar"("cik");

-- PostgREST Schema-Cache reload (Supabase)
NOTIFY pgrst, 'reload schema';
