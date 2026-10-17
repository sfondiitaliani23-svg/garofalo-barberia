import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripEmoji } from '@/lib/chat/strip-emoji.ts';

test('toglie le emoji e sistema gli spazi', () => {
  assert.equal(stripEmoji('Ciao! 👋 Sono Eliseo 😊'), 'Ciao! Sono Eliseo');
  assert.equal(stripEmoji('Taglio ✂️ e barba 💈.'), 'Taglio e barba.');
  assert.equal(stripEmoji('👨‍💈 Il team'), 'Il team');
});
test('lascia i simboli normali', () => {
  assert.equal(stripEmoji('Prezzo: 15 € → ok ✓ ★'), 'Prezzo: 15 € → ok ✓ ★');
  assert.equal(stripEmoji('• **Orari**\n• Servizi'), '• **Orari**\n• Servizi');
});
