/**
 * Corregge il trigger handle_new_user e opzionalmente crea l'admin.
 * Richiede DATABASE_URL oppure SUPABASE_ACCESS_TOKEN.
 */
import pg from 'pg';

const PROJECT_REF = 'uautnlmnpxgbajtucuko';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'luigigarofalo1996@gmail.com';
const ADMIN_PASSWORD = process.argv[2] ?? 'Garofalo2026!Admin';

const FIX_SQL = `
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_role public.user_role := 'customer';
  meta_role TEXT;
BEGIN
  meta_role := NEW.raw_user_meta_data->>'role';
  IF meta_role IN ('customer', 'admin') THEN
    resolved_role := meta_role::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), ''),
    resolved_role
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`;

async function runSql(query, connectionString) {
  if (connectionString) {
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    const result = await client.query(query);
    await client.end();
    return result;
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
  return text;
}

async function createAdminUser() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) return;

  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Luigi Garofalo', role: 'admin' },
    }),
  });
  const body = await res.json().catch(() => ({}));
  console.log('create user:', res.status, JSON.stringify(body));

  if (res.ok || body?.msg === 'User already registered') {
    const userId = body.id ?? body.user?.id;
    if (userId) {
      await fetch(`${url}/rest/v1/profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({ role: 'admin', full_name: 'Luigi Garofalo' }),
      });
    }
  }
}

async function main() {
  console.log('→ Correggo trigger auth...');
  await runSql(FIX_SQL, process.env.DATABASE_URL);
  console.log('✅ Trigger aggiornato');
  await createAdminUser();
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});