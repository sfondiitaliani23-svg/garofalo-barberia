import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  cleanModelli,
  cleanTags,
  fillTemplate,
  isContactKey,
  MODELLI_INIZIALI,
  buildContatti,
  contactKey,
  faseDi,
  filtraContatti,
  ordinaDaRichiamare,
  riepilogo,
  testoRichiamo,
  whatsappUrl,
} from '../lib/utils/eliseo.ts';

const NOW = new Date('2026-10-27T10:00:00Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const appt = (o) => ({
  customer_id: null,
  customer_name: 'Mario Rossi',
  customer_phone: '333 111 2222',
  customer_email: null,
  status: 'completed',
  barber: { name: 'Luigi Garofalo' },
  service: { name: 'Taglio e shampoo', category: 'taglio' },
  ...o,
});

test('stesso telefono scritto in modi diversi = stessa persona', () => {
  assert.equal(contactKey({ customer_phone: '+39 333 111 2222' }), contactKey({ customer_phone: '3331112222' }));
  assert.equal(contactKey({ customer_phone: '', customer_email: 'A@B.it' }), 'email:a@b.it');
  assert.equal(contactKey({ customer_phone: '', customer_email: '', customer_id: null }), null);
});

test('fasi calcolate', () => {
  const base = { visite: 2, giorniDa: 10, ritornoGiorni: 35, prossimo: null, visiteAnno: 2 };
  assert.equal(faseDi({ ...base, prossimo: '2026-11-01' }), 'prenotato');
  assert.equal(faseDi({ ...base, visite: 1, visiteAnno: 1 }), 'nuovo');
  assert.equal(faseDi(base), 'cliente');
  assert.equal(faseDi({ ...base, visite: 4, visiteAnno: 3 }), 'abituale');
  assert.equal(faseDi({ ...base, giorniDa: 40 }), 'da_richiamare');
  assert.equal(faseDi({ ...base, giorniDa: 91 }), 'perso');
});

test('rubrica dagli appuntamenti: visite per giorno, futuro, disdette e segnaposto esclusi', () => {
  const rows = [
    appt({ starts_at: daysAgo(80) }),
    appt({ starts_at: daysAgo(40), customer_phone: '+39 3331112222' }),
    appt({ starts_at: daysAgo(40), service: { name: 'Barba', category: 'barba' } }), // stesso giorno
    appt({ starts_at: daysAgo(5), status: 'cancelled' }),
    appt({ customer_name: 'Chiusura', customer_phone: '0881000000', starts_at: daysAgo(3) }),
    appt({ customer_name: 'Anna', customer_phone: '3209998888', starts_at: daysAgo(-3), status: 'confirmed', barber: { name: 'Francesco' } }),
    appt({ customer_name: 'Anna', customer_phone: '3209998888', starts_at: daysAgo(20), barber: { name: 'Francesco' } }),
  ];
  const list = buildContatti(rows, NOW);
  assert.equal(list.length, 2);
  const mario = list.find((c) => c.customer_name === 'Mario Rossi');
  assert.equal(mario.visite, 2);
  assert.equal(mario.giorniDa, 40);
  assert.equal(mario.fase, 'da_richiamare');
  assert.equal(mario.ritornoGiorni, 35);
  const anna = list.find((c) => c.customer_name === 'Anna');
  assert.equal(anna.fase, 'prenotato');
  assert.equal(anna.barbiere, 'Francesco');
  const r = riepilogo(list);
  assert.equal(r.totale, 2);
  assert.equal(r.daRichiamare, 1);
});

test('baby: si aspetta di più prima di richiamare', () => {
  const list = buildContatti([appt({ starts_at: daysAgo(38), service: { name: 'Taglio baby', category: 'baby' } })], NOW);
  assert.equal(list[0].fase, 'nuovo');
});

test('assenze contate, chi ha solo assenze non entra', () => {
  const list = buildContatti(
    [appt({ starts_at: daysAgo(10) }), appt({ starts_at: daysAgo(20), status: 'no_show' }), appt({ customer_phone: '3470000000', starts_at: daysAgo(2), status: 'no_show' })],
    NOW
  );
  assert.equal(list.length, 1);
  assert.equal(list[0].assenze, 1);
});

test('filtri e ordine dei da richiamare', () => {
  const list = buildContatti(
    [
      appt({ customer_name: 'Primo', customer_phone: '3331', starts_at: daysAgo(80) }),
      appt({ customer_name: 'Secondo', customer_phone: '3332000000', starts_at: daysAgo(37) }),
    ].map((r, i) => ({ ...r, customer_phone: i ? r.customer_phone : '3331000000' })),
    NOW
  );
  assert.deepEqual(ordinaDaRichiamare(list).map((c) => c.customer_name), ['Secondo', 'Primo']);
  assert.equal(filtraContatti(list, { q: 'secon' }).length, 1);
  assert.equal(filtraContatti(list, { q: '333 200' }).length, 1);
  assert.equal(filtraContatti(list, { barbiere: 'Altro' }).length, 0);
});

