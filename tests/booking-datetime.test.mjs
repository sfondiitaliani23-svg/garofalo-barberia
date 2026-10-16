import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getShopTimezoneOffset,
  parseBookingDateTime,
  getShopDateString,
  getShopTimeString,
  getShopDayOfWeek,
  getShopDayBounds,
} from '../lib/utils/booking-datetime.ts';

test('offset: ora legale d\'estate e ora solare d\'inverno', () => {
  assert.equal(getShopTimezoneOffset('2026-07-15', '10:00'), '+02:00');
  assert.equal(getShopTimezoneOffset('2026-01-15', '10:00'), '+01:00');
});

test('cambio d\'ora d\'autunno: domenica 25 ottobre 2026', () => {
  assert.equal(getShopTimezoneOffset('2026-10-24', '10:00'), '+02:00');
  assert.equal(getShopTimezoneOffset('2026-10-26', '10:00'), '+01:00');
});

test('cambio d\'ora di primavera: domenica 29 marzo 2026', () => {
  assert.equal(getShopTimezoneOffset('2026-03-28', '10:00'), '+01:00');
  assert.equal(getShopTimezoneOffset('2026-03-30', '10:00'), '+02:00');
});

test('parseBookingDateTime: sabato 17 ottobre alle 10:30 è 08:30 UTC', () => {
  assert.equal(parseBookingDateTime('2026-10-17', '10:30').toISOString(), '2026-10-17T08:30:00.000Z');
});

test('parseBookingDateTime: in inverno 10:30 è 09:30 UTC', () => {
  assert.equal(parseBookingDateTime('2026-12-12', '10:30').toISOString(), '2026-12-12T09:30:00.000Z');
});

test('andata e ritorno: data e ora tornano uguali', () => {
  for (const [d, t] of [['2026-10-17', '08:30'], ['2026-12-12', '19:30'], ['2026-07-04', '13:00']]) {
    const parsed = parseBookingDateTime(d, t);
    assert.equal(getShopDateString(parsed), d);
    assert.equal(getShopTimeString(parsed), t);
  }
});

test('data o orario non validi danno errore', () => {
  assert.throws(() => parseBookingDateTime('17/10/2026', '10:30'));
  assert.throws(() => parseBookingDateTime('2026-10-17', '10.30'));
  assert.throws(() => parseBookingDateTime('2026-13-45', '10:30'));
});

test('giorno della settimana: 17 ottobre 2026 è sabato', () => {
  assert.equal(getShopDayOfWeek('2026-10-17'), 6);
  assert.equal(getShopDayOfWeek('2026-10-18'), 0);
  assert.equal(getShopDayOfWeek('2026-10-19'), 1);
});

test('il giorno del cambio d\'ora dura 25 ore (autunno) e 23 ore (primavera)', () => {
  const autumn = getShopDayBounds('2026-10-25');
  assert.equal((autumn.dayEnd - autumn.dayStart) / 3_600_000, 25);
  const spring = getShopDayBounds('2026-03-29');
  assert.equal((spring.dayEnd - spring.dayStart) / 3_600_000, 23);
});
