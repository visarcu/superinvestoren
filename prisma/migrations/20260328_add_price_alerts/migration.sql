CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('above', 'below')),
  target_price DECIMAL(10,2) NOT NULL,
  current_price DECIMAL(10,2),
  triggered BOOLEAN DEFAULT FALSE,
  triggered_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(active, triggered);
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own alerts" ON price_alerts FOR ALL USING (auth.uid() = user_id);
