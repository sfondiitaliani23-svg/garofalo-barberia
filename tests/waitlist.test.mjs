import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWaitlistInput, howManyToNotify } from '@/lib/utils/waitlist.ts';

const ok = { date: '2026-10-21', barberId: null, serviceIds: ['a'], customerName: 'Anna Verdi', customerPhone: '320 123 4567', customerEmail: 'anna@gmail.com' };

test('lista d’attesa: dati giusti passano', () => {
  const r = validateWaitlistInput(ok, '2026-10-20');
  assert.equal(r.ok, true);
});
test('lista d’attesa: giorno passato, oggi ok', () => {
  assert.equal(validateWaitlistInput({ ...ok, date: '2026-10-19' }, '2026-10-20').ok, false);
  assert.equal(validateWaitlistInput({ ...ok, date: '2026-10-20' }, '2026-10-20').ok, true);
});
test('lista d’attesa: telefono, nome, email, servizi, data malformata', () => {
  for (const bad of [{ customerPhone: '12' }, { customerName: ' ' }, { customerEmail: 'x' }, { serviceIds: [] }, { date: '21/10/2026' }]) {
    assert.equal(validateWaitlistInput({ ...ok, ...bad }, '2026-10-20').ok, false);
  }
});
test('quante persone avvisare', () => {
  assert.equal(howManyToNotify(0, 5), 0);
  assert.equal(howManyToNotify(2, 5), 2);
  assert.equal(howManyToNotify(10, 10), 3);
  assert.equal(howManyToNotify(3, 0), 0);
});
