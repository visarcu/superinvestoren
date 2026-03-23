-- Tabelle für Push Notification Device Tokens
-- Ausführen im Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index für schnelle User-Abfragen
CREATE INDEX IF NOT EXISTS device_tokens_user_id_idx ON device_tokens(user_id);

-- RLS aktivieren
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- User darf nur eigene Tokens lesen/schreiben
CREATE POLICY "Users can manage own device tokens"
  ON device_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service Role darf alle Tokens lesen (für Push Notifications senden)
CREATE POLICY "Service role can read all device tokens"
  ON device_tokens
  FOR SELECT
  USING (auth.role() = 'service_role');
