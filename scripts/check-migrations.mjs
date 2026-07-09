#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

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

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

async function tableStatus(name) {
  const { error } = await supabase.from(name).select('*').limit(1);
  if (!error) return 'ok';
  if (error.code === 'PGRST205' || error.message?.includes('does not exist')) return 'missing';
  return `error:${error.code}`;
}

async function columnStatus(table, column) {
  const { data, error } = await supabase.from(table).select(column).limit(1);
  if (error?.message?.includes(column)) return 'missing';
  if (error) return `error:${error.code}`;
  return 'ok';
}

console.log('Stato migration Supabase:\n');

const remindersEmail = await columnStatus('appointments', 'reminder_email_sent_at');
const promotionId = await columnStatus('appointments', 'promotion_id');
const products = await tableStatus('products');
const promotions = await tableStatus('promotions');

console.log(`003 appointment_reminders : ${remindersEmail === 'ok' ? 'OK' : 'DA ESEGUIRE'}`);
console.log(`004 promotions            : ${promotions === 'ok' && promotionId === 'ok' ? 'OK' : 'DA ESEGUIRE'}`);
console.log(`005 products_inventory    : ${products === 'ok' ? 'OK' : 'DA ESEGUIRE'}`);