-- Kursreaktion auf Quartalszahlen im Earnings-Kalender
--   reaction_pct         Kursveränderung am Reaktionstag in % (vor Börse: Vortag → Tag,
--                        nach Börse: Tag → Folgetag, ohne Uhrzeit: der größere der beiden)
--   reaction_checked_at  wann die Reaktion berechnet wurde (auch wenn keine Kurse da waren)
--   typical_move_pct     Ø absolute Reaktion der bis zu 8 vorherigen Termine (mind. 4)
--   typical_move_count   auf wie vielen Terminen der Durchschnitt beruht
ALTER TABLE "SecEarningsCalendar"
  ADD COLUMN IF NOT EXISTS reaction_pct double precision,
  ADD COLUMN IF NOT EXISTS reaction_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS typical_move_pct double precision,
  ADD COLUMN IF NOT EXISTS typical_move_count smallint;
