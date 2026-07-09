const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.ADMIN_EMAIL ?? 'luigigarofalo1996@gmail.com';
const password = process.argv[2] ?? process.env.ADMIN_PASSWORD ?? 'Garofalo2026!Admin';

if (!key || !url) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
};

async function run() {
  const createRes = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Luigi Garofalo' },
    }),
  });
  const createBody = await createRes.json().catch(() => ({}));
  console.log('CREATE', createRes.status, JSON.stringify(createBody));

  if (!createRes.ok && createBody?.msg !== 'User already registered') {
    process.exit(1);
  }

  const userId = createBody.id ?? createBody.user?.id;
  if (userId) {
    const patchRes = await fetch(`${url}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ role: 'admin', full_name: 'Luigi Garofalo' }),
    });
    const patchBody = await patchRes.text();
    console.log('PROFILE', patchRes.status, patchBody);
  }

  const loginRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginBody = await loginRes.json().catch(() => ({}));
  console.log('LOGIN', loginRes.status, loginRes.ok ? 'OK' : JSON.stringify(loginBody));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});