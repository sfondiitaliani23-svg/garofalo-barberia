-- Storie (mix tra Wrapped e storie di Instagram).
-- Admin, dipendenti e tester caricano foto, video, testi e numeri, in ordine per giorno.
-- Il sito pubblico legge solo le storie attive oggi. Le modifiche passano dal server (chiave di servizio).

CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('foto', 'video', 'testo', 'numero')),
  title TEXT,
  body TEXT,
  title_en TEXT,
  body_en TEXT,
  big_number TEXT,
  media_path TEXT,
  cta_label TEXT,
  cta_label_en TEXT,
  cta_href TEXT,
  starts_on DATE NOT NULL DEFAULT CURRENT_DATE,
  ends_on DATE,
  sort_order INT NOT NULL DEFAULT 0,
  has_release BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_on IS NULL OR ends_on >= starts_on),
  CHECK (cta_href IS NULL OR cta_href ~ '^(/|https://)')
);

CREATE INDEX IF NOT EXISTS stories_days ON stories (starts_on, ends_on, sort_order);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Lettura pubblica: solo le storie attive oggi (ora di Roma).
DROP POLICY IF EXISTS "stories_public_live" ON stories;
CREATE POLICY "stories_public_live" ON stories FOR SELECT USING (
  starts_on <= (NOW() AT TIME ZONE 'Europe/Rome')::date
  AND (ends_on IS NULL OR ends_on >= (NOW() AT TIME ZONE 'Europe/Rome')::date)
);

-- Spazio per foto e video: pubblico in lettura, 20 MB al massimo, solo immagini e video.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'storie',
  'storie',
  TRUE,
  20971520,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
