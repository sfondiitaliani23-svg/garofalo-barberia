import test from 'node:test';
import assert from 'node:assert/strict';
import { applyUnlockedDays, cleanUnlockedDays, parseUnlockedDays, DEFAULT_UNLOCKED_DAYS } from '../lib/utils/unlocked-days.ts';
import { isShopDateFullyBlocked } from '../lib/utils/barber-absence.ts';
import { generateSlots, filterAvailableSlots } from '../lib/utils/slots.ts';

// Chiusura del salone dal 15 al 31 dicembre 2026 (ora di Roma, inverno +01:00)
const closure = [{ barber_id: null, start_at: '2026-12-14T23:00:00.000Z', end_at: '2026-12-31T22:59:59.000Z', reason: 'Ferie' }];

test('senza salvataggio valgono il 22 e il 23 dicembre', () => {
  assert.deepEqual(parseUnlockedDays(null), ['2026-12-22', '2026-12-23']);
  assert.deepEqual(DEFAULT_UNLOCKED_DAYS, ['2026-12-22', '2026-12-23']);
});

test('elenco salvato: solo date valide, senza doppioni, in ordine', () => {
  assert.deepEqual(parseUnlockedDays('["2026-12-23","x","2026-12-22","2026-12-23","2026-02-30"]'), ['2026-12-22', '2026-12-23']);
  assert.deepEqual(parseUnlockedDays('[]'), []);
  assert.deepEqual(parseUnlockedDays('non json'), []);
  assert.deepEqual(cleanUnlockedDays('2026-12-22'), []);
});

test('i giorni sbloccati escono dal blocco, gli altri restano bloccati', () => {
  const rows = applyUnlockedDays(closure, ['2026-12-22', '2026-12-23']);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].reason, 'Ferie');
  for (const d of ['2026-12-22', '2026-12-23']) assert.equal(isShopDateFullyBlocked(d, 'b1', rows), false, d);
  for (const d of ['2026-12-15', '2026-12-19', '2026-12-21', '2026-12-24', '2026-12-30']) assert.equal(isShopDateFullyBlocked(d, 'b1', rows), true, d);
});

test('nel giorno sbloccato tutti gli orari sono liberi', () => {
  const rows = applyUnlockedDays(closure, ['2026-12-22']);
  const slots = generateSlots('2026-12-22', '08:30', '13:00', 30, 30);
  assert.equal(filterAvailableSlots(slots, [], rows).length, slots.length);
  const before = generateSlots('2026-12-19', '08:30', '13:00', 30, 30);
  assert.equal(filterAvailableSlots(before, [], rows).length, 0);
});

test('blocchi fuori dai giorni sbloccati non cambiano', () => {
  const other = [{ barber_id: 'b1', start_at: '2026-11-20T07:00:00.000Z', end_at: '2026-11-20T12:00:00.000Z' }];
  assert.deepEqual(applyUnlockedDays(other, ['2026-12-22']), other);
  assert.deepEqual(applyUnlockedDays(closure, []), closure);
});

test('un blocco di un solo giorno sbloccato sparisce', () => {
  const one = [{ barber_id: null, start_at: '2026-12-21T23:00:00.000Z', end_at: '2026-12-22T22:59:59.000Z' }];
  assert.deepEqual(applyUnlockedDays(one, ['2026-12-22']), []);
});

import { SPECIAL_OPENINGS, specialClosureBlocks, isSpecialOpeningBookable, getSpecialOpening } from '../lib/utils/special-openings.ts';
import { getShopPeriodsForDay } from '../lib/utils/shop-hours.ts';

test('orari natalizi della locandina', () => {
  const h = (d) => getShopPeriodsForDay(new Date(`${d}T12:00:00Z`).getUTCDay(), d).map((p) => `${p.startTime}-${p.endTime}`).join(' / ');
  assert.equal(h('2026-12-20'), '08:30-13:30');
  assert.equal(h('2026-12-21'), '08:30-13:00 / 15:30-20:30');
  assert.equal(h('2026-12-22'), '08:30-20:30');
  assert.equal(h('2026-12-23'), '08:30-20:30');
  assert.equal(h('2026-12-28'), '08:30-13:00 / 15:30-20:30');
  assert.equal(h('2026-12-31'), '09:00-14:30');
  assert.equal(SPECIAL_OPENINGS.length, 6);
});

test('chiusure delle feste: 24-27 dicembre e 1-6 gennaio bloccati anche se sbloccati', () => {
  const blocks = specialClosureBlocks();
  const rows = [...applyUnlockedDays([], ['2026-12-24']), ...blocks];
  for (const d of ['2026-12-24', '2026-12-25', '2026-12-26', '2026-12-27', '2027-01-01', '2027-01-06']) assert.equal(isShopDateFullyBlocked(d, 'b1', rows), true, d);
  for (const d of ['2026-12-23', '2026-12-28', '2026-12-31']) assert.equal(isShopDateFullyBlocked(d, 'b1', rows), false, d);
});

test('Natale prenotabile online dal 1° dicembre, 22 e 23 subito', () => {
  assert.equal(isSpecialOpeningBookable('2026-12-20', '2026-11-13'), false);
  assert.equal(isSpecialOpeningBookable('2026-12-20', '2026-12-01'), true);
  // Dal 13/11/2026 (Luigi): anche 22 e 23 online solo dal 1° dicembre.
  assert.equal(isSpecialOpeningBookable('2026-12-22', '2026-11-13'), false);
  assert.equal(isSpecialOpeningBookable('2026-12-23', '2026-11-30'), false);
  assert.equal(isSpecialOpeningBookable('2026-12-22', '2026-12-01'), true);
  assert.equal(isSpecialOpeningBookable('2026-12-23', '2026-12-01'), true);
  assert.equal(getSpecialOpening('2026-12-31')?.bookableFrom, '2026-12-01');
});
