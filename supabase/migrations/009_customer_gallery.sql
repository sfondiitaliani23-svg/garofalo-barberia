-- Tabella per la galleria fotografica del singolo cliente
CREATE TABLE IF NOT EXISTS customer_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS (Row Level Security) per la tabella
ALTER TABLE customer_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Lettura: gli admin vedono tutto, i clienti vedono solo le loro foto
CREATE POLICY select_customer_photos ON customer_photos
  FOR SELECT
  USING (
    auth.uid() = customer_id 
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Scrittura: solo gli admin possono fare inserimenti, modifiche ed eliminazioni
CREATE POLICY write_customer_photos ON customer_photos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
