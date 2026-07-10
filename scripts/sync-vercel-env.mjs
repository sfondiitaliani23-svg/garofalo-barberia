#!/usr/bin/env node
/**
 * Carica le variabili da .env.local su Vercel (production).
 * Uso: node scripts/sync-vercel-env.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { resolve } from 'path';

const ENV_FILE = resolve(process.cwd(), '.env.local');
const KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_WHATSAPP_NUMBER',
  'ADMIN_EMAIL',
  'NTFY_TOPIC',
  'NTFY_URL',
  'RESEND_API_KEY',
  'RESEND_FROM',
  'WEB3FORMS_ACCESS_KEY',
  'CRON_SECRET',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_FROM',
  'GREEN_API_INSTANCE_ID',
  'GREEN_API_TOKEN',
];

if (!existsSync(ENV_FILE)) {
  console.error('❌ File .env.local non trovato.');
  console.error('   Copia .env.local.example → .env.local e inserisci le chiavi Supabase.');
  process.exit(1);
}

const lines = readFileSync(ENV_FILE, 'utf8').split('\n');
const vars = {};

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  vars[key] = value;
}

let ok = 0;
for (const key of KEYS) {
  const value = vars[key];
  if (!value) {
    console.warn(`⚠️  ${key} mancante in .env.local — saltato`);
    continue;
  }

  spawnSync('npx', ['vercel', 'env', 'rm', key, 'production', '--yes'], {
    encoding: 'utf8',
    stdio: 'inherit',
    shell: true,
  });

  const result = spawnSync(
    'npx',
    ['vercel', 'env', 'add', key, 'production', '--yes'],
    {
      input: value,
      encoding: 'utf8',
      stdio: ['pipe', 'inherit', 'inherit'],
      shell: true,
    }
  );

  if (result.status === 0) {
    console.log(`✅ ${key}`);
    ok++;
  } else {
    console.error(`❌ ${key} — errore durante l'aggiornamento`);
  }
}

console.log(`\nFatto: ${ok}/${KEYS.length} variabili. Esegui: npx vercel --prod`);