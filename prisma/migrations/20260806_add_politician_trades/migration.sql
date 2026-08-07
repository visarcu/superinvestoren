-- CreateTable
CREATE TABLE "Politician" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "chamber" TEXT NOT NULL,
    "state" TEXT,
    "district" TEXT,
    "party" TEXT,
    "bioguideId" TEXT,
    "photoUrl" TEXT,
    "tradeCount" INTEGER NOT NULL DEFAULT 0,
    "lastTradeDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Politician_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "PoliticianTrade" (
    "id" TEXT NOT NULL,
    "politicianSlug" TEXT NOT NULL,
    "ticker" TEXT,
    "assetDescription" TEXT NOT NULL,
    "assetType" TEXT,
    "type" TEXT NOT NULL,
    "typeRaw" TEXT,
    "transactionDate" DATE NOT NULL,
    "disclosureDate" DATE NOT NULL,
    "amount" TEXT NOT NULL,
    "amountMid" INTEGER NOT NULL DEFAULT 0,
    "owner" TEXT,
    "district" TEXT,
    "chamber" TEXT NOT NULL,
    "link" TEXT,
    "capitalGains" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,
    "source" TEXT NOT NULL DEFAULT 'fmp',
    "dedupeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoliticianTrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Politician_chamber_idx" ON "Politician"("chamber");

-- CreateIndex
CREATE INDEX "Politician_lastTradeDate_idx" ON "Politician"("lastTradeDate");

-- CreateIndex
CREATE UNIQUE INDEX "PoliticianTrade_dedupeKey_key" ON "PoliticianTrade"("dedupeKey");

-- CreateIndex
CREATE INDEX "PoliticianTrade_politicianSlug_transactionDate_idx" ON "PoliticianTrade"("politicianSlug", "transactionDate");

-- CreateIndex
CREATE INDEX "PoliticianTrade_ticker_transactionDate_idx" ON "PoliticianTrade"("ticker", "transactionDate");

-- CreateIndex
CREATE INDEX "PoliticianTrade_disclosureDate_idx" ON "PoliticianTrade"("disclosureDate");

-- CreateIndex
CREATE INDEX "PoliticianTrade_transactionDate_idx" ON "PoliticianTrade"("transactionDate");

-- CreateIndex
CREATE INDEX "PoliticianTrade_type_idx" ON "PoliticianTrade"("type");

-- AddForeignKey
ALTER TABLE "PoliticianTrade" ADD CONSTRAINT "PoliticianTrade_politicianSlug_fkey" FOREIGN KEY ("politicianSlug") REFERENCES "Politician"("slug") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS analog zu IpoCalendar: oeffentliche Daten sind lesbar, geschrieben wird
-- ausschliesslich vom Cron ueber den service_role-Key.
ALTER TABLE "Politician" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PoliticianTrade" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON "Politician"
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon read access" ON "Politician"
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Service role full access" ON "PoliticianTrade"
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Anon read access" ON "PoliticianTrade"
  FOR SELECT TO anon, authenticated USING (true);

GRANT ALL ON TABLE "Politician" TO service_role, authenticated, anon;
GRANT ALL ON TABLE "PoliticianTrade" TO service_role, authenticated, anon;
CREATE OR REPLACE FUNCTION refresh_politician_aggregates()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE "Politician" p
  SET "tradeCount" = COALESCE(a.cnt, 0),
      "lastTradeDate" = a.last_date,
      "updatedAt" = NOW()
  FROM (
    SELECT pt."politicianSlug" AS slug,
           COUNT(*) AS cnt,
           MAX(pt."transactionDate") AS last_date
    FROM "PoliticianTrade" pt
    GROUP BY pt."politicianSlug"
  ) a
  WHERE p.slug = a.slug
    AND (p."tradeCount" IS DISTINCT FROM COALESCE(a.cnt, 0)
      OR p."lastTradeDate" IS DISTINCT FROM a.last_date);
$$;

REVOKE ALL ON FUNCTION refresh_politician_aggregates() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION refresh_politician_aggregates() TO service_role;
