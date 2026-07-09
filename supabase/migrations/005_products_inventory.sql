-- Inventario prodotti (profumi Mood, cosmetici, ecc.)

CREATE TYPE product_category AS ENUM ('perfume', 'cosmetic', 'accessory', 'other');

CREATE TABLE products (
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

CREATE INDEX idx_products_active ON products (is_active, sort_order);
CREATE INDEX idx_products_category ON products (category);
CREATE INDEX idx_products_stock ON products (stock_quantity);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_public_read" ON products FOR SELECT USING (
  is_active = TRUE OR is_admin()
);

CREATE POLICY "products_admin" ON products FOR ALL USING (is_admin());

-- Seed profumi Mood dalla homepage
INSERT INTO products (name, brand, category, sku, stock_quantity, min_stock_level, image_url, description, sort_order) VALUES
  ('Mood Velvet', 'Mood', 'perfume', 'MOOD-VELVET', 8, 2, '/assets/sostituisci-immagini/homepage/4-1.jpg', 'Eau De Parfum orientale floreale — brioso e sensuale.', 1),
  ('Fancy', 'Mood', 'perfume', 'MOOD-FANCY', 6, 2, '/assets/sostituisci-immagini/homepage/4-2.jpg', 'Fruttata e agrumata, rigogliosa e brillante.', 2),
  ('Mood Imperious', 'Mood', 'perfume', 'MOOD-IMPERIOUS', 5, 2, '/assets/sostituisci-immagini/homepage/4-3.jpg', 'Fruttato e legnoso, vibrante e intrepido.', 3),
  ('Aroma', 'Mood', 'perfume', 'MOOD-AROMA', 7, 2, '/assets/sostituisci-immagini/homepage/4-4.jpg', 'Floreale e orientale, accattivante e intenso.', 4);