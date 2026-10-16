import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidCustomerEmail } from '../lib/utils/customer-email.ts';

test('email valide', () => {
  assert.equal(isValidCustomerEmail('mario.rossi@gmail.com'), true);
  assert.equal(isValidCustomerEmail('  mario@esempio.it '), true);
});

test('email non valide', () => {
  for (const v of ['', null, undefined, 'mario', 'mario@', '@gmail.com', 'mario@gmail', 'ma rio@gmail.com', 'mario@gmail.c']) {
    assert.equal(isValidCustomerEmail(v), false, String(v));
  }
});
