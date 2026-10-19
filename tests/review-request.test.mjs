import test from 'node:test';
import assert from 'node:assert/strict';
import { pickReviewCandidates } from '../lib/utils/review-request-select.ts';

const hashOf = (e) => e.split('@')[0];
// Appuntamento: lunedì 19 ottobre, 10:00–10:30 a Roma (08:00–08:30 UTC).
const row = (over) => ({ customer_name: 'Marco Rossi', customer_email: 'marco@esempio.it', starts_at: '2026-10-19T08:00:00Z', ends_at: '2026-10-19T08:30:00Z', status: 'confirmed', barber: { name: 'Luigi Garofalo' }, ...over });
const at = (iso) => new Date(iso);
const pick = (rows, now, marks = []) => pickReviewCandidates(rows, { now: at(now), marks: new Set(marks), hashOf });

test('recensione: parte 24 ore dopo la fine, non prima', () => {
  assert.equal(pick([row({})], '2026-10-20T08:29:00Z').candidates.length, 0, '23 ore e 59 minuti');
  assert.equal(pick([row({})], '2026-10-20T08:30:00Z').candidates.length, 1, 'esattamente 24 ore');
  assert.equal(pick([row({})], '2026-10-20T08:44:00Z').candidates.length, 1, 'un giro di ritardo');
});

test('recensione: se un giro salta si recupera, ma non oltre 14 ore', () => {
  assert.equal(pick([row({})], '2026-10-20T22:00:00Z').candidates.length, 1, '13,5 ore dopo');
  assert.equal(pick([row({})], '2026-10-20T23:00:00Z').candidates.length, 0, 'troppo tardi');
});

test('recensione: confermato o completato sì; disdetto, assente, senza email o "chiusura" no', () => {
  const now = '2026-10-20T08:40:00Z';
  assert.equal(pick([row({ status: 'completed' })], now).candidates.length, 1);
  const rows = [
    row({ status: 'cancelled', customer_email: 'a@e.it' }),
    row({ status: 'no_show', customer_email: 'b@e.it' }),
    row({ customer_name: 'Chiusura pranzo', customer_email: 'c@e.it' }),
    row({ customer_email: '' }),
  ];
  assert.equal(pick(rows, now).candidates.length, 0);
});

test('recensione: chi ha detto stop, chi l\'ha già ricevuta e chi l\'ha avuta da poco non la riceve', () => {
  const now = '2026-10-20T08:40:00Z';
  assert.equal(pick([row({})], now, ['optout-rec:marco']).candidates.length, 0);
  assert.equal(pick([row({})], now, ['reviewreq:marco:2026-10-19']).candidates.length, 0);
  assert.equal(pick([row({})], now, ['reviewreq:marco:2026-10-05']).candidates.length, 0);
  assert.equal(pick([row({})], now, ['reviewreq:marco:2026-08-01']).candidates.length, 1);
  assert.equal(pick([row({})], now, ['optout:marco']).candidates.length, 1, 'lo stop dei promemoria "torna" è un\'altra scelta');
});

test('recensione: due appuntamenti dello stesso cliente nello stesso giro → una sola email', () => {
  const rows = [row({}), row({ starts_at: '2026-10-19T08:30:00Z', ends_at: '2026-10-19T09:00:00Z' })];
  assert.equal(pick(rows, '2026-10-20T09:10:00Z').candidates.length, 1);
});
