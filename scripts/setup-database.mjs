#!/usr/bin/env node
/**
 * Applica schema + seed su Supabase PostgreSQL.
 *
 * Uso:
 *   $env:DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
 *   node scripts/setup-database.mjs
 *
 * Oppure incolla supabase/full_setup.sql nel SQL Editor di Supabase Dashboard.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ Imposta DATABASE_URL (Supabase → Settings → Database → Connection string → URI)');
  console.error('   Esempio: postgresql://postgres.[ref]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres');
  process.exit(1);
}

let pg;
try {
  pg = await import('pg');
} catch {
  console.error('❌ Installa pg: yarn add -D pg');
  process.exit(1);
}

const sql = readFileSync(join(__dirname, '../supabase/full_setup.sql'), 'utf8');
const client = new pg.default.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log('✓ Connesso al database');
  await client.query(sql);
  console.log('✓ Schema e dati iniziali applicati con successo');
  console.log('\nProssimi passi:');
  console.log('1. Copia URL + anon key + service_role key in .env.local');
  console.log('2. Aggiungi le stesse variabili su Vercel → Settings → Environment Variables');
  console.log('3. Crea utente admin in Supabase Auth e esegui: UPDATE profiles SET role = \'admin\' WHERE email = \'tua@email.com\';');
} catch (error) {
  console.error('❌ Errore:', error.message);
  if (error.message?.includes('already exists')) {
    console.error('   Il database sembra già configurato. Se serve resettare, elimina le tabelle dal SQL Editor.');
  }
  process.exit(1);
} finally {
  await client.end();
}