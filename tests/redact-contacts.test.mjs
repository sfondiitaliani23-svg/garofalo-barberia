// Chat IA: telefono ed email del cliente non escono dal sito; orari, date e prezzi restano.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redactContacts } from '../lib/utils/redact-contacts.ts';

test('toglie email e numeri di telefono italiani', () => {
  assert.equal(redactContacts('Sono Mario, scrivimi a mario.rossi@gmail.com'), 'Sono Mario, scrivimi a [email]');
  assert.equal(redactContacts('il mio numero è 333 123 4567'), 'il mio numero è [telefono]');
  assert.equal(redactContacts('chiamami al +39 333-1234567 grazie'), 'chiamami al [telefono] grazie');
  assert.equal(redactContacts('fisso 0881.123456'), 'fisso [telefono]');
  assert.equal(redactContacts('0039 3331234567'), '[telefono]');
});

test('lascia orari, date, prezzi e numeri corti', () => {
  const s = 'Posso venire il 12/11 alle 14:30? Il taglio costa 25 € e siamo in 2.';
  assert.equal(redactContacts(s), s);
  assert.equal(redactContacts('dal 10 al 15 novembre'), 'dal 10 al 15 novembre');
  assert.equal(redactContacts('2026'), '2026');
});

test('in inglese usa [phone]', () => {
  assert.equal(redactContacts('call me on 3331234567', 'en'), 'call me on [phone]');
});

test('testo vuoto resta vuoto', () => {
  assert.equal(redactContacts(''), '');
});
