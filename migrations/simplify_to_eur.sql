-- Migration: Vereinfachung auf EUR-only Portfolio System
--
-- NEUES SYSTEM:
-- - Alle Preise werden direkt in EUR gespeichert (keine Konvertierung beim Speichern)
-- - Aktuelle Kurse (USD von API) werden nur 1x in EUR konvertiert für die Anzeige
-- - Keine _display, _original Felder mehr
-- - Cash in EUR → direkt in EUR gespeichert
--
-- WICHTIG: Diese Migration muss manuell in Supabase ausgeführt werden

-- =====================================================
-- SCHRITT 1: Bestehende Daten nach EUR konvertieren
-- =====================================================

-- Aktuellen EUR/USD Kurs für die Migration (anpassen falls nötig!)
-- Stand: ca. 1 USD = 0.92 EUR (Dezember 2024)
DO $$
DECLARE
    migration_rate DECIMAL(10,6) := 0.92;
BEGIN
    -- Update existing holdings: Konvertiere purchase_price von USD nach EUR
    -- Nur wenn die Daten noch im alten Format sind (purchase_currency = 'USD')
    UPDATE portfolio_holdings
    SET
        purchase_price = CASE
            WHEN purchase_currency = 'USD' OR purchase_currency IS NULL
            THEN purchase_price * migration_rate
            ELSE COALESCE(purchase_price_original, purchase_price)
        END,
        purchase_currency = 'EUR'
    WHERE purchase_currency != 'EUR' OR purchase_currency IS NULL;

    RAISE NOTICE 'Migrated holdings to EUR';
END $$;

-- =====================================================
-- SCHRITT 2: Unnötige Spalten entfernen (optional)
-- =====================================================
-- Diese Spalten werden nicht mehr benötigt, können aber beibehalten werden für Audit

-- Option A: Soft-delete (umbenennen für spätere Referenz)
ALTER TABLE portfolio_holdings
RENAME COLUMN purchase_price_original TO _deprecated_purchase_price_original;

ALTER TABLE portfolio_holdings
RENAME COLUMN purchase_exchange_rate TO _deprecated_purchase_exchange_rate;

ALTER TABLE portfolio_holdings
RENAME COLUMN currency_metadata TO _deprecated_currency_metadata;

-- Option B: Hard-delete (nach Backup!)
-- ALTER TABLE portfolio_holdings DROP COLUMN IF EXISTS purchase_price_original;
-- ALTER TABLE portfolio_holdings DROP COLUMN IF EXISTS purchase_exchange_rate;
-- ALTER TABLE portfolio_holdings DROP COLUMN IF EXISTS currency_metadata;

-- =====================================================
-- SCHRITT 3: Spaltenkommentare aktualisieren
-- =====================================================

COMMENT ON COLUMN portfolio_holdings.purchase_price IS 'Kaufpreis in EUR - direkt vom User eingegeben';
COMMENT ON COLUMN portfolio_holdings.purchase_currency IS 'Immer EUR für deutsche User';

-- =====================================================
-- SCHRITT 4: Constraint aktualisieren
-- =====================================================

-- Alten Constraint entfernen falls vorhanden
ALTER TABLE portfolio_holdings
DROP CONSTRAINT IF EXISTS check_valid_currency;

-- Neuen Constraint: Nur EUR erlaubt
ALTER TABLE portfolio_holdings
ADD CONSTRAINT check_valid_currency
CHECK (purchase_currency = 'EUR');

-- =====================================================
-- VERIFICATION QUERY - Nach Migration ausführen
-- =====================================================

-- SELECT
--     id,
--     symbol,
--     purchase_price,
--     purchase_currency,
--     quantity,
--     purchase_date
-- FROM portfolio_holdings
-- ORDER BY purchase_date DESC
-- LIMIT 10;
