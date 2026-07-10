#!/usr/bin/env node
/**
 * Applica migration 006 (categoria Bimbi analytics).
 *
 * Uso:
 *   $env:DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@..."
 *   node scripts/run-migration-006.mjs
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Imposta DATABASE_URL prima di eseguire questo script.');
  console.error('Oppure incolla supabase/migrations/run_pending_006.sql nel SQL Editor Supabase.');
  process.exit(1);
}

const sql = readFileSync(join(__dirname, '../supabase/migrations/run_pending_006.sql'), 'utf8');

const pg = await import('pg');
const client = new pg.default.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log('Connesso al database Supabase');
  await client.query(sql);
  console.log('Migration 006 applicata con successo.');
} catch (error) {
  console.error('Errore:', error.message);
  process.exit(1);
} finally {
  await client.end();
}