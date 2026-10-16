import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultPeriodsForDay,
  isDayOpen,
  isTimeWithinSchedule,
  scheduleToAvailabilityRows,
  buildBarberSchedule,
  getBarberRank,
  isBarberPubliclyBookable,
  isBarberAdminOnly,
} from '../lib/utils/barber-schedule.ts';

test('orari standard: martedì-venerdì', () => {
  const d = defaultPeriodsForDay(3);
  assert.deepEqual(d.morning, { enabled: true, startTime: '08:30', endTime: '13:00' });
  assert.deepEqual(d.afternoon, { enabled: true, startTime: '15:30', endTime: '20:30' });
});

test('orari standard: sabato 08:30-14:00 e 14:30-20:00', () => {
  const d = defaultPeriodsForDay(6);
  assert.deepEqual(d.morning, { enabled: true, startTime: '08:30', endTime: '14:00' });
  assert.deepEqual(d.afternoon, { enabled: true, startTime: '14:30', endTime: '20:00' });
});

test('sabato: le 13:30 sono aperte, la pausa 14:00-14:30 no', () => {
  const d = defaultPeriodsForDay(6);
  assert.equal(isTimeWithinSchedule(d, '13:30'), true);
  assert.equal(isTimeWithinSchedule(d, '14:00'), false);
  assert.equal(isTimeWithinSchedule(d, '14:15'), false);
  assert.equal(isTimeWithinSchedule(d, '14:30'), true);
});

test('prima dell\'apertura e dopo la chiusura non si prenota', () => {
  const d = defaultPeriodsForDay(3);
  assert.equal(isTimeWithinSchedule(d, '08:00'), false);
  assert.equal(isTimeWithinSchedule(d, '08:30'), true);
  assert.equal(isTimeWithinSchedule(d, '13:00'), false);
  assert.equal(isTimeWithinSchedule(d, '20:30'), false); // alla chiusura non si inizia
  assert.equal(isTimeWithinSchedule(d, '20:00'), true);
  assert.equal(isTimeWithinSchedule(d, '21:00'), false);
});

test('giorno chiuso quando mattina e pomeriggio sono spenti', () => {
  const d = defaultPeriodsForDay(3);
  assert.equal(isDayOpen(d), true);
  assert.equal(isDayOpen({ ...d, morning: { ...d.morning, enabled: false }, afternoon: { ...d.afternoon, enabled: false } }), false);
});

test('domenica e lunedì non producono righe di disponibilità', () => {
  const days = [0, 1, 2, 6].map((n) => defaultPeriodsForDay(n));
  const rows = scheduleToAvailabilityRows('b1', days);
  assert.deepEqual([...new Set(rows.map((r) => r.day_of_week))].sort(), [2, 6]);
  assert.equal(rows.length, 4);
});

test('orari scritti male tornano ai valori standard', () => {
  const d = defaultPeriodsForDay(3);
  const rows = scheduleToAvailabilityRows('b1', [{ ...d, morning: { enabled: true, startTime: 'abc', endTime: '' } }]);
  const morning = rows.find((r) => r.period === 'morning');
  assert.equal(morning.start_time, '08:30');
  assert.equal(morning.end_time, '13:00');
});

test('una fascia con inizio dopo la fine non è disponibile', () => {
  const d = defaultPeriodsForDay(3);
  const rows = scheduleToAvailabilityRows('b1', [{ ...d, morning: { enabled: true, startTime: '12:00', endTime: '10:00' } }]);
  assert.equal(rows.find((r) => r.period === 'morning').is_available, false);
});

test('buildBarberSchedule: giorno fisso chiuso e righe del barbiere giusto', () => {
  const weekDays = [{ value: 2, fixedClosed: false }, { value: 3, fixedClosed: true }];
  const availability = [
    { barber_id: 'b1', day_of_week: 2, period: 'morning', start_time: '09:00:00', end_time: '12:00:00', is_available: true },
    { barber_id: 'b2', day_of_week: 2, period: 'morning', start_time: '10:00:00', end_time: '11:00:00', is_available: true },
  ];
  const [tue, wed] = buildBarberSchedule('b1', availability, weekDays);
  assert.deepEqual(tue.morning, { enabled: true, startTime: '09:00', endTime: '12:00' });
  assert.equal(tue.afternoon.enabled, false);
  assert.equal(isDayOpen(wed), false);
});

test('ordine dei barbieri: Luigi, Francesco, Vittorio', () => {
  assert.ok(getBarberRank('Luigi Garofalo') < getBarberRank('Francesco Costantino'));
  assert.ok(getBarberRank('Francesco Costantino') < getBarberRank('Vittorio Morlino'));
  assert.equal(getBarberRank(null), 99);
});

test('tutti i barbieri sono prenotabili e nessuno è solo admin', () => {
  for (const n of ['Luigi Garofalo', 'Francesco Costantino', 'Vittorio Morlino']) {
    assert.equal(isBarberPubliclyBookable(n), true);
    assert.equal(isBarberAdminOnly(n), false);
  }
});
