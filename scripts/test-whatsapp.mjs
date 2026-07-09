#!/usr/bin/env node
/**
 * Test invio WhatsApp promemoria (Green API).
 *
 * Uso:
 *   node scripts/test-whatsapp.mjs
 *   node scripts/test-whatsapp.mjs 3201886277
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '../.env.local');

function loadEnv() {
  const raw = readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

function normalizeItalianPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('39') && digits.length >= 11) return digits;
  if (digits.startsWith('0') && digits.length >= 9) return `39${digits.slice(1)}`;
  if (digits.length === 9 || digits.length === 10) return `39${digits}`;
  return digits.length >= 9 ? digits : null;
}

const env = loadEnv();
const instanceId = env.GREEN_API_INSTANCE_ID;
const token = env.GREEN_API_TOKEN;
const testPhone = normalizeItalianPhone(process.argv[2] ?? env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '393201886277');

if (!instanceId || !token) {
  console.error('Mancano GREEN_API_INSTANCE_ID o GREEN_API_TOKEN in .env.local');
  console.error('');
  console.error('Setup Green API:');
  console.error('  1. https://green-api.com → registrati');
  console.error('  2. Crea istanza → scansiona QR con WhatsApp della barberia');
  console.error('  3. Copia idInstance e apiTokenInstance in .env.local');
  process.exit(1);
}

if (!testPhone) {
  console.error('Numero di test non valido');
  process.exit(1);
}

const message =
  'Test promemoria Garofalo Barberia\n\n' +
  'Se ricevi questo messaggio, i promemoria WhatsApp automatici funzionano correttamente.';

console.log(`Invio test a +${testPhone}...`);

const response = await fetch(
  `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: `${testPhone}@c.us`,
      message,
    }),
  }
);

const result = await response.json().catch(() => ({}));

if (!response.ok || !result.idMessage) {
  console.error('Invio fallito:', result);
  process.exit(1);
}

console.log('Messaggio inviato con successo!');
console.log('ID messaggio:', result.idMessage);