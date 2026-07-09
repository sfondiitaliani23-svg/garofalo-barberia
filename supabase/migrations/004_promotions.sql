-- Promozioni e sconti

CREATE TYPE discount_type AS ENUM ('percent', 'fixed');

CREATE TABLE promotions (
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

CREATE INDEX idx_promotions_active ON promotions (is_active, starts_at, ends_at);
CREATE INDEX idx_promotions_code ON promotions (code) WHERE code IS NOT NULL;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES promotions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_cents INT NOT NULL DEFAULT 0;

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promotions_public_read" ON promotions FOR SELECT USING (
  is_active = TRUE
  AND (starts_at IS NULL OR starts_at <= NOW())
  AND (ends_at IS NULL OR ends_at >= NOW())
);

CREATE POLICY "promotions_admin" ON promotions FOR ALL USING (is_admin());