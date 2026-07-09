-- Promemoria clienti 6 ore prima dell'appuntamento

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS reminder_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_whatsapp_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_appointments_reminder_pending
  ON appointments (starts_at)
  WHERE status = 'confirmed'
    AND (reminder_email_sent_at IS NULL OR reminder_whatsapp_sent_at IS NULL);