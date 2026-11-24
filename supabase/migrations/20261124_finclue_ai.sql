-- Finclue AI: Verlauf, Fragenlimit und Antwort-Zwischenspeicher
--   ai_threads       ein Gespräch je Zeile
--   ai_messages      Fragen und fertige Antworten (Text + Grafiken, Quellen, Prüfung)
--   ai_usage         eine Zeile je gestellter Frage: Zählung fürs Limit und Kosten
--   ai_answer_cache  Antworten auf allgemeine Fragen, für alle Nutzer gleich
-- Geschrieben wird nur über den Server (service_role). Nutzer lesen und löschen
-- ausschließlich ihr eigenes.

CREATE TABLE IF NOT EXISTS ai_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_threads_user ON ai_threads(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES ai_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  payload jsonb,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_messages_thread ON ai_messages(thread_id, created_at);

CREATE TABLE IF NOT EXISTS ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- wie viele Fragen diese Antwort zählt (0 = aus dem Zwischenspeicher oder fehlgeschlagen)
  charged smallint NOT NULL,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'done', 'failed', 'cached')),
  model text,
  input_tokens integer,
  output_tokens integer,
  cache_read_tokens integer,
  cache_write_tokens integer,
  web_searches smallint,
  cost_usd numeric(10, 6),
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_answer_cache (
  key text PRIMARY KEY,
  model text NOT NULL,
  content text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

ALTER TABLE ai_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_answer_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_threads_select_own ON ai_threads FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY ai_threads_delete_own ON ai_threads FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY ai_messages_select_own ON ai_messages FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY ai_usage_select_own ON ai_usage FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON ai_threads, ai_messages, ai_usage, ai_answer_cache FROM anon, authenticated;
GRANT SELECT, DELETE ON ai_threads TO authenticated;
GRANT SELECT ON ai_messages, ai_usage TO authenticated;
GRANT ALL ON ai_threads, ai_messages, ai_usage, ai_answer_cache TO service_role;

-- Frage reservieren: zählt und bucht in einem Schritt, damit parallele Anfragen
-- das Limit nicht unterlaufen. Gibt die Buchungs-ID zurück oder NULL (Limit erreicht).
-- p_since = Beginn des Zeitraums, NULL = insgesamt (kostenlose Testfragen).
CREATE OR REPLACE FUNCTION ai_reserve_question(p_user uuid, p_charge smallint, p_limit integer, p_since timestamptz)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  used integer;
  new_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('ai_usage:' || p_user::text, 0));

  SELECT COALESCE(SUM(charged), 0) INTO used
  FROM ai_usage
  WHERE user_id = p_user
    AND (p_since IS NULL OR created_at >= p_since)
    -- hängen gebliebene Reservierungen zählen nach 10 Minuten nicht mehr
    AND NOT (status = 'reserved' AND created_at < now() - interval '10 minutes');

  IF used + p_charge > p_limit THEN
    RETURN NULL;
  END IF;

  INSERT INTO ai_usage (user_id, charged) VALUES (p_user, p_charge) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION ai_reserve_question(uuid, smallint, integer, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ai_reserve_question(uuid, smallint, integer, timestamptz) TO service_role;
