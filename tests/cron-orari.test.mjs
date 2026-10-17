import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Il promemoria parte dalle 22:30 di Roma. Roma è UTC+2 d'estate e UTC+1 d'inverno:
// servono due orari, 20:30 UTC (estate) e 21:30 UTC (inverno). Chi è già stato avvisato non riceve un secondo messaggio.
test('vercel.json: il promemoria ha un orario per l’ora legale e uno per l’ora solare', () => {
  const { crons } = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const times = crons.filter((c) => c.path.startsWith('/api/cron/appointment-reminders')).map((c) => c.schedule).sort();
  assert.deepEqual(times, ['30 20 * * *', '30 21 * * *']);
});

test('vercel.json: al massimo 2 cron (limite del piano gratuito)', () => {
  const { crons } = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.ok(crons.length <= 2);
});

test('promemoria: ogni orario di Roma dopo le 22:30 coincide con uno dei due cron, estate e inverno', () => {
  const rome = (iso) => new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
  const summer = ['2026-07-15T20:30:00Z', '2026-07-15T21:30:00Z'].map(rome); // 22:30 e 23:30
  const winter = ['2026-12-15T20:30:00Z', '2026-12-15T21:30:00Z'].map(rome); // 21:30 e 22:30
  assert.ok(summer.includes('22:30'));
  assert.ok(winter.includes('22:30'));
});
