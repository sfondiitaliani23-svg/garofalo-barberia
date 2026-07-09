# Setup Supabase — Garofalo Barberia

## 1. Crea progetto Supabase

1. Vai su [supabase.com](https://supabase.com) → New Project
2. Salva **Project URL** e **anon key** dalla pagina Settings → API
3. Copia anche **service_role key** (solo server, mai nel browser)

## 2. Applica schema database

1. Supabase Dashboard → **SQL Editor**
2. Incolla e esegui il contenuto di `supabase/migrations/001_initial_schema.sql`
3. Poi esegui `supabase/seed.sql` per barbieri, servizi e orari

## 3. Configura variabili ambiente

Copia `.env.local.example` in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...
ADMIN_EMAIL=luigigarofalo1996@gmail.com
NEXT_PUBLIC_WHATSAPP_NUMBER=393201886277
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 4. Crea account Admin

1. Supabase → Authentication → Users → Add user (email + password)
2. SQL Editor:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'tua-email@admin.com';
```

## 5. Google OAuth (opzionale)

1. Supabase → Authentication → Providers → Google → Enable
2. Aggiungi redirect URL: `http://localhost:3000/auth/callback`
3. In produzione: `https://garofalo-barberia.vercel.app/auth/callback`

## 6. Avvia in locale

```bash
npm install
npm run dev
```

- Sito: http://localhost:3000
- Prenota: http://localhost:3000/prenota
- Admin: http://localhost:3000/admin/login
- Cliente: http://localhost:3000/login

## 7. Deploy Vercel

Aggiungi le stesse variabili in Vercel → Project → Settings → Environment Variables.

Il build command è `npm run build`.