-- Lista d'attesa: il cliente lascia i suoi dati per un giorno al completo
-- e riceve una email quando si libera un posto (dopo una disdetta).
-- Accesso solo dal server (chiave di servizio): nessuna regola pubblica.

CREATE TABLE IF NOT EXISTS waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  desired_date DATE NOT NULL,
  barber_id UUID REFERENCES barbers(id) ON DELETE SET NULL,
  service_ids UUID[] NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified')),
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Una sola richiesta in attesa per email e giorno (evita doppioni e abusi).
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_one_waiting_per_email_day
  ON waitlist_entries (lower(customer_email), desired_date)
  WHERE status = 'waiting';

CREATE INDEX IF NOT EXISTS waitlist_date_status ON waitlist_entries (desired_date, status);

ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

-- Solo gli admin possono leggere/modificare dal pannello; i clienti passano dal server.
CREATE POLICY "waitlist_admin_all" ON waitlist_entries FOR ALL USING (is_admin());
