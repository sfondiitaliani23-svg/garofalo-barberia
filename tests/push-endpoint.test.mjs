import test from 'node:test';
import assert from 'node:assert/strict';
import { isPushEndpoint } from '../lib/utils/push-endpoint.ts';

test('notifiche senza account: solo indirizzi dei servizi di notifica veri', () => {
  assert.equal(isPushEndpoint('https://fcm.googleapis.com/fcm/send/abc'), true);
  assert.equal(isPushEndpoint('https://web.push.apple.com/QAbc'), true);
  assert.equal(isPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x'), true);
  assert.equal(isPushEndpoint('https://wns2-db5p.notify.windows.com/w/?token=x'), true);
  assert.equal(isPushEndpoint('https://evil.example.com/fcm.googleapis.com/'), false);
  assert.equal(isPushEndpoint('http://fcm.googleapis.com/x'), false);
  assert.equal(isPushEndpoint('https://fcm.googleapis.com.evil.com/x'), false);
  assert.equal(isPushEndpoint(42), false);
});
