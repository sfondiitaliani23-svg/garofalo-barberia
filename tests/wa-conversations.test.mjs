import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isGroupChat, groupByChat } from '@/lib/utils/wa-conversations';

test('i gruppi WhatsApp vengono riconosciuti', () => {
  assert.equal(isGroupChat('393605133271-1468315897@g.us'), true);
  assert.equal(isGroupChat('393605133271-1468315897g.us'), true);
  assert.equal(isGroupChat('393291234567'), false);
  assert.equal(isGroupChat(null), false);
});

test('una riga per chat, con ultimo messaggio e non letti', () => {
  const rows = groupByChat([
    { rif: 'a', contatto: '3931', nome: 'Marco', quando: '2026-11-09T09:00:00Z', nuovo: true },
    { rif: 'b', contatto: '3931', nome: 'Marco', quando: '2026-11-09T10:00:00Z', nuovo: true },
    { rif: 'c', contatto: '3931', nome: 'Marco', quando: '2026-11-08T10:00:00Z', nuovo: false },
    { rif: 'd', contatto: '3932', nome: 'Luca', quando: '2026-11-09T08:00:00Z', nuovo: false },
    { rif: 'g', contatto: '3933-1@g.us', nome: 'Gruppo', quando: '2026-11-09T11:00:00Z', nuovo: true },
  ]);
  assert.equal(rows.length, 2);
  const marco = rows.find((r) => r.item.contatto === '3931');
  assert.equal(marco.item.rif, 'b');
  assert.equal(marco.unread, 2);
  assert.deepEqual(marco.rifs.sort(), ['a', 'b', 'c']);
  assert.equal(rows.find((r) => r.item.contatto === '3932').unread, 0);
});
