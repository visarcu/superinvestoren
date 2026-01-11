-- Migration: Add broker fields to portfolios table
-- Date: 2026-01-11
-- Description: Enables multi-depot/broker functionality for premium users

-- Add broker_type enum type
DO $$ BEGIN
    CREATE TYPE broker_type AS ENUM (
        'manual',
        'trade_republic',
        'scalable_capital',
        'ing',
        'comdirect',
        'interactive_brokers',
        'andere'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to portfolios table
ALTER TABLE portfolios
ADD COLUMN IF NOT EXISTS broker_type broker_type DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS broker_name varchar(100),
ADD COLUMN IF NOT EXISTS broker_color varchar(7);

-- Update existing portfolios to have manual broker type
UPDATE portfolios
SET broker_type = 'manual'
WHERE broker_type IS NULL;

-- Add index for faster queries by user and broker
CREATE INDEX IF NOT EXISTS idx_portfolios_user_broker
ON portfolios(user_id, broker_type);

-- Add comment for documentation
COMMENT ON COLUMN portfolios.broker_type IS 'Type of broker/depot (trade_republic, scalable_capital, etc.)';
COMMENT ON COLUMN portfolios.broker_name IS 'Custom broker name when broker_type is "andere"';
COMMENT ON COLUMN portfolios.broker_color IS 'Custom hex color for UI distinction (e.g. #FF6200)';
