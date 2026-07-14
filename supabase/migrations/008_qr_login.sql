-- Tabella per tracciare le sessioni di login tramite QR Code
CREATE TABLE IF NOT EXISTS qr_login_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scanned', 'authenticated', 'expired')),
  access_token TEXT,
  refresh_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes')
);

-- Abilita Row Level Security
ALTER TABLE qr_login_sessions ENABLE ROW LEVEL SECURITY;

-- Criteri RLS per il flusso anonimo sicuro
DROP POLICY IF EXISTS "Allow anonymous inserts" ON qr_login_sessions;
CREATE POLICY "Allow anonymous inserts" ON qr_login_sessions
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anyone to read status" ON qr_login_sessions;
CREATE POLICY "Allow anyone to read status" ON qr_login_sessions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anyone to update" ON qr_login_sessions;
CREATE POLICY "Allow anyone to update" ON qr_login_sessions
  FOR UPDATE USING (true);
