#!/usr/bin/env node
/**
 * Applica migration 009 (galleria foto clienti).
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ Imposta DATABASE_URL prima di eseguire questo script.');
  console.error('   Esempio (PowerShell):');
  console.error('   $env:DATABASE_URL="postgresql://postgres.uautnlmnpxgbajtucuko:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"');
  console.error('   node scripts/run-migration-009.mjs');
  process.exit(1);
}

const sql = readFileSync(join(__dirname, '../supabase/migrations/009_customer_gallery.sql'), 'utf8');

const pg = await import('pg');
const client = new pg.default.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log('✓ Connesso al database Supabase');
  await client.query(sql);
  console.log('✓ Migration 009 applicata con successo.');
} catch (error) {
  console.error('❌ Errore:', error.message);
  process.exit(1);
} finally {
  await client.end();
}
