import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeWrapped,
  humanMinutes,
  isStoryLive,
  moveInOrder,
  safeCtaHref,
  sortStories,
  toSlide,
  wrappedSlides,
} from '../lib/utils/stories.ts';

test('storia visibile solo nei giorni scelti', () => {
  assert.equal(isStoryLive({ starts_on: '2026-10-26', ends_on: '2026-10-26' }, '2026-10-26'), true);
  assert.equal(isStoryLive({ starts_on: '2026-10-26', ends_on: '2026-10-26' }, '2026-10-27'), false);
  assert.equal(isStoryLive({ starts_on: '2026-10-27', ends_on: null }, '2026-10-26'), false);
  assert.equal(isStoryLive({ starts_on: '2026-10-01', ends_on: null }, '2026-12-31'), true);
});

test('ordine: posizione scelta, poi la più vecchia', () => {
  const out = sortStories([
    { id: 'b', sort_order: 1, created_at: '2026-10-26T10:00:00Z' },
    { id: 'c', sort_order: 0, created_at: '2026-10-26T11:00:00Z' },
    { id: 'a', sort_order: 0, created_at: '2026-10-26T09:00:00Z' },
  ]);
  assert.deepEqual(out.map((s) => s.id), ['a', 'c', 'b']);
  assert.deepEqual(moveInOrder(['a', 'b', 'c'], 'c', -1), ['a', 'c', 'b']);
  assert.deepEqual(moveInOrder(['a', 'b', 'c'], 'a', -1), ['a', 'b', 'c']);
});

test('link del pulsante: solo pagine del sito o https', () => {
  assert.equal(safeCtaHref('/prenota'), '/prenota');
  assert.equal(safeCtaHref('https://barberiagarofalo.it/offerte'), 'https://barberiagarofalo.it/offerte');
  assert.equal(safeCtaHref('//evil.com'), null);
  assert.equal(safeCtaHref('javascript:alert(1)'), null);
  assert.equal(safeCtaHref('http://sito.it'), null);
});

test('testi in inglese se ci sono, altrimenti italiano', () => {
  const row = { id: '1', kind: 'testo', title: 'Promo', body: 'Testo', title_en: 'Deal', body_en: '', big_number: null, media_path: null, cta_label: 'Prenota', cta_label_en: null, cta_href: '/prenota', starts_on: '2026-10-26', ends_on: null, sort_order: 0, has_release: false, created_by: null, created_at: '' };
  const en = toSlide(row, 'en', null);
  assert.equal(en.title, 'Deal');
  assert.equal(en.body, 'Testo');
  assert.equal(en.ctaLabel, 'Prenota');
});

const now = Date.parse('2026-10-26T12:00:00Z');
const apt = (start, mins, extra = {}) => ({
  starts_at: start,
  ends_at: new Date(Date.parse(start) + mins * 60000).toISOString(),
  status: 'completed',
  notes: null,
  service: 'Taglio e shampoo',
  barber: 'Luigi Garofalo',
  ...extra,
});

test('Wrapped: conta solo le visite fatte dell\'anno, le combo valgono una visita', () => {
  const w = computeWrapped(
    [
      apt('2026-03-07T09:00:00Z', 30),
      apt('2026-05-09T09:00:00Z', 30, { notes: '[Combo: combo_ab12]' }),
      apt('2026-05-09T09:30:00Z', 20, { notes: '[Combo: combo_ab12]', service: 'Barba modellata' }),
      apt('2026-06-13T09:00:00Z', 30, { status: 'cancelled' }),
      apt('2026-11-20T09:00:00Z', 30, { status: 'confirmed' }), // futura
      apt('2025-12-20T09:00:00Z', 30), // anno scorso
      apt('2026-09-05T08:00:00Z', 30, { status: 'confirmed', barber: 'Vittorio Morlino', service: 'Barba modellata' }),
    ],
    2026,
    now
  );
  assert.equal(w.visits, 3);
  assert.equal(w.minutes, 110);
  assert.equal(w.topBarber.name, 'Luigi Garofalo');
  assert.equal(w.topBarber.count, 2);
  assert.equal(w.servicesTried, 2);
  assert.equal(w.firstVisit, '2026-03-07');
  assert.equal(w.favoriteDay, 6); // sabato
});

test('Wrapped: nessuna visita, nessuna storia; mai importi', () => {
  assert.deepEqual(wrappedSlides(computeWrapped([], 2026, now), 'Mario', 'it'), []);
  const slides = wrappedSlides(computeWrapped([apt('2026-03-07T09:00:00Z', 45)], 2026, now), 'Mario', 'it');
  assert.ok(slides.length >= 4);
  assert.match(slides[0].title, /Mario, il tuo 2026/);
  assert.equal(slides.at(-1).id, 'wrapped-share');
  assert.ok(slides.every((s) => !/€/.test(`${s.title} ${s.body} ${s.bigNumber}`)));
});

test('durata leggibile', () => {
  assert.equal(humanMinutes(45, 'it'), '45 minuti');
  assert.equal(humanMinutes(60, 'it'), '1 ora');
  assert.equal(humanMinutes(200, 'it'), '3 ore e 20 minuti');
  assert.equal(humanMinutes(61, 'en'), '1 hour and 1 minute');
});

test('storie di base: sempre presenti, voto solo con almeno 3 recensioni', async () => {
  const { baseSlides } = await import('../lib/utils/stories.ts');
  assert.equal(baseSlides('it', [5, 5]).some((s) => s.id === 'base-voto'), false);
  const s = baseSlides('it', [5, 4, 5]);
  assert.equal(s.find((x) => x.id === 'base-voto').bigNumber, '4,7 / 5');
  assert.ok(s.every((x) => x.ctaHref && x.ctaHref.startsWith('/')));
});

test('storie: solo formato verticale 9:16', async () => {
  const { isStoryRatio } = await import('../lib/utils/stories.ts');
  assert.equal(isStoryRatio(1080, 1920), true);
  assert.equal(isStoryRatio(720, 1280), true);
  assert.equal(isStoryRatio(1080, 1350), false); // 4:5
  assert.equal(isStoryRatio(1080, 1080), false);
  assert.equal(isStoryRatio(1920, 1080), false);
  assert.equal(isStoryRatio(0, 0), false);
});
