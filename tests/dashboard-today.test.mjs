import test from 'node:test';
import assert from 'node:assert/strict';
import { todaySummary } from '../lib/utils/dashboard-overview.ts';

const at = (iso) => Date.parse(iso);
const data = {
  now: '2026-10-16T08:00:00Z', // 10:00 a Roma
  services: [{ id: 's', name: 'Taglio e shampoo', category: 'taglio', price: 1700, minutes: 30 }],
  barbers: [
    { id: 'a', name: 'Luigi Garofalo', image: null, active: true },
    { id: 'b', name: 'Vittorio Morlino', image: null, active: true },
  ],
  apts: [
    [at('2026-10-16T06:30:00Z'), 1, 1700, 0, 0, 0], // 08:30 fatto
    [at('2026-10-16T09:00:00Z'), 0, 1700, 0, 0, 1], // 11:00 Luigi
    [at('2026-10-16T10:00:00Z'), 0, 1700, 0, 1, 2], // 12:00 Vittorio
    [at('2026-10-16T12:00:00Z'), 2, 1700, 0, 1, 3], // annullato
    [at('2026-10-17T08:00:00Z'), 0, 1700, 0, 0, 4], // domani
  ],
  customers: [], recent: [], unread: 0,
};

test('riepilogo di oggi', () => {
  const t = todaySummary(data);
  assert.equal(t.total, 3);
  assert.equal(t.remaining, 2);
  assert.equal(t.cancelled, 1);
  assert.equal(t.tomorrow, 1);
  assert.equal(t.firstTime, '08:30');
  assert.equal(t.lastTime, '12:00');
  assert.deepEqual(t.next, { time: '11:00', barber: 'Luigi Garofalo', service: 'Taglio e shampoo' });
  assert.equal(t.perBarber.length, 2);
});

test('giorno vuoto', () => {
  const t = todaySummary({ ...data, apts: [] });
  assert.equal(t.total, 0);
  assert.equal(t.next, null);
});
