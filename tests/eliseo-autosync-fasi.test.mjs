// Fase dei contatti dalla rubrica di Eliseo calcolata dalle prenotazioni (10/11/2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fasiDaAggiornare, faseRubrica } from '../lib/utils/eliseo-autosync.ts';

test('faseRubrica: prenotato o passato da poco = cliente; poi da richiamare e perso', () => {
  assert.equal(faseRubrica({ fase: 'prenotato', giorniDa: null, prossimo: '2026-11-20T10:00:00Z' }), 'cliente');
  assert.equal(faseRubrica({ fase: 'abituale', giorniDa: 10, prossimo: null }), 'cliente');
  assert.equal(faseRubrica({ fase: 'nuovo', giorniDa: 3, prossimo: null }), 'cliente');
  assert.equal(faseRubrica({ fase: 'da_richiamare', giorniDa: 40, prossimo: null }), 'da_richiamare');
  assert.equal(faseRubrica({ fase: 'perso', giorniDa: 120, prossimo: null }), 'perso');
  assert.equal(faseRubrica({ fase: 'perso', giorniDa: null, prossimo: null }), null);
});

test('fasiDaAggiornare: abbina per telefono, email o account; non tocca «Contattato» né chi non ha prenotazioni', () => {
  const rubrica = [
    { id: 'a', telefono: '+39 333 111 2222', fase: 'nuovo', barbiere: null },
    { id: 'b', email: 'Mario@Esempio.it', fase: 'nuovo', barbiere: 'Luigi' },
    { id: 'c', telefono: '3334445555', fase: 'contattato' },
    { id: 'd', telefono: '3339990000', fase: 'nuovo' },
    { id: 'e', user_id: 'u7', fase: 'cliente' },
  ];
  const app = [
    { key: 'tel:x', telefono: '3331112222', fase: 'cliente', barbiere: 'Luigi', giorniDa: 5, prossimo: null },
    { key: 'email:mario@esempio.it', email: 'mario@esempio.it', fase: 'da_richiamare', barbiere: 'Vittorio', giorniDa: 50, prossimo: null },
    { key: 'tel:y', telefono: '3334445555', fase: 'perso', giorniDa: 200, prossimo: null },
    { key: 'id:u7', fase: 'abituale', giorniDa: 8, prossimo: null },
  ];
  assert.deepEqual(fasiDaAggiornare(rubrica, app), [
    { id: 'a', fase: 'cliente', barbiere: 'Luigi' },
    { id: 'b', fase: 'da_richiamare' },
  ]);
});
