import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/health
 * Checks liveness of the site and its critical dependencies.
 * Returns 200 when all systems are operational, 503 when degraded.
 */
export async function GET() {
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
