-- Der Cron /api/cron/check-price-alerts lief alle 15 Minuten mit
-- "permission denied for table price_alerts" (Code 42501) ins Leere:
-- service_role hatte auf der Tabelle keinerlei Rechte, obwohl Cron und
-- /api/alerts ausschließlich über service_role lesen und schreiben.
-- Am 2026-11-26 direkt in Produktion ausgeführt.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.price_alerts TO service_role;
