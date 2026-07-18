-- Tabella per ospitare le recensioni dei clienti
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  authorized_by_customer BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Abilita RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policy per consentire gli inserimenti anonimi (chiunque può compilare il modulo recensioni)
DROP POLICY IF EXISTS "Allow anonymous inserts" ON reviews;
CREATE POLICY "Allow anonymous inserts" ON reviews
  FOR INSERT WITH CHECK (true);

-- Policy per consentire la lettura pubblica solo delle recensioni autorizzate dai clienti
DROP POLICY IF EXISTS "Allow anyone to read authorized reviews" ON reviews;
CREATE POLICY "Allow anyone to read authorized reviews" ON reviews
  FOR SELECT USING (authorized_by_customer = true);

-- Popola la tabella con le recensioni iniziali esistenti se è vuota
INSERT INTO reviews (customer_name, rating, comment, authorized_by_customer)
SELECT 'Marco R.', 5, 'Finalmente una barberia vera. Professionali, amichevoli e il prezzo è giusto. Torno sempre lì.', true
WHERE NOT EXISTS (SELECT 1 FROM reviews LIMIT 1);

INSERT INTO reviews (customer_name, rating, comment, authorized_by_customer)
SELECT 'Francesca M.', 5, 'Porto mio figlio di 5 anni da tre anni. Non ha paura, ambiente tranquillo. Consiglio vivamente.', true
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE customer_name = 'Francesca M.');

INSERT INTO reviews (customer_name, rating, comment, authorized_by_customer)
SELECT 'Giuseppe T.', 5, 'Tagli precisi, rapidi e affidabili. Perfetto per chi ha poco tempo ma non vuole scendere a compromessi.', true
WHERE NOT EXISTS (SELECT 1 FROM reviews WHERE customer_name = 'Giuseppe T.');
