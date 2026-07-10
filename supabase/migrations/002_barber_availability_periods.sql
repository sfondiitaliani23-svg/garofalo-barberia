-- Fasce mattutina e pomeridiana per ogni giorno lavorativo
ALTER TABLE barber_availability
  ADD COLUMN IF NOT EXISTS period TEXT NOT NULL DEFAULT 'morning'
  CHECK (period IN ('morning', 'afternoon'));

ALTER TABLE barber_availability
  DROP CONSTRAINT IF EXISTS barber_availability_barber_id_day_of_week_key;

UPDATE barber_availability
SET
  start_time = '09:00',
  end_time = '13:00',
  period = 'morning'
WHERE period IS NULL OR period = 'morning';

INSERT INTO barber_availability (barber_id, day_of_week, start_time, end_time, is_available, period)
SELECT
  barber_id,
  day_of_week,
  '14:00'::time,
  CASE WHEN day_of_week = 6 THEN '18:00'::time ELSE '19:30'::time END,
  is_available,
  'afternoon'
FROM barber_availability
WHERE period = 'morning'
  AND NOT EXISTS (
    SELECT 1
    FROM barber_availability afternoon
    WHERE afternoon.barber_id = barber_availability.barber_id
      AND afternoon.day_of_week = barber_availability.day_of_week
      AND afternoon.period = 'afternoon'
  );

CREATE UNIQUE INDEX IF NOT EXISTS barber_availability_barber_day_period_key
  ON barber_availability (barber_id, day_of_week, period);