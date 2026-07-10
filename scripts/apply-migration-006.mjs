#!/usr/bin/env node
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const PROJECT_REF = 'uautnlmnpxgbajtucuko';
const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, '../supabase/migrations/run_pending_006.sql'), 'utf8');

async function runSql(query, connectionString) {
  if (connectionString) {
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    await client.query(query);
    await client.end();
    return;
  }

  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error('Serve DATABASE_URL o SUPABASE_ACCESS_TOKEN');

  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Management API ${res.status}: ${text}`);
}

try {
  await runSql(sql, process.env.DATABASE_URL);
  console.log('Migration 006 applicata.');
} catch (error) {
  console.error('Errore migrazione 006:', error.message);
  process.exit(1);
}