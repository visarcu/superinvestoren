-- Safe Migration: Add currency fields to existing portfolio system
-- This migration is safe to run multiple times (IF NOT EXISTS checks)

-- First, ensure base tables exist (create if not exists)
CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    cash_position DECIMAL(15,4) DEFAULT 0,
    is_default BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    quantity DECIMAL(15,6) NOT NULL,
    purchase_price DECIMAL(15,4) NOT NULL, -- Original USD price from FMP
    purchase_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new currency-aware fields to portfolio_holdings
-- These are the key fields for correct currency handling

-- Original purchase currency (EUR, USD, etc.)
ALTER TABLE portfolio_holdings 
ADD COLUMN IF NOT EXISTS purchase_currency VARCHAR(3) DEFAULT 'USD';

-- Exchange rate used at purchase (EUR/USD rate or 1.0 for USD)
ALTER TABLE portfolio_holdings 
ADD COLUMN IF NOT EXISTS purchase_exchange_rate DECIMAL(10,6) DEFAULT 1.0;

-- Original purchase price in purchase_currency before conversion
ALTER TABLE portfolio_holdings 
ADD COLUMN IF NOT EXISTS purchase_price_original DECIMAL(15,4);

-- Metadata for tracking
ALTER TABLE portfolio_holdings 
ADD COLUMN IF NOT EXISTS currency_metadata JSONB;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_portfolio_id ON portfolio_holdings(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_symbol ON portfolio_holdings(symbol);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_currency ON portfolio_holdings(purchase_currency);
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);

-- Update existing records to have proper defaults
-- Assumption: existing purchase_price values are already in USD
UPDATE portfolio_holdings 
SET 
    purchase_currency = 'USD',
    purchase_exchange_rate = 1.0,
    purchase_price_original = purchase_price,
    currency_metadata = '{"migration": "2025-01-09", "assumed_usd": true}'::jsonb
WHERE purchase_currency IS NULL;

-- Add comment explaining the currency system
COMMENT ON COLUMN portfolio_holdings.purchase_price IS 'Always stored in USD for consistency';
COMMENT ON COLUMN portfolio_holdings.purchase_price_original IS 'Original price in purchase_currency before conversion';
COMMENT ON COLUMN portfolio_holdings.purchase_exchange_rate IS 'Historical USD/[currency] rate used for conversion';
COMMENT ON COLUMN portfolio_holdings.currency_metadata IS 'Additional currency conversion metadata';

-- Add constraints
ALTER TABLE portfolio_holdings 
ADD CONSTRAINT IF NOT EXISTS check_positive_price 
CHECK (purchase_price > 0 AND (purchase_price_original IS NULL OR purchase_price_original > 0));

ALTER TABLE portfolio_holdings 
ADD CONSTRAINT IF NOT EXISTS check_positive_quantity 
CHECK (quantity > 0);

ALTER TABLE portfolio_holdings 
ADD CONSTRAINT IF NOT EXISTS check_valid_currency 
CHECK (purchase_currency IN ('USD', 'EUR', 'GBP', 'CHF', 'CAD'));

-- ================================
-- SUPABASE RLS POLICIES (WICHTIG!)
-- ================================

-- Enable RLS on both tables
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe to run multiple times)
DROP POLICY IF EXISTS "Users can view own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can insert own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can update own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can delete own portfolios" ON portfolios;

DROP POLICY IF EXISTS "Users can view own holdings" ON portfolio_holdings;
DROP POLICY IF EXISTS "Users can insert own holdings" ON portfolio_holdings;
DROP POLICY IF EXISTS "Users can update own holdings" ON portfolio_holdings;
DROP POLICY IF EXISTS "Users can delete own holdings" ON portfolio_holdings;

-- PORTFOLIOS POLICIES
CREATE POLICY "Users can view own portfolios" ON portfolios
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own portfolios" ON portfolios
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolios" ON portfolios
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolios" ON portfolios
    FOR DELETE USING (auth.uid() = user_id);

-- PORTFOLIO_HOLDINGS POLICIES
CREATE POLICY "Users can view own holdings" ON portfolio_holdings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM portfolios 
            WHERE portfolios.id = portfolio_holdings.portfolio_id 
            AND portfolios.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own holdings" ON portfolio_holdings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM portfolios 
            WHERE portfolios.id = portfolio_holdings.portfolio_id 
            AND portfolios.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own holdings" ON portfolio_holdings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM portfolios 
            WHERE portfolios.id = portfolio_holdings.portfolio_id 
            AND portfolios.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own holdings" ON portfolio_holdings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM portfolios 
            WHERE portfolios.id = portfolio_holdings.portfolio_id 
            AND portfolios.user_id = auth.uid()
        )
    );

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON portfolios TO authenticated;
GRANT ALL ON portfolio_holdings TO authenticated;

-- Ensure UUID generation works
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT EXECUTE ON FUNCTION extensions.gen_random_uuid() TO authenticated;