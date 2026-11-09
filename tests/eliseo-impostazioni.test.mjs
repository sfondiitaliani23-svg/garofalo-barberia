import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanImpostazioni, defaultImpostazioni, fasciaLabel, REGOLE_PREDEFINITE } from '@/lib/utils/eliseo-impostazioni';
import { buildTrainingBlock, estratto, punteggio } from '@/lib/utils/eliseo-training';

test('impostazioni: dati sporchi diventano valori sicuri', () => {
  const c = cleanImpostazioni({
    generali: { widget: 'sì', minutiInattivita: 99999 },
    lingua: { lingua: 'xx', fusoOrario: 'Europe/Rome', privacyUrl: 'javascript:alert(1)', conservazioneGiorni: 45 },
    legale: { partitaIva: '123' },
    assistenti: { gemini: { attivo: true } },
  }, { privacyUrl: 'https://esempio.it/privacy' });
  assert.equal(c.generali.widget, true);
  assert.equal(c.generali.minutiInattivita, 10080);
  assert.equal(c.lingua.lingua, 'it');
  assert.equal(c.lingua.privacyUrl, 'https://esempio.it/privacy');
  assert.equal(c.lingua.conservazioneGiorni, 0);
  assert.equal(c.legale.partitaIva, '');
  assert.equal(c.assistenti.gemini.attivo, false);
});

test('escalation: le regole predefinite restano, le nuove si aggiungono', () => {
  const c = cleanImpostazioni({
    escalation: {
      regole: [
        { id: 'allegato', attiva: true, assegna: 'b1' },
        { id: 'rimborso', testo: 'Quando chiede un rimborso', assegna: 'tutti', attiva: true },
        { id: 'chiede-operatore', testo: 'cambiato', attiva: false },
      ],
      orari: [{ giorni: ['lun', 'xyz'], da: '25:00', a: '13:00' }, { giorni: [], da: '09:00', a: '10:00' }],
    },
  });
  assert.equal(c.escalation.regole.length, REGOLE_PREDEFINITE.length + 1);
  assert.equal(c.escalation.regole[0].testo, REGOLE_PREDEFINITE[0].testo);
  assert.equal(c.escalation.regole[0].attiva, false);
  assert.equal(c.escalation.regole[2].assegna, 'b1');
  assert.deepEqual(c.escalation.orari, [{ giorni: ['lun'], da: '09:00', a: '13:00' }]);
  assert.equal(fasciaLabel(defaultImpostazioni().escalation.orari[0]), 'lun–dom 09:00–20:00');
});

test('addestramento: prompt, FAQ vicine e file pertinenti nel limite', () => {
  const block = buildTrainingBlock({
    istruzioni: 'Parla come Maurizio.',
    prompts: [{ titolo: 'Abbonamenti', testo: 'Proponi le formule continuative.', attivo: true }, { titolo: 'Spento', testo: 'NON DEVE COMPARIRE', attivo: false }],
    faq: [
      { domanda: 'Come prenoto?', risposta: 'Dal link di prenotazione.' },
      { domanda: 'Fate massaggi?', risposta: 'Sì, con Michela.' },
    ],
    documenti: [{ titolo: 'Listino barberia', testo: 'Taglio uomo 25 euro.' }, { titolo: 'Profumi', testo: 'Once Perfume.' }],
  }, 'quanto costa il taglio? listino', 3000);
  assert.match(block, /Parla come Maurizio/);
  assert.match(block, /Abbonamenti/);
  assert.doesNotMatch(block, /NON DEVE COMPARIRE/);
  assert.match(block, /Listino barberia/);
  assert.doesNotMatch(block, /Once Perfume/);
  assert.ok(block.length <= 3100);
  assert.ok(punteggio('massaggio relax', 'Fate massaggi? Sì') > 0);
  assert.ok(estratto('a. '.repeat(500) + 'Taglio uomo costa poco.', 'taglio', 100).includes('Taglio'));
});

import { analisiConversazioni, variazione } from '@/lib/utils/eliseo-analisi';

test('analisi: conversazioni, messaggi e mappa degli ultimi 7 giorni', () => {
  const now = new Date('2026-11-09T18:00:00Z');
  const r = analisiConversazioni([
    { rif: 'a', contatto: '3931', quando: '2026-11-09T09:30:00Z' },
    { rif: 'b', contatto: '3931', quando: '2026-11-09T10:00:00Z', assegnato: 'luigi' },
    { rif: 'c', contatto: '3932', quando: '2026-11-03T08:00:00Z' },
    { rif: 'd', contatto: '3933', quando: '2026-10-30T08:00:00Z' },
    { rif: 'g', contatto: '1-2@g.us', quando: '2026-11-09T10:00:00Z' },
  ], now);
  assert.equal(r.conversazioni, 2);
  assert.equal(r.messaggi, 3);
  assert.equal(r.conOperatore, 1);
  assert.equal(r.conversazioniPrima, 1);
  assert.equal(r.mappa[0][3], 1); // lunedì 10:30 ora italiana → fascia 09-12
  assert.equal(r.max, 1);
  assert.equal(variazione(2, 1), 100);
  assert.equal(variazione(2, 0), null);
});
