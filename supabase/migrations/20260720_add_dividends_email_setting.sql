-- Opt-out für die wöchentliche Dividenden-E-Mail
-- Default true: Premium-User erhalten die Mail, können sie aber in den Einstellungen deaktivieren
ALTER TABLE notification_settings
  ADD COLUMN IF NOT EXISTS dividends_email_enabled boolean DEFAULT true;
