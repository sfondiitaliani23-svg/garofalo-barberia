-- Esegui in Supabase → SQL Editor (tutte le migration pendenti in un colpo solo)
-- Idempotente: puoi rieseguire senza errori se qualcosa esiste già

-- ========== 003 appointment_reminders ==========
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS reminder_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_whatsapp_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_appointments_reminder_pending
  ON appointments (starts_at)
  WHERE status = 'confirmed'
    AND (reminder_email_sent_at IS NULL OR reminder_whatsapp_sent_at IS NULL);

-- ========== 004 promotions ==========
DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('percent', 'fixed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  code TEXT UNIQUE,
  discount_type discount_type NOT NULL DEFAULT 'percent',
  discount_value INT NOT NULL CHECK (discount_value > 0),
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    discount_type <> 'percent' OR (discount_value >= 1 AND discount_value <= 100)
  )
);

CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions (is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions (code) WHERE code IS NOT NULL;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES promotions(id) ON DELETE SET NULL;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS discount_cents INT NOT NULL DEFAULT 0;

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "promotions_public_read" ON promotions FOR SELECT USING (
    is_active = TRUE
    AND (starts_at IS NULL OR starts_at <= NOW())
    AND (ends_at IS NULL OR ends_at >= NOW())
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "promotions_admin" ON promotions FOR ALL USING (is_admin());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ========== 005 products_inventory ==========
DO $$ BEGIN
  CREATE TYPE product_category AS ENUM ('perfume', 'cosmetic', 'accessory', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  category product_category NOT NULL DEFAULT 'perfume',
  sku TEXT UNIQUE,
  stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  min_stock_level INT NOT NULL DEFAULT 2 CHECK (min_stock_level >= 0),
  price_cents INT CHECK (price_cents IS NULL OR price_cents >= 0),
  image_url TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_active ON products (is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products (stock_quantity);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "products_public_read" ON products FOR SELECT USING (
    is_active = TRUE OR is_admin()
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "products_admin" ON products FOR ALL USING (is_admin());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO products (name, brand, category, sku, stock_quantity, min_stock_level, image_url, description, sort_order) VALUES
  ('Mood Velvet', 'Mood', 'perfume', 'MOOD-VELVET', 8, 2, '/assets/sostituisci-immagini/homepage/4-1.jpg', 'Eau De Parfum orientale floreale - brioso e sensuale.', 1),
  ('Fancy', 'Mood', 'perfume', 'MOOD-FANCY', 6, 2, '/assets/sostituisci-immagini/homepage/4-2.jpg', 'Fruttata e agrumata, rigogliosa e brillante.', 2),
  ('Mood Imperious', 'Mood', 'perfume', 'MOOD-IMPERIOUS', 5, 2, '/assets/sostituisci-immagini/homepage/4-3.jpg', 'Fruttato e legnoso, vibrante e intrepido.', 3),
  ('Aroma', 'Mood', 'perfume', 'MOOD-AROMA', 7, 2, '/assets/sostituisci-immagini/homepage/4-4.jpg', 'Floreale e orientale, accattivante e intenso.', 4)
ON CONFLICT (sku) DO NOTHING;