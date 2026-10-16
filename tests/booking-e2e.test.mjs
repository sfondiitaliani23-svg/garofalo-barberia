// Prenotazione completa contro un vero Postgres (in memoria) con le migrazioni del sito.
import './helpers/register-mocks.mjs';
import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb, seedShop } from './helpers/fake-supabase.mjs';

// Il sito controlla che Supabase sia "configurato": valori finti, il database vero qui è quello di prova.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test.invalid';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test';

let ids; let db; let A; let B;

// Prossimo giorno della settimana (0=dom … 6=sab), almeno 3 giorni da oggi.
function nextDow(dow) {
  const d = new Date(); d.setDate(d.getDate() + 3);
  while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

before(async () => {
  db = await createTestDb();
  globalThis.__testDb = db;
  ids = await seedShop(db);
  A = await import('@/lib/actions/availability.ts');
  B = await import('@/lib/actions/bookings.ts');
});
beforeEach(async () => {
  await db.query('delete from appointments');
  globalThis.__testUser = null;
  globalThis.__sideEffects = [];
});

const base = (o) => ({ customerName: 'Mario Rossi', customerPhone: '3331234567', customerEmail: 'mario.rossi@gmail.com', ...o });

const rows = async () => (await db.query('select * from appointments order by starts_at')).rows;

test('orari martedì: mattina 08:30–13:00 e pomeriggio 15:30–20:30, niente pausa', async () => {
  const r = await A.getAvailableSlots(ids.luigi, nextDow(2), 30, undefined, false, true);
  assert.equal(r.slots[0], '08:30');
  assert.ok(r.slots.includes('12:30'));
  assert.ok(!r.slots.includes('13:00') && !r.slots.includes('14:00') && !r.slots.includes('15:00'));
  assert.ok(r.slots.includes('15:30'));
  assert.equal(r.slots.at(-1), '20:00');
});

test('sabato: ultimo taglio da 30 minuti alle 19:30, e 14:00–14:30 è pausa', async () => {
  const r = await A.getAvailableSlots(ids.luigi, nextDow(6), 30, undefined, false, true);
  assert.ok(r.slots.includes('13:30'));
  assert.ok(!r.slots.includes('14:00'));
  assert.ok(r.slots.includes('14:30'));
  assert.equal(r.slots.at(-1), '19:30');
});

test('domenica e lunedì: nessun orario', async () => {
  for (const dow of [0, 1]) {
    const r = await A.getAvailableSlots(ids.luigi, nextDow(dow), 30, undefined, false, true);
    assert.equal(r.slots.length, 0);
  }
});

test('cliente prenota un taglio con Luigi: salvato giusto, mail/avvisi partiti', async () => {
  const date = nextDow(3);
  const r = await B.createAppointment(base({ serviceIds: [ids.taglio_e_shampoo], barberId: ids.luigi, date, time: '10:00' }));
  assert.equal(r.ok, true, r.error);
  assert.equal(r.priceCents, 2000);
  const all = await rows();
  assert.equal(all.length, 1);
  assert.equal(all[0].barber_id, ids.luigi);
  assert.equal(all[0].status, 'confirmed');
  assert.equal(all[0].customer_email, 'mario.rossi@gmail.com');
  assert.equal(new Date(all[0].ends_at) - new Date(all[0].starts_at), 30 * 60000);
  assert.deepEqual(globalThis.__sideEffects.map((x) => x[0]), ['notifyNew', 'reminder']);
});

test('taglio online con Francesco o Vittorio: rifiutato, niente salvato', async () => {
  const date = nextDow(3);
  for (const b of [ids.francesco, ids.vittorio]) {
    const r = await B.createAppointment(base({ serviceIds: [ids.taglio_e_shampoo], barberId: b, date, time: '10:00' }));
    assert.equal(r.ok, false);
    assert.match(r.error, /Luigi/);
  }
  const baby = await B.createAppointment(base({ serviceIds: [ids.taglio_baby], barberId: ids.francesco, date, time: '10:00' }));
  assert.equal(baby.ok, false);
  assert.equal((await rows()).length, 0);
});

test('taglio senza barbiere scelto: assegnato a Luigi', async () => {
  const r = await B.createAppointment(base({ serviceIds: [ids.taglio_e_shampoo], barberId: null, date: nextDow(4), time: '11:00' }));
  assert.equal(r.ok, true, r.error);
  assert.equal((await rows())[0].barber_id, ids.luigi);
});

test('barba con Francesco online: si può', async () => {
  const r = await B.createAppointment(base({ serviceIds: [ids.barba], barberId: ids.francesco, date: nextDow(5), time: '09:00' }));
  assert.equal(r.ok, true, r.error);
  assert.equal((await rows())[0].barber_id, ids.francesco);
});

test('admin può prenotare un taglio con Francesco', async () => {
  globalThis.__testUser = { id: '11111111-1111-1111-1111-111111111111', role: 'admin', email: 'luigi@example.com' };
  await db.query(`insert into auth.users(id,email) values ($1,$2) on conflict do nothing`, [globalThis.__testUser.id, 'luigi@example.com']);
  const r = await B.createAppointment(base({ serviceIds: [ids.taglio_e_shampoo], barberId: ids.francesco, date: nextDow(5), time: '09:00' }));
  assert.equal(r.ok, true, r.error);
  assert.equal((await rows())[0].barber_id, ids.francesco);
});

test('stesso orario due volte con lo stesso barbiere: il secondo viene rifiutato', async () => {
  const input = base({ serviceIds: [ids.barba], barberId: ids.francesco, date: nextDow(3), time: '16:00' });
  assert.equal((await B.createAppointment(input)).ok, true);
  const second = await B.createAppointment({ ...input, customerName: 'Altro Cliente' });
  assert.equal(second.ok, false);
  assert.equal((await rows()).length, 1);
});

test('due prenotazioni nello stesso istante: una sola passa (il database blocca la sovrapposizione)', async () => {
  const input = (n) => base({ customerName: `Cliente ${n}`, serviceIds: [ids.taglio_e_shampoo], barberId: ids.luigi, date: nextDow(3), time: '17:00' });
  const res = await Promise.all([B.createAppointment(input(1)), B.createAppointment(input(2))]);
  assert.equal(res.filter((r) => r.ok).length, 1);
  assert.equal((await rows()).length, 1);
});

test('orario occupato sparisce dagli orari liberi, anche se si sovrappone a metà', async () => {
  const date = nextDow(3);
  await B.createAppointment(base({ serviceIds: [ids.taglio_e_shampoo], barberId: ids.luigi, date, time: '10:00' }));
  const r = await A.getAvailableSlots(ids.luigi, date, 30, undefined, false, true);
  assert.ok(!r.slots.includes('10:00'));
  assert.ok(r.slots.includes('09:30'));
  assert.ok(r.slots.includes('10:30'));
  const long = await A.getAvailableSlots(ids.luigi, date, 60, undefined, false, true);
  assert.ok(!long.slots.includes('09:30'));
});

test('taglio + barba insieme: due righe di fila con Luigi, prezzo somma', async () => {
  const date = nextDow(4);
  const r = await B.createAppointment(base({ serviceIds: [ids.taglio_e_shampoo, ids.barba], barberId: ids.luigi, date, time: '09:00' }));
  assert.equal(r.ok, true, r.error);
  assert.equal(r.priceCents, 3000);
  const all = await rows();
  assert.equal(all.length, 2);
  assert.equal(all[0].ends_at.toString(), all[1].starts_at.toString());
  assert.ok(all.every((a) => a.notes.includes('[Combo:')));
});

test('combo che sfora la chiusura: rifiutata', async () => {
  const r = await B.createAppointment(base({ serviceIds: [ids.taglio_e_shampoo, ids.barba], barberId: ids.luigi, date: nextDow(3), time: '20:00' }));
  assert.equal(r.ok, false);
  assert.equal((await rows()).length, 0);
});

test('combo con secondo pezzo occupato: nessuna riga a metà', async () => {
  const date = nextDow(3);
  await B.createAppointment(base({ serviceIds: [ids.barba], barberId: ids.luigi, date, time: '09:30' }));
  const r = await B.createAppointment(base({ serviceIds: [ids.taglio_e_shampoo, ids.barba], barberId: ids.luigi, date, time: '09:00' }));
  assert.equal(r.ok, false);
  assert.equal((await rows()).length, 1);
});

test('dati mancanti o email falsa: rifiutati', async () => {
  const date = nextDow(3);
  const okIn = { serviceIds: [ids.barba], barberId: ids.francesco, date, time: '09:00' };
  assert.equal((await B.createAppointment(base({ ...okIn, customerName: ' ' }))).ok, false);
  assert.equal((await B.createAppointment(base({ ...okIn, customerEmail: 'non-una-mail' }))).ok, false);
  assert.equal((await B.createAppointment(base({ ...okIn, serviceIds: [] }))).ok, false);
  assert.equal((await rows()).length, 0);
});

test('giorno di chiusura (lunedì): prenotazione rifiutata', async () => {
  const r = await B.createAppointment(base({ serviceIds: [ids.barba], barberId: ids.francesco, date: nextDow(1), time: '10:00' }));
  assert.equal(r.ok, false);
});

test('assenza del barbiere (ferie): orari spariti e prenotazione rifiutata', async () => {
  const date = nextDow(5);
  await db.query(`insert into barber_time_off(barber_id,start_at,end_at,reason) values ($1,$2,$3,'ferie')`, [ids.francesco, `${date}T00:00:00+02:00`, `${date}T23:59:00+02:00`]);
  const r = await B.createAppointment(base({ serviceIds: [ids.barba], barberId: ids.francesco, date, time: '10:00' }));
  assert.equal(r.ok, false);
  await db.query('delete from barber_time_off');
});

test('orari scritti nel database in ora italiana (10:00 a Roma = 08:00/09:00 UTC)', async () => {
  const date = nextDow(3);
  await B.createAppointment(base({ serviceIds: [ids.barba], barberId: ids.francesco, date, time: '10:00' }));
  const r = (await db.query(`select to_char(starts_at at time zone 'Europe/Rome','HH24:MI') as t from appointments`)).rows[0];
  assert.equal(r.t, '10:00');
});

test('sabato: barba con Francesco alle 13:30 e alle 19:40 (ultimo da 20 minuti)', async () => {
  const date = nextDow(6);
  const a = await B.createAppointment(base({ serviceIds: [ids.barba], barberId: ids.francesco, date, time: '13:30' }));
  assert.equal(a.ok, true, a.error);
  const slots = (await A.getAvailableSlots(ids.vittorio, date, 20, undefined, false, false)).slots;
  assert.ok(slots.every((t) => t < '14:00' || t >= '14:30'));
});
