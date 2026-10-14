-- Sicurezza: la tabella del login con QR contiene i codici di accesso (token) degli utenti.
-- Prima chiunque, anche senza account, poteva leggerla e modificarla. Ora NESSUNO dal browser:
-- il sito la usa solo dal server (chiave di servizio), che non passa dalle regole RLS.
DROP POLICY IF EXISTS "Allow anonymous inserts" ON qr_login_sessions;
DROP POLICY IF EXISTS "Allow anyone to read status" ON qr_login_sessions;
DROP POLICY IF EXISTS "Allow anyone to update" ON qr_login_sessions;
REVOKE ALL ON qr_login_sessions FROM anon, authenticated;
-- Pulizia: cancella tutte le sessioni QR esistenti (contengono token vecchi).
DELETE FROM qr_login_sessions;
