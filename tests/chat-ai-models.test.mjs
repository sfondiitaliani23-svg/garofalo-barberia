// Chat IA: i modelli spenti da Groq (16/08/2026) non si provano più, anche se sono salvati in admin.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/register-mocks.mjs';
const { modelsFor, GEMINI_IN_USE } = await import('../lib/chat/ai.ts');

test('un modello Groq spento salvato in admin viene saltato', () => {
  const list = modelsFor('groq', 'llama-3.3-70b-versatile');
  assert.ok(!list.includes('llama-3.3-70b-versatile'));
  assert.equal(list[0], 'openai/gpt-oss-120b');
});

test('nessun modello Groq della lista è tra quelli spenti', () => {
  for (const m of modelsFor('groq')) assert.ok(!/^llama-3\.(1-8b|3-70b)/.test(m), m);
});

test('un modello Groq valido scelto in admin resta il primo', () => {
  assert.equal(modelsFor('groq', 'openai/gpt-oss-20b')[0], 'openai/gpt-oss-20b');
});

test('Gemini resta spento', () => {
  assert.equal(GEMINI_IN_USE, false);
});