test('messaggio WhatsApp: nome, barbiere, link; nessun numero = nessun link', () => {
  const t = testoRichiamo({ customer_name: 'Mario Rossi', barbiere: 'Luigi Garofalo' }, 'https://barberiagarofalo.it/prenota');
  assert.match(t, /^Ciao Mario,/);
  assert.match(t, /con Luigi:/);
  assert.match(t, /barberiagarofalo\.it\/prenota$/);
  assert.match(whatsappUrl('333 111 2222', t), /^https:\/\/wa\.me\/393331112222\?text=Ciao%20Mario/);
  assert.equal(whatsappUrl(null, t), null);
});

test('azione: solo lettura, controllo accesso, tester senza dati personali', () => {
  const src = fs.readFileSync(new URL('../lib/actions/eliseo.ts', import.meta.url), 'utf8');
  assert.match(src, /await requireAdminView\(\)/);
  assert.match(src, /maskForTester\(contatti\)/);
  assert.match(src, /key: `c\$\{i\}`/);
  assert.doesNotMatch(src, /\.(insert|update|delete)\(/);
  assert.equal((src.match(/\.upsert\(/g) || []).length, 1, 'scrive solo in un punto (site_content)');
  assert.match(src, /from\('site_content'\)\s*\.upsert\(\{ key, title: 'Eliseo', body: JSON\.stringify\(value\), is_active: false/);
  for (const fn of ['setEtichetteAction', 'saveModelliAction']) {
    const body = src.slice(src.indexOf(`export async function ${fn}`)).split('export async function')[1];
    assert.match(body, /await requireAdmin\(\)/, `${fn} controlla il permesso`);
  }
  assert.match(src, /isContactKey\(key\)/);
  assert.doesNotMatch(src, /console\./);
});

test('scheda: storico degli appuntamenti dal più recente, senza disdette', () => {
  const list = buildContatti(
    [appt({ starts_at: daysAgo(60) }), appt({ starts_at: daysAgo(30), status: 'no_show' }), appt({ starts_at: daysAgo(10) }), appt({ starts_at: daysAgo(5), status: 'cancelled' })],
    NOW
  );
  assert.deepEqual(list[0].storico.map((v) => v.stato), ['completed', 'no_show', 'completed']);
  assert.equal(list[0].storico[0].servizio, 'Taglio e shampoo');
});

test('la scheda si apre dentro Eliseo, non porta alla galleria (l’account sull’appuntamento può essere di chi ha prenotato)', () => {
  const src = fs.readFileSync(new URL('../components/admin/AdminEliseo.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /galleria|customer_id/);
  assert.match(src, /function Scheda/);
});

test('modelli: segnaposto, controlli, iniziali validi', () => {
  assert.equal(fillTemplate('Ciao {nome}, ti aspetta {barbiere}: {prenota}', { customer_name: 'Mario Rossi', barbiere: 'Luigi Garofalo' }, 'https://x/prenota'), 'Ciao Mario, ti aspetta Luigi: https://x/prenota');
  assert.equal(fillTemplate('Ciao {nome}, a presto', { customer_name: 'Senza nome' }), 'Ciao, a presto');
  assert.equal(cleanModelli(MODELLI_INIZIALI).ok, true);
  assert.equal(cleanModelli([{ nome: '', testo: 'x' }]).ok, false);
  assert.equal(cleanModelli('x').ok, false);
  const r = cleanModelli([{ id: '<script>', nome: ' A ', testo: 'B', categoria: 'boh' }]);
  assert.equal(r.ok && r.modelli[0].categoria, 'altro');
  assert.match(r.ok && r.modelli[0].id, /^m-0-/);
});

test('etichette e chiavi dei contatti', () => {
  assert.deepEqual(cleanTags(' Sposo, sposo ,studente'), ['sposo', 'studente']);
  assert.equal(cleanTags(Array.from({ length: 20 }, (_, i) => 't' + i)).length, 10);
  assert.equal(isContactKey('tel:393331112222'), true);
  assert.equal(isContactKey('email:a@b.it'), true);
  assert.equal(isContactKey('c3'), false, 'la chiave finta del tester non vale');
  assert.equal(isContactKey('tel:abc'), false);
  const list = buildContatti([appt({ starts_at: daysAgo(10) })], NOW).map((c) => ({ ...c, etichette: ['sposo'] }));
  assert.equal(filtraContatti(list, { etichetta: 'sposo' }).length, 1);
  assert.equal(filtraContatti(list, { etichetta: 'altro' }).length, 0);
});
