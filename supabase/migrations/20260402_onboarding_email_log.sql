-- Migration: onboarding_email_log
-- Tracks which onboarding emails have been sent to each user

CREATE TABLE IF NOT EXISTS onboarding_email_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  step INTEGER NOT NULL,         -- 0=Day0, 1=Day2, 2=Day5, 3=Day10
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, step)
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_onboarding_email_log_user_id ON onboarding_email_log (user_id);

-- Explicit permissions needed for service_role (not granted automatically for raw SQL tables)
GRANT ALL ON TABLE onboarding_email_log TO service_role;
GRANT ALL ON TABLE onboarding_email_log TO authenticated;
