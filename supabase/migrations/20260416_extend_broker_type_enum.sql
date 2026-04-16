-- Migration: Broker-Type-Enum auf aktuellen Stand bringen
-- Datum: 2026-04-16
-- Beschreibung: Die ursprüngliche Migration (20260111_add_broker_fields_to_portfolios.sql)
-- hat nur 7 Broker enthalten. Seitdem wurden weitere Broker-Typen im TypeScript-Code
-- ergänzt (finanzen.net zero, Flatex, Smartbroker+, Freedom24, Trading 212). Ohne
-- diese Migration wirft Postgres beim Anlegen eines Depots z.B. mit Trading 212
-- den Fehler: "invalid input value for enum broker_type: 'trading212'".
--
-- Postgres-Eigenheit: ALTER TYPE ... ADD VALUE muss jedes Statement einzeln sein
-- (nicht in derselben Transaktion mehrfach). Jeder Wert ist idempotent via
-- "IF NOT EXISTS", sodass die Migration beliebig oft ausgeführt werden kann.

ALTER TYPE broker_type ADD VALUE IF NOT EXISTS 'finanzen_zero';
ALTER TYPE broker_type ADD VALUE IF NOT EXISTS 'flatex';
ALTER TYPE broker_type ADD VALUE IF NOT EXISTS 'smartbroker';
ALTER TYPE broker_type ADD VALUE IF NOT EXISTS 'freedom24';
ALTER TYPE broker_type ADD VALUE IF NOT EXISTS 'trading212';
