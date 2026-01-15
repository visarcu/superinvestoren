-- Migration: Add earnings notification fields to notification_settings
-- Date: 2026-01-15
-- Description: Adds earnings email notifications and configurable timing

-- Add new columns for earnings notifications
ALTER TABLE notification_settings
ADD COLUMN IF NOT EXISTS earnings_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS earnings_email_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS earnings_days_before INTEGER DEFAULT 3;

-- Add check constraint for valid days_before values
ALTER TABLE notification_settings
ADD CONSTRAINT check_earnings_days_before
CHECK (earnings_days_before IN (1, 2, 3, 5, 7));

-- Comment on new columns
COMMENT ON COLUMN notification_settings.earnings_enabled IS 'Enable in-app earnings notifications';
COMMENT ON COLUMN notification_settings.earnings_email_enabled IS 'Enable email notifications for upcoming earnings';
COMMENT ON COLUMN notification_settings.earnings_days_before IS 'Days before earnings to send notification (1, 2, 3, 5, or 7)';

-- Update existing rows to have defaults
UPDATE notification_settings
SET
  earnings_enabled = COALESCE(earnings_enabled, true),
  earnings_email_enabled = COALESCE(earnings_email_enabled, false),
  earnings_days_before = COALESCE(earnings_days_before, 3)
WHERE earnings_enabled IS NULL
   OR earnings_email_enabled IS NULL
   OR earnings_days_before IS NULL;
