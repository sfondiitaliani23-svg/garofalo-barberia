import test from 'node:test';
import assert from 'node:assert/strict';
import { isBarberAllowedForCut } from '../lib/utils/barber-schedule.ts';

test('i tagli online solo con Luigi', () => {
  assert.equal(isBarberAllowedForCut('Luigi Garofalo'), true);
  assert.equal(isBarberAllowedForCut('Francesco Costantino'), false);
  assert.equal(isBarberAllowedForCut('Vittorio Morlino'), false);
  assert.equal(isBarberAllowedForCut(null), false);
});
