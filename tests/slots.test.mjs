import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSlots, filterAvailableSlots, isSlotBlocked } from '../lib/utils/slots.ts';
import { getShopPeriodsForDay, getDayClosingTime, isSlotWithinShopHours } from '../lib/utils/shop-hours.ts';
import { getFallbackSlots } from '../lib/utils/fallback-slots.ts';
import { getShopDayOfWeek } from '../lib/utils/booking-datetime.ts';

const times = (slots) => slots.map((s) => s.time);
const apt = (date, from, to) => ({
  starts_at: new Date(`${date}T${from}:00+02:00`).toISOString(),
  ends_at: new Date(`${date}T${to}:00+02:00`).toISOString(),
});

test('sabato mattina: dalle 08:30 alle 13:30 per un servizio da 30 minuti', () => {
  const t = times(generateSlots('2026-10-17', '08:30', '14:00', 30, 30));
  assert.equal(t[0], '08:30');
  assert.equal(t.at(-1), '13:30');
  assert.equal(t.length, 11);
});

test('un servizio da 60 minuti finisce al massimo alla chiusura', () => {
  const t = times(generateSlots('2026-10-17', '08:30', '14:00', 60, 30));
  assert.equal(t.at(-1), '13:00');
});

test('un servizio da 45 minuti non sfora la pausa', () => {
  const t = times(generateSlots('2026-10-17', '08:30', '14:00', 45, 30));
  assert.equal(t.at(-1), '13:00'); // 13:00-13:45; alle 13:30 finirebbe alle 14:15
});

test('sabato pomeriggio: ultima partenza alle 19:30', () => {
  const t = times(generateSlots('2026-10-17', '14:30', '20:00', 30, 30));
  assert.equal(t[0], '14:30');
  assert.equal(t.at(-1), '19:30');
});

test('una prenotazione già presa blocca gli orari che si sovrappongono', () => {
  const slots = generateSlots('2026-10-17', '09:00', '12:00', 60, 30);
  const free = times(filterAvailableSlots(slots, [apt('2026-10-17', '10:00', '10:30')], []));
  assert.deepEqual(free, ['09:00', '10:30', '11:00']);
});

test('prenotazioni attaccate: chi finisce alle 10:00 non blocca le 10:00', () => {
  const slots = generateSlots('2026-10-17', '09:00', '11:00', 30, 30);
  const free = times(filterAvailableSlots(slots, [apt('2026-10-17', '09:30', '10:00')], []));
  assert.deepEqual(free, ['09:00', '10:00', '10:30']);
});

test('assenza del barbiere: gli orari bloccati spariscono', () => {
  const slots = generateSlots('2026-10-17', '09:00', '12:00', 30, 30);
  const block = { start_at: new Date('2026-10-17T10:00:00+02:00').toISOString(), end_at: new Date('2026-10-17T11:00:00+02:00').toISOString() };
  const free = times(filterAvailableSlots(slots, [], [block]));
  assert.deepEqual(free, ['09:00', '09:30', '11:00', '11:30']);
});

test('isSlotBlocked: orario libero con nessuna prenotazione', () => {
  const [slot] = generateSlots('2026-10-17', '09:00', '10:00', 30, 30);
  assert.equal(isSlotBlocked(slot, [], []), false);
});

test('orari del salone: lunedì e domenica chiusi', () => {
  assert.deepEqual(getShopPeriodsForDay(0), []);
  assert.deepEqual(getShopPeriodsForDay(1), []);
});

test('orari del salone: sabato diviso in due periodi', () => {
  assert.deepEqual(getShopPeriodsForDay(6), [
    { startTime: '08:30', endTime: '14:00' },
    { startTime: '14:30', endTime: '20:00' },
  ]);
  assert.equal(getDayClosingTime(6), '20:00');
  assert.equal(getDayClosingTime(3), '20:30');
});

test('sabato: le 13:30 sì, le 14:00 no, le 14:30 sì', () => {
  const saturday = new Date(2026, 9, 17, 12, 0);
  assert.equal(isSlotWithinShopHours(saturday, '13:30'), true);
  assert.equal(isSlotWithinShopHours(saturday, '14:00'), false);
  assert.equal(isSlotWithinShopHours(saturday, '14:30'), true);
  assert.equal(isSlotWithinShopHours(new Date(2026, 9, 18, 12, 0), '10:00'), false); // domenica
});

// Date lontane, così il minimo anticipo di 2 ore non conta.
function nextDayOfWeek(start, dow) {
  const d = new Date(`${start}T12:00:00Z`);
  while (getShopDayOfWeek(d.toISOString().slice(0, 10)) !== dow) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

test('orari di riserva: sabato con le 13:30 e senza la pausa', () => {
  const saturday = nextDayOfWeek('2031-03-01', 6);
  const { slots } = getFallbackSlots(saturday, 30);
  assert.ok(slots.includes('13:30'));
  assert.ok(!slots.includes('14:00'));
  assert.ok(slots.includes('14:30'));
  assert.ok(slots.includes('19:30'));
  assert.ok(!slots.includes('20:00'));
});

test('orari di riserva: domenica e lunedì chiusi', () => {
  for (const dow of [0, 1]) {
    const day = nextDayOfWeek('2031-03-01', dow);
    const r = getFallbackSlots(day, 30);
    assert.deepEqual(r.slots, []);
    assert.equal(r.error, 'Chiuso in questo giorno');
  }
});

test('orari di riserva: giorno feriale con pausa pranzo', () => {
  const tuesday = nextDayOfWeek('2031-03-01', 2);
  const { slots } = getFallbackSlots(tuesday, 30);
  assert.ok(slots.includes('12:30'));
  assert.ok(!slots.includes('13:00'));
  assert.ok(!slots.includes('15:00'));
  assert.ok(slots.includes('15:30'));
  assert.ok(slots.includes('20:00'));
  assert.ok(!slots.includes('20:30'));
});
