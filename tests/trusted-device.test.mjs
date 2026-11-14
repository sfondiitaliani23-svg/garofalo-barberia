import test from 'node:test';
import assert from 'node:assert/strict';
import { signDevice, verifyDevice } from '../lib/utils/trusted-device.ts';

// «Ricorda questo dispositivo» (14/11/2026): cookie firmato, solo per lo stesso utente e fino alla scadenza.
test('dispositivo ricordato: firma, utente e scadenza', () => {
  const now = Date.parse('2026-11-14T20:00:00Z');
  const exp = now + 30 * 864e5;
  const c = signDevice('utente-1', exp, 'chiave');
  assert.equal(verifyDevice(c, 'utente-1', 'chiave', now), true);
  assert.equal(verifyDevice(c, 'utente-2', 'chiave', now), false, 'altro utente');
  assert.equal(verifyDevice(c, 'utente-1', 'altra-chiave', now), false, 'chiave diversa');
  assert.equal(verifyDevice(c, 'utente-1', 'chiave', exp + 1), false, 'scaduto');
  const [u, , f] = c.split('.');
  assert.equal(verifyDevice(`${u}.${exp + 864e5}.${f}`, 'utente-1', 'chiave', now), false, 'scadenza allungata a mano');
  assert.equal(verifyDevice('', 'utente-1', 'chiave', now), false);
  assert.equal(verifyDevice('a.b', 'utente-1', 'chiave', now), false);
  assert.equal(verifyDevice(c, 'utente-1', '', now), false, 'senza chiave è spento');
});
