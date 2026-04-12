# Finclue Data API – Roadmap

## Done
- [x] SEC XBRL Financial Service (30+ Metriken, ~10.000 US-Aktien)
- [x] CIK Auto-Lookup (SEC Ticker-Datei, kein manuelles Mapping)
- [x] SEC Dividend Service (Quarterly, Annual, CAGR, Payout Ratios)
- [x] SEC-first Migration (alle Kennzahlen-Charts nutzen SEC als Primary, FMP Fallback)
- [x] Public API v1 Endpoints (Income Statement, Balance Sheet, Cash Flow, Dividends, KPIs)
- [x] API Dokumentation (/api-docs)
- [x] Operating KPIs aus 8-K (16 Unternehmen, inkl. Segment-Margen)
- [x] Operating KPIs Redesign (Area Charts, Expand-Modal, matched Styling)
- [x] SEC Data Lab Testseite (SEC vs FMP Vergleich)
- [x] SEC Dividend Lab Testseite
- [x] 20-F / 6-K Support (Foreign Private Issuers wie ASML, ARM, SHOP)

## In Progress
- [ ] Datenqualitaet: Stock-Split Adjustierung fuer historische Dividenden
- [ ] XBRL Quarterly-Daten (aktuell nur Annual in Kennzahlen-Charts)

## Next Up
- [ ] IFRS-Support (SAP, Unilever, NVO, Novo Nordisk) – zweites Concept-Mapping
- [ ] Company Profile Endpoint (/v1/company/{ticker}) – Name, Boerse, SIC, Adresse aus SEC
- [ ] Earnings Calendar aus SEC 8-K Filing-Dates
- [ ] Dividend Calendar mit Record/Payment Dates aus 8-K Press Releases
- [ ] Mehr Operating KPIs Unternehmen (aktuell 16, Ziel 50+)
- [ ] Guidance/Outlook aus 8-K Press Releases extrahieren

## Later
- [ ] News API – RSS Feed Aggregation + AI Summary + Asset-Matching (Ticker/ISIN)
- [ ] Public API Authentication (API Keys, Rate Limiting)
- [ ] API Pricing / Subscription Tiers
- [ ] DB-Caching fuer SEC Daten (Supabase/Postgres statt In-Memory)
- [ ] OpenAPI/Swagger Spec generieren
- [ ] SDK (TypeScript, Python)
- [ ] Webhook-Support (Benachrichtigung bei neuen Filings)
