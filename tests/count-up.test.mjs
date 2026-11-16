import test from 'node:test';
import assert from 'node:assert/strict';
import { leggiNumero, testoAlPasso } from '../lib/utils/count-up.ts';

test('legge numeri italiani con migliaia, decimali, prefissi e suffissi', () => {
  assert.deepEqual(leggiNumero('1.284'), { prima: '', valore: 1284, decimali: 0, dopo: '' });
  assert.deepEqual(leggiNumero('12,50 €'), { prima: '', valore: 12.5, decimali: 2, dopo: ' €' });
  assert.deepEqual(leggiNumero('3,4%'), { prima: '', valore: 3.4, decimali: 1, dopo: '%' });
  assert.deepEqual(leggiNumero('€ 1.200'), { prima: '€ ', valore: 1200, decimali: 0, dopo: '' });
  assert.equal(leggiNumero('—'), null);
  assert.equal(leggiNumero(''), null);
});

test('a metà mostra un numero più piccolo, alla fine il testo esatto', () => {
  const t = '1.284';
  const n = leggiNumero(t);
  assert.equal(testoAlPasso(t, n, 0), '0');
  assert.equal(testoAlPasso(t, n, 1), t);
  const meta = Number(testoAlPasso(t, n, 0.5).replace(/\./g, ''));
  assert.ok(meta > 0 && meta < 1284);
  assert.equal(testoAlPasso('12,50 €', leggiNumero('12,50 €'), 0), '0,00 €');
});
