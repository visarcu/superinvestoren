-- Add analyst_ratings_enabled toggle to notification_settings
ALTER TABLE notification_settings
ADD COLUMN IF NOT EXISTS analyst_ratings_enabled BOOLEAN DEFAULT TRUE;

-- Table for deduplication: tracks which analyst actions have already triggered notifications
-- Keyed globally (not per user) to avoid redundant FMP calls
CREATE TABLE IF NOT EXISTS analyst_actions_seen (
  action_key TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  grading_company TEXT,
  action_type TEXT,
  new_grade TEXT,
  previous_grade TEXT,
  published_date TEXT,
  notified_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyst_actions_symbol ON analyst_actions_seen(symbol);
CREATE INDEX IF NOT EXISTS idx_analyst_actions_notified ON analyst_actions_seen(notified_at);
