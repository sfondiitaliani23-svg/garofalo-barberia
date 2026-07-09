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

-- Disponibilità: Mar-Sab per tutti i barbieri
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
  ('closure_banner', 'Chiusura', 'La barberia è chiusa la domenica e il lunedì.', FALSE);