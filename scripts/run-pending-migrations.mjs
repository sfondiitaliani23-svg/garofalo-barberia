#!/usr/bin/env node
/**
 * Applica migration 003, 004, 005 su Supabase.
 *
 * Uso:
 *   $env:DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
 *   node scripts/run-pending-migrations.mjs
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Imposta DATABASE_URL prima di eseguire questo script.');
  console.error('');
  console.error('Dove trovarla:');
  console.error('  Supabase Dashboard → Settings → Database → Connection string → URI');
  console.error('');
  console.error('Oppure incolla supabase/migrations/run_pending_003_004_005.sql nel SQL Editor.');
  process.exit(1);
}

const sql = readFileSync(
  join(__dirname, '../supabase/migrations/run_pending_003_004_005.sql'),
  'utf8'
);

const pg = await import('pg');
const client = new pg.default.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log('Connesso al database Supabase');
  await client.query(sql);
  console.log('Migration 003, 004 e 005 applicate con successo.');
} catch (error) {
  console.error('Errore:', error.message);
  process.exit(1);
} finally {
  await client.end();
}