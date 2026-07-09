-- Garofalo Barberia â€” Schema iniziale

CREATE TYPE user_role AS ENUM ('customer', 'admin');
CREATE TYPE appointment_status AS ENUM ('confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE photo_type AS ENUM ('before', 'after');
CREATE TYPE service_category AS ENUM ('taglio', 'barba', 'styling', 'baby');

-- Profili (estende auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'customer',
  full_name TEXT,
  phone TEXT,
  email TEXT,
  hair_preferences TEXT,
  personal_notes TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Barbieri
CREATE TABLE barbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Barbiere professionista',
  image_url TEXT,
  bio TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Servizi
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category service_category NOT NULL,
  price_cents INT NOT NULL,
  duration_minutes INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DisponibilitÃ  settimanale barbiere
CREATE TABLE barber_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (barber_id, day_of_week)
);

-- Assenze / chiusure puntuali
CREATE TABLE barber_time_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Appuntamenti
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  barber_id UUID NOT NULL REFERENCES barbers(id),
  service_id UUID NOT NULL REFERENCES services(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status appointment_status NOT NULL DEFAULT 'confirmed',
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

-- Foto prima/dopo
CREATE TABLE appointment_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  photo_type photo_type NOT NULL,
  storage_path TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contenuti sito (banner, annunci)
CREATE TABLE site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT,
  body TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_appointments_barber_starts ON appointments (barber_id, starts_at) WHERE status = 'confirmed';
CREATE INDEX idx_appointments_customer ON appointments (customer_id);
CREATE INDEX idx_appointments_starts_at ON appointments (starts_at);

-- Anti-sovrapposizione con EXCLUDE constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE appointments ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    barber_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status = 'confirmed');

-- Trigger: crea profilo al signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_role public.user_role := 'customer';
  meta_role TEXT;
BEGIN
  meta_role := NEW.raw_user_meta_data->>'role';
  IF meta_role IN ('customer', 'admin') THEN
    resolved_role := meta_role::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), ''),
    resolved_role
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- Helper: Ã¨ admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles policies
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin());
CREATE POLICY "profiles_admin_all" ON profiles FOR ALL USING (is_admin());

-- Barbers & services: pubblico legge attivi
CREATE POLICY "barbers_public_read" ON barbers FOR SELECT USING (is_active = TRUE OR is_admin());
CREATE POLICY "barbers_admin" ON barbers FOR ALL USING (is_admin());
CREATE POLICY "services_public_read" ON services FOR SELECT USING (is_active = TRUE OR is_admin());
CREATE POLICY "services_admin" ON services FOR ALL USING (is_admin());

-- Availability
CREATE POLICY "availability_public_read" ON barber_availability FOR SELECT USING (TRUE);
CREATE POLICY "availability_admin" ON barber_availability FOR ALL USING (is_admin());

-- Time off
CREATE POLICY "timeoff_public_read" ON barber_time_off FOR SELECT USING (TRUE);
CREATE POLICY "timeoff_admin" ON barber_time_off FOR ALL USING (is_admin());

-- Appointments
CREATE POLICY "appointments_insert_public" ON appointments FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "appointments_select_own" ON appointments FOR SELECT USING (
  customer_id = auth.uid() OR is_admin()
);
CREATE POLICY "appointments_admin" ON appointments FOR ALL USING (is_admin());
CREATE POLICY "appointments_cancel_own" ON appointments FOR UPDATE USING (
  customer_id = auth.uid() OR is_admin()
);

-- Photos
CREATE POLICY "photos_select_own" ON appointment_photos FOR SELECT USING (
  customer_id = auth.uid() OR is_admin()
);
CREATE POLICY "photos_admin" ON appointment_photos FOR ALL USING (is_admin());

-- Site content
CREATE POLICY "content_public_read" ON site_content FOR SELECT USING (is_active = TRUE OR is_admin());
CREATE POLICY "content_admin" ON site_content FOR ALL USING (is_admin());

-- Analytics visitatori
CREATE TYPE visitor_gender AS ENUM ('male', 'female', 'other', 'unknown');
CREATE TYPE visitor_age_range AS ENUM (
  'under_18', '18_24', '25_34', '35_44', '45_54', '55_plus', 'unknown'
);

CREATE TABLE visitor_sessions (
  id UUID PRIMARY KEY,
  gender visitor_gender NOT NULL DEFAULT 'unknown',
  age_range visitor_age_range NOT NULL DEFAULT 'unknown',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT,
  referrer TEXT
);

CREATE TABLE page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES visitor_sessions(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_page_views_viewed_at ON page_views (viewed_at);
CREATE INDEX idx_page_views_session ON page_views (session_id);
CREATE INDEX idx_visitor_sessions_last_seen ON visitor_sessions (last_seen_at);

ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_admin_read_sessions" ON visitor_sessions
  FOR SELECT USING (is_admin());
CREATE POLICY "analytics_admin_read_views" ON page_views
  FOR SELECT USING (is_admin());

-- Seed barbieri
INSERT INTO barbers (name, role, image_url, sort_order) VALUES
  ('Luigi Garofalo', 'Titolare · Barbiere professionista', '/assets/sostituisci-immagini/team/luigi-garofalo.png', 1),
  ('Vittorio Morlino', 'Barbiere professionista', '/assets/sostituisci-immagini/team/vittorio-morlino.png', 2),
  ('Francesco Costantino', 'Barbiere professionista', '/assets/sostituisci-immagini/team/francesco-costantino.png', 3);

-- Seed servizi
INSERT INTO services (name, category, price_cents, duration_minutes, sort_order) VALUES
  ('Taglio e shampoo', 'taglio', 1700, 30, 1),
  ('Taglio baby', 'baby', 1300, 25, 2),
  ('Barba rasata / lama', 'barba', 600, 15, 3),
  ('Barba modellata a forbici', 'barba', 800, 20, 4),
  ('Barba con panno caldo', 'barba', 1000, 25, 5),
  ('Shampoo e acconciatura', 'styling', 800, 15, 6);

-- DisponibilitÃ : Mar-Sab per tutti i barbieri
-- 0=Dom, 1=Lun chiuso, 2=Mar, 3=Mer, 4=Gio, 5=Ven, 6=Sab
INSERT INTO barber_availability (barber_id, day_of_week, start_time, end_time)
SELECT b.id, d.day, d.start_t::time, d.end_t::time
FROM barbers b
CROSS JOIN (VALUES
  (2, '09:00', '19:30'),
  (3, '09:00', '19:30'),
  (4, '09:00', '19:30'),
  (5, '09:00', '19:30'),
  (6, '09:00', '18:00')
) AS d(day, start_t, end_t);

INSERT INTO site_content (key, title, body, is_active) VALUES
  ('closure_banner', 'Chiusura', 'La barberia Ã¨ chiusa la domenica e il lunedÃ¬.', FALSE);
