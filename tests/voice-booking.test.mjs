// Prenotazione istantanea: la frase detta a voce deve riempire bene nome, telefono, data, ora, barbiere e servizi.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBookingSpeech } from '../lib/utils/voice-booking.ts';

const barbers = [
  { id: 'b-luigi', name: 'Luigi Garofalo' },
  { id: 'b-vitt', name: 'Vittorio Morlino' },
  { id: 'b-fra', name: 'Francesco Costantino' },
];
const services = [
  { id: 's-taglio', name: 'Taglio e shampoo' },
  { id: 's-baby', name: 'Taglio baby' },
  { id: 's-lama', name: 'Barba rasata / lama' },
  { id: 's-forb', name: 'Barba modellata a forbici' },
  { id: 's-panno', name: 'Barba con panno caldo' },
  { id: 's-sham', name: 'Shampoo e acconciatura' },
];
const NOW = new Date(2026, 9, 16, 12, 0); // venerdì 16 ottobre 2026
const p = (txt) => parseBookingSpeech(txt, barbers, services, NOW);

test('esempio dell\'interfaccia: nome, telefono, domani alle 15:30', () => {
  const r = p('Mario Rossi 3201234567 domani alle 15:30');
  assert.equal(r.customerName, 'Mario Rossi');
  assert.equal(r.customerPhone, '3201234567');
  assert.equal(r.dateStr, '2026-10-17');
  assert.equal(r.timeStr, '15:30');
});
test('telefono a gruppi e detto a parole', () => {
  assert.equal(p('Mario Rossi 320 123 4567 oggi alle 10').customerPhone, '3201234567');
  assert.equal(p('Mario Rossi tre due zero uno due tre quattro cinque sei sette domani').customerPhone, '3201234567');
  assert.equal(p('Mario Rossi più 39 320 123 4567').customerPhone, '3201234567');
});
test('dopodomani non diventa domani', () => {
  assert.equal(p('Mario Rossi dopodomani alle 11').dateStr, '2026-10-18');
  assert.equal(p('Mario Rossi dopo domani alle 11').dateStr, '2026-10-18');
});
test('orari detti in italiano', () => {
  assert.equal(p('Mario Rossi domani alle tre e mezza').timeStr, '15:30');
  assert.equal(p('Mario Rossi domani alle 9 e un quarto').timeStr, '09:15');
  assert.equal(p('Mario Rossi domani alle dieci meno un quarto').timeStr, '09:45');
  assert.equal(p('Mario Rossi domani alle 4').timeStr, '16:00');
  assert.equal(p('Mario Rossi domani alle 4 del mattino').timeStr, '04:00');
  assert.equal(p("Mario Rossi domani all'una").timeStr, '13:00');
  assert.equal(p('Mario Rossi domani a mezzogiorno').timeStr, '12:00');
  assert.equal(p('Mario Rossi domani alle diciassette e trenta').timeStr, '17:30');
  assert.equal(p('Mario Rossi domani alle 10.15').timeStr, '10:15');
  assert.equal(p('Mario Rossi domani alle 18 in punto').timeStr, '18:00');
  assert.equal(p('Mario Rossi domani alle 6 di sera').timeStr, '18:00');
});
test('giorni della settimana e date', () => {
  assert.equal(p('Mario Rossi sabato alle 9').dateStr, '2026-10-17');
  assert.equal(p('Mario Rossi venerdì alle 9').dateStr, '2026-10-23');
  assert.equal(p('Mario Rossi lunedì prossimo alle 9').dateStr, '2026-10-19');
  assert.equal(p('Mario Rossi il 20 ottobre alle 9').dateStr, '2026-10-20');
  assert.equal(p('Mario Rossi il venti ottobre alle nove').dateStr, '2026-10-20');
  assert.equal(p('Mario Rossi primo novembre alle 9').dateStr, '2026-11-01');
  assert.equal(p('Mario Rossi 3 marzo 2027 alle 9').dateStr, '2027-03-03');
  assert.equal(p('Mario Rossi 22/10 alle 9').dateStr, '2026-10-22');
  assert.equal(p('Mario Rossi tra due giorni alle 9').dateStr, '2026-10-18');
  assert.equal(p('Mario Rossi tra una settimana alle 9').dateStr, '2026-10-23');
  assert.equal(p('Mario Rossi il 25 alle 9').dateStr, '2026-10-25');
  assert.equal(p('Mario Rossi alle 9').dateStr, '');
});
test('barbiere con la parola "con", anche se sentito male', () => {
  assert.equal(p('Mario Rossi domani alle 10 con Vittorio').barberId, 'b-vitt');
  assert.equal(p('Mario Rossi domani alle 10 con Vitorio').barberId, 'b-vitt');
  assert.equal(p('Mario Rossi domani alle 10 da Francesco').barberId, 'b-fra');
  assert.equal(p('Mario Rossi domani alle 10 con Luigi Garofalo').barberId, 'b-luigi');
});
test('un cliente che si chiama come un barbiere resta il cliente', () => {
  const r = p('Luigi Bianchi domani alle 10 con Vittorio');
  assert.equal(r.customerName, 'Luigi Bianchi');
  assert.equal(r.barberId, 'b-vitt');
});
test('servizi', () => {
  assert.deepEqual(p('Mario Rossi domani taglio e shampoo').serviceIds, ['s-taglio']);
  assert.deepEqual(p('Mario Rossi domani taglio baby').serviceIds, ['s-baby']);
  assert.deepEqual(p('Mario Rossi domani barba a lama').serviceIds, ['s-lama']);
  assert.deepEqual(p('Mario Rossi domani barba con panno caldo').serviceIds, ['s-panno']);
  assert.deepEqual(p('Mario Rossi domani taglio e barba a forbici').serviceIds.sort(), ['s-forb', 's-taglio']);
  assert.deepEqual(p('Mario Rossi domani solo shampoo e acconciatura').serviceIds, ['s-sham']);
  assert.deepEqual(p('Mario Rossi domani alle 10').serviceIds, []);
});
test('ricorrenza', () => {
  const a = p('Mario Rossi sabato alle 9 ogni settimana per 8 settimane');
  assert.equal(a.isRecurring, true);
  assert.equal(a.recurrenceWeeks, 8);
  const b = p('Mario Rossi sabato alle 9 ricorrente per due mesi');
  assert.equal(b.recurrenceWeeks, 8);
  assert.equal(p('Mario Rossi sabato alle 9').isRecurring, false);
  assert.equal(p('Mario Rossi tra una settimana alle 9').isRecurring, false);
});
test('frase completa e naturale', () => {
  const r = p('prenota Giovanni De Luca tre tre otto uno due tre quattro cinque sei sette per sabato alle dieci e mezza con Francesco taglio e shampoo');
  assert.equal(r.customerName, 'Giovanni De Luca');
  assert.equal(r.customerPhone, '3381234567');
  assert.equal(r.dateStr, '2026-10-17');
  assert.equal(r.timeStr, '10:30');
  assert.equal(r.barberId, 'b-fra');
  assert.deepEqual(r.serviceIds, ['s-taglio']);
});
test('a nome di', () => {
  assert.equal(p('prenotazione a nome di Antonio Esposito domani alle 11').customerName, 'Antonio Esposito');
});

