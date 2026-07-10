/**
 * Setup Supabase via Management API (richiede SUPABASE_ACCESS_TOKEN)
 * oppure via Postgres (richiede DATABASE_URL).
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = 'uautnlmnpxgbajtucuko';
const SITE_URL = 'https://barberiagarofalo.it';
const REDIRECT_URLS = [
  `${SITE_URL}/auth/callback`,
  'https://garofalo-barberia.vercel.app/auth/callback',
  'https://www.barberiagarofalo.it/auth/callback',
  'http://localhost:3000/auth/callback',
];

const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const databaseUrl = process.env.DATABASE_URL;

async function managementApi(path, method, body) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function configureAuth() {
  console.log('→ Configuro URL di autenticazione...');
  await managementApi('/config/auth', 'PATCH', {
    site_url: SITE_URL,
    uri_allow_list: REDIRECT_URLS.join('\n'),
  });
  console.log('✅ Auth URLs configurati');
}

async function runSqlFile() {
  if (databaseUrl) {
    console.log('→ Eseguo SQL via Postgres...');
    const pg = await import('pg');
    const sql = readFileSync(resolve(__dirname, '../supabase/full_setup.sql'), 'utf8');
    const client = new pg.default.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();
    await client.query(sql);
    await client.end();
    console.log('✅ Schema database applicato');
    return;
  }

  console.log('→ Eseguo SQL via Management API...');
  const sql = readFileSync(resolve(__dirname, '../supabase/full_setup.sql'), 'utf8');
  await managementApi('/database/query', 'POST', { query: sql });
  console.log('✅ Schema database applicato');
}

async function verifyTables() {
  const query = "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename";
  const result = databaseUrl
    ? await (async () => {
        const pg = await import('pg');
        const client = new pg.default.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
        await client.connect();
        const r = await client.query(query);
        await client.end();
        return r.rows;
      })()
    : await managementApi('/database/query', 'POST', { query });

  const tables = Array.isArray(result) ? result : result?.result ?? result;
  console.log('Tabelle public:', tables);
}

async function main() {
  if (!accessToken && !databaseUrl) {
    console.error('❌ Serve SUPABASE_ACCESS_TOKEN o DATABASE_URL');
    console.error('');
    console.error('Opzione A — Access Token (consigliata):');
    console.error('  1. https://supabase.com/dashboard/account/tokens → Generate new token');
    console.error('  2. $env:SUPABASE_ACCESS_TOKEN="sbp_..."; node scripts/supabase-admin-setup.mjs');
    console.error('');
    console.error('Opzione B — Password database:');
    console.error('  1. Dashboard → Settings → Database → Connection string (URI)');
    console.error('  2. $env:DATABASE_URL="postgresql://..."; node scripts/supabase-admin-setup.mjs');
    process.exit(1);
  }

  if (accessToken) await configureAuth();
  await runSqlFile();
  await verifyTables();
  console.log('\n🎉 Setup Supabase completato!');
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});