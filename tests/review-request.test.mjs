import test from 'node:test';
import assert from 'node:assert/strict';
import { pickReviewCandidates } from '../lib/utils/review-request-select.ts';

const now = new Date('2026-10-20T09:00:00Z'); // martedì, 11:00 a Roma
const hashOf = (e) => e.split('@')[0];
const row = (over) => ({ customer_name: 'Marco Rossi', customer_email: 'marco@esempio.it', starts_at: '2026-10-19T08:00:00Z', status: 'completed', barber: { name: 'Luigi Garofalo' }, ...over });
const pick = (rows, marks = []) => pickReviewCandidates(rows, { now, marks: new Set(marks), hashOf });

test('recensione: visita completata ieri → una richiesta', () => {
  const { candidates } = pick([row({})]);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].name, 'Marco');
  assert.equal(candidates[0].visitDay, '2026-10-19');
});

test('recensione: non per disdette, appuntamenti non completati, oggi o troppo vecchi', () => {
  const rows = [
    row({ status: 'cancelled' }),
    row({ status: 'confirmed', customer_email: 'a@e.it' }),
    row({ starts_at: '2026-10-20T07:00:00Z', customer_email: 'b@e.it' }),
    row({ starts_at: '2026-10-15T08:00:00Z', customer_email: 'c@e.it' }),
    row({ customer_name: 'Chiusura pranzo', customer_email: 'd@e.it' }),
    row({ customer_email: '' }),
  ];
  assert.equal(pick(rows).candidates.length, 0);
});

test('recensione: chi ha detto stop, chi l\'ha già ricevuta e chi l\'ha avuta da poco non la riceve', () => {
  assert.equal(pick([row({})], ['optout-rec:marco']).candidates.length, 0);
  assert.equal(pick([row({})], ['reviewreq:marco:2026-10-19']).candidates.length, 0);
  assert.equal(pick([row({})], ['reviewreq:marco:2026-10-05']).candidates.length, 0);
  assert.equal(pick([row({})], ['reviewreq:marco:2026-08-01']).candidates.length, 1);
  assert.equal(pick([row({})], ['optout:marco']).candidates.length, 1, 'lo stop dei promemoria "torna" è un\'altra scelta');
});

test('recensione: un cliente con due appuntamenti riceve una sola email', () => {
  const rows = [row({ starts_at: '2026-10-18T08:00:00Z' }), row({})];
  const { candidates } = pick(rows);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].visitDay, '2026-10-19');
});
