// Assistenti delle segnalazioni: l'IA può proporre solo azioni dell'elenco, con id veri, e non riceve dati personali.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ASSISTANTS, categoryOfArea, parseAnalysis, scrub } from '../lib/issues/assistants.ts';

const ids = new Set(['A1', 'P1']);
const wrap = (azioni) => JSON.stringify({ diagnosi: 'd', risposta: 'r', azioni });

test('ogni area porta alla sua categoria', () => {
  assert.equal(categoryOfArea('prenotazioni'), 'prenotazioni');
  assert.equal(categoryOfArea('promozioni'), 'servizi');
  assert.equal(categoryOfArea('staff'), 'personale');
  assert.equal(categoryOfArea('area_cliente'), 'clienti');
  assert.equal(categoryOfArea('inventario'), 'dati');
  assert.equal(categoryOfArea('autenticazione'), 'tecnico');
});

test('azioni con id inventati o fuori elenco vengono scartate', () => {
  const r = parseAnalysis(
    wrap([
      { kind: 'cancel_appointment', label: 'x', why: 'y', params: { appointmentId: 'INVENTATO' } },
      { kind: 'set_service_active', label: 'x', why: 'y', params: { serviceId: 'A1', active: true } },
      { kind: 'drop_database', label: 'x', why: 'y', params: {} },
    ]),
    ASSISTANTS.servizi,
    ids
  );
  assert.equal(r.proposals.length, 1);
  assert.equal(r.proposals[0].kind, 'set_service_active');
  assert.equal(r.proposals[0].state, 'pending');
});

test('un assistente non può usare azioni di un altro campo', () => {
  const r = parseAnalysis(wrap([{ kind: 'set_product_stock', label: 'x', why: 'y', params: { productId: 'A1', quantity: 3 } }]), ASSISTANTS.clienti, ids);
  assert.equal(r.proposals.length, 0);
});

test('giacenza: solo interi non negativi', () => {
  const bad = parseAnalysis(wrap([{ kind: 'set_product_stock', label: 'x', why: 'y', params: { productId: 'A1', quantity: -2 } }]), ASSISTANTS.dati, ids);
  assert.equal(bad.proposals.length, 0);
  const ok = parseAnalysis(wrap([{ kind: 'set_product_stock', label: 'x', why: 'y', params: { productId: 'A1', quantity: 5 } }]), ASSISTANTS.dati, ids);
  assert.equal(ok.proposals.length, 1);
});

test('massimo 3 azioni e risposta non valida = niente', () => {
  const many = Array.from({ length: 6 }, () => ({ kind: 'note_for_developer', label: 'n', why: 'w', params: { text: 'nota completa' } }));
  assert.equal(parseAnalysis(wrap(many), ASSISTANTS.tecnico, ids).proposals.length, 3);
  assert.equal(parseAnalysis('non è json', ASSISTANTS.tecnico, ids), null);
});

test('telefoni ed email spariscono dal testo prima di andare all\'IA', () => {
  const t = scrub('Il cliente mario@x.it al 333 123 4567 non riceve la mail');
  assert.ok(!t.includes('mario@x.it') && !t.includes('333 123'));
  assert.match(t, /\[email\]/);
  assert.match(t, /\[numero\]/);
});