import { mergeVoiceResults, suggestKnownNames } from '../lib/utils/voice-booking.ts';

test('voce: la stessa frase ripetuta 3 volte resta una sola', () => {
  assert.equal(mergeVoiceResults(['Mario Rossi domani alle dieci', 'Mario Rossi domani alle dieci', 'Mario Rossi domani alle dieci']), 'Mario Rossi domani alle dieci');
  assert.equal(mergeVoiceResults(['mario rossi domani alle dieci mario rossi domani alle dieci mario rossi domani alle dieci']), 'mario rossi domani alle dieci');
});

test('voce: frasi che si allungano tengono solo l’ultima', () => {
  assert.equal(mergeVoiceResults(['Mario Rossi', 'Mario Rossi domani', 'Mario Rossi domani alle dieci']), 'Mario Rossi domani alle dieci');
});

test('voce: pezzi diversi si uniscono, i numeri ripetuti restano', () => {
  assert.equal(mergeVoiceResults(['Mario Rossi', 'taglio e barba con Luigi']), 'Mario Rossi taglio e barba con Luigi');
  assert.equal(mergeVoiceResults(['tre tre tre quattro']), 'tre tre tre quattro');
  assert.equal(mergeVoiceResults([]), '');
});

test('voce: il nome non si allunga con le ripetizioni', () => {
  const text = mergeVoiceResults(['Mario Rossi domani', 'Mario Rossi domani', 'Mario Rossi domani']);
  assert.equal(parseBookingSpeech(text, [], []).customerName, 'Mario Rossi');
});

test('nomi: suggerisce i clienti già registrati con nome simile, mai uno uguale o lontano', () => {
  const known = ['Mario Rossi', 'Maria Russo', 'Luca Bianchi'];
  assert.deepEqual(suggestKnownNames('Mario Rosi', known), ['Mario Rossi']);
  assert.deepEqual(suggestKnownNames('Mario Rossi', known), []);
  assert.deepEqual(suggestKnownNames('Giuseppe Verdi', known), []);
  assert.deepEqual(suggestKnownNames('lu', known), []);
});
