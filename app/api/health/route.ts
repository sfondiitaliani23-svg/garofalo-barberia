import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/** Tabelle usate dal codice: devono esistere tutte nel database. */
const TABLES = [
  'appointments', 'services', 'profiles', 'barbers', 'visitor_sessions', 'promotions', 'products',
  'site_issues', 'barber_time_off', 'barber_availability', 'customer_photos', 'reviews',
  'qr_login_sessions', 'page_views', 'site_content',
];

/** Variabili per i servizi esterni. Si controlla solo che ci siano, mai il valore. */
const SERVICE_ENV: Record<string, string[]> = {
  database_admin: ['SUPABASE_SERVICE_ROLE_KEY'],
  email: ['RESEND_API_KEY', 'RESEND_FROM'],
  cron: ['CRON_SECRET'],
  push_admin_ntfy: ['NTFY_TOPIC'],
  sito: ['NEXT_PUBLIC_SITE_URL'],
};

function whatsappEnv(): string[] {
  const provider = (process.env.WHATSAPP_PROVIDER ?? 'green').toLowerCase();
  if (provider === 'green') return ['GREEN_API_INSTANCE_ID', 'GREEN_API_TOKEN'];
  if (provider === 'twilio') return ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_FROM'];
  if (provider === 'meta') return ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'];
  return ['WHATSAPP_PROVIDER'];
}

/**
 * GET /api/health
 * Checks liveness of the site and its critical dependencies.
 * Returns 200 when all systems are operational, 503 when degraded.
 */
export async function GET(request: Request) {
  const start = Date.now();
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // ── 1. API layer (this endpoint itself) ─────────────────────────────────
  checks.api = { ok: true };

  // ── 2. Database (Supabase) ──────────────────────────────────────────────
  try {
    const supabase = await createClient();
    if (!supabase) {
      checks.database = { ok: false, detail: 'Supabase client non inizializzato' };
    } else {
      const { error } = await supabase.from('services').select('id').limit(1);
      checks.database = error
        ? { ok: false, detail: error.message }
        : { ok: true };
    }
  } catch (err) {
    checks.database = { ok: false, detail: String(err) };
  }

  // ── 3. Environment variables ─────────────────────────────────────────────
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];
  const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);
  checks.environment = missingEnvVars.length === 0
    ? { ok: true }
    : { ok: false, detail: `Missing: ${missingEnvVars.join(', ')}` };

  // ── 4. Controllo dettagliato (solo con la chiave del cron) ─────────────
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (secret && auth === `Bearer ${secret}`) {
    const admin = await createServiceClient().catch(() => null);
    for (const table of TABLES) {
      try {
        if (!admin) {
          checks[`tabella_${table}`] = { ok: false, detail: 'service client non disponibile' };
          continue;
        }
        const { error } = await admin.from(table).select('*', { head: true, count: 'exact' }).limit(1);
        checks[`tabella_${table}`] = error ? { ok: false, detail: error.message } : { ok: true };
      } catch (err) {
        checks[`tabella_${table}`] = { ok: false, detail: String(err) };
      }
    }
    const envGroups = { ...SERVICE_ENV, whatsapp: whatsappEnv() };
    for (const [name, vars] of Object.entries(envGroups)) {
      const missing = vars.filter((v) => !process.env[v]);
      checks[`config_${name}`] = missing.length === 0 ? { ok: true } : { ok: false, detail: `Manca: ${missing.join(', ')}` };
    }
  }

  // ── Result ──────────────────────────────────────────────────────────────
  const allOk = Object.values(checks).every(c => c.ok);
  const degraded = !checks.database.ok;

  return NextResponse.json(
    {
      status: allOk ? 'ok' : degraded ? 'degraded' : 'error',
      checks,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - start,
      version: process.env.npm_package_version ?? '2.0.0',
    },
    { status: allOk ? 200 : 503 }
  );
}
