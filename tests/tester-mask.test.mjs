// Modalità tester: i dati personali dei clienti devono sparire prima di uscire dal server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maskForTester } from '../lib/utils/tester-mask.ts';

test('nomi, telefoni, email, note e foto dei clienti vengono nascosti', () => {
  const [a] = maskForTester([{ customer_name: 'Mario Rossi', customer_phone: '3331234567', customer_email: 'm@x.it', notes: 'allergia', avatar_url: 'https://x/a.jpg' }]);
  assert.match(a.customer_name, /^Cliente \d{3}$/);
  assert.equal(a.customer_phone, '+39 ••• ••• ••••');
  assert.equal(a.customer_email, '••••@••••');
  assert.equal(a.notes, '•••');
  assert.equal(a.avatar_url, null);
  assert.ok(!JSON.stringify(a).includes('Rossi') && !JSON.stringify(a).includes('333123'));
});
test('lo stesso cliente ha sempre la stessa etichetta', () => {
  const [x, y] = maskForTester([{ customer_name: 'Mario Rossi' }, { customer_name: 'Mario Rossi' }]);
  assert.equal(x.customer_name, y.customer_name);
});
test('servizi, barbieri e prezzi restano leggibili', () => {
  const r = maskForTester({ barber: { name: 'Luigi' }, service: { name: 'Taglio', price_cents: 1500 } });
  assert.deepEqual(r, { barber: { name: 'Luigi' }, service: { name: 'Taglio', price_cents: 1500 } });
});
test('i link che contengono un numero di telefono vengono nascosti', () => {
  assert.equal(maskForTester({ url: 'https://wa.me/393331234567?text=ciao' }).url, '#');
  assert.equal(maskForTester({ url: 'https://barberiagarofalo.it/servizi' }).url, 'https://barberiagarofalo.it/servizi');
});
test('messaggi e nomi dei candidati si nascondono con i campi extra', () => {
  const [i] = maskForTester([{ data: { name: 'Anna', message: 'ciao', phone: '3331' } }], ['name', 'message']);
  assert.ok(!JSON.stringify(i).includes('Anna') && !JSON.stringify(i).includes('ciao'));
});
test('i dati originali non vengono modificati', () => {
  const orig = [{ customer_name: 'Mario Rossi' }];
  maskForTester(orig);
  assert.equal(orig[0].customer_name, 'Mario Rossi');
});
