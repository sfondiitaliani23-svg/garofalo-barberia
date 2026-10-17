import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const chatUi = readFileSync('components/layout/EliseoChat.tsx', 'utf8');
const known = new Set([...chatUi.matchAll(/^\s{2}(\w+): \{ Icon:/gm)].map((m) => m[1]));

test('ogni [[icona]] scritta nelle risposte della chat esiste nel componente', () => {
  assert.ok(known.size >= 15);
  for (const f of ['lib/chat/assistant.ts', 'lib/i18n/content-widgets.ts', 'app/api/chat/route.ts']) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/\[\[(\w+)\]\]/g)) assert.ok(known.has(m[1]), `${f}: [[${m[1]}]] sconosciuta`);
  }
});

test('le icone [[x]] non finiscono in testi che non passano dalla chat', () => {
  const widgets = readFileSync('lib/i18n/content-widgets.ts', 'utf8');
  assert.ok(!/title: L\(lang, '\[\[/.test(widgets));
});
