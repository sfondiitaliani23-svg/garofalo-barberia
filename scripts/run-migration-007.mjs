#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = 'uautnlmnpxgbajtucuko';
const sql = readFileSync(join(__dirname, '../supabase/migrations/007_fix_availability_periods.sql'), 'utf8');

async function runSql(query, connectionString) {
  if (connectionString) {
    const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
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

async function main() {
  console.log('→ Applico migration 007 (fasce orarie barbieri)...');
  await runSql(sql, process.env.DATABASE_URL);
  console.log('✅ Orari barbieri aggiornati con pausa pranzo');
}

main().catch((error) => {
  console.error('❌', error.message);
  process.exit(1);
});