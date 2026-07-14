import { NextResponse } from 'next/server';
import { SITE_CONFIG } from '@/lib/site-config';

/**
 * GET /api/cron/monitor
 *
 * Monitoring agent — runs every 5 minutes via Vercel Cron.
 * Checks the /api/health endpoint and sends a WhatsApp alert
 * to the admin if the site is degraded or down.
 *
 * Secured with CRON_SECRET to prevent unauthorized calls.
 */
export const runtime = 'nodejs';
export const maxDuration = 30;

interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  checks: Record<string, { ok: boolean; detail?: string }>;
  timestamp: string;
  duration_ms: number;
}

async function sendWhatsAppAlert(message: string): Promise<void> {
  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? SITE_CONFIG.whatsapp;
  const encoded = encodeURIComponent(message);
  const waUrl = `https://wa.me/${waNumber}?text=${encoded}`;

  // Log the alert — in production you can integrate Twilio or Meta Cloud API
  // to send this message programmatically. For now we log it for manual review.
  console.error('[MONITOR AGENT] 🚨 ALERT — WhatsApp da inviare a:', waNumber);
  console.error('[MONITOR AGENT] Messaggio:', message);
  console.error('[MONITOR AGENT] Link diretto:', waUrl);

  // Optional: if TWILIO_ACCOUNT_SID is set, send via Twilio
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM) {
    try {
      const credentials = Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
      ).toString('base64');

      await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: process.env.TWILIO_WHATSAPP_FROM,
            To: `whatsapp:+${waNumber}`,
            Body: message,
          }),
        }
      );
      console.log('[MONITOR AGENT] ✅ Alert WhatsApp inviato via Twilio');
    } catch (err) {
      console.error('[MONITOR AGENT] Twilio send error:', err);
    }
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  // ── Auth check ───────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteOrigin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://garofalo-barberia.vercel.app';

  const agentLog: string[] = [];
  const timestamp = new Date().toISOString();

  agentLog.push(`[${timestamp}] 🤖 Monitor Agent avviato`);

  let health: HealthResponse | null = null;
  let fetchOk = false;

  // ── 1. Ping /api/health ──────────────────────────────────────────────────
  try {
    const res = await fetch(`${siteOrigin}/api/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    health = (await res.json()) as HealthResponse;
    fetchOk = res.ok;
    agentLog.push(`[HEALTH] status=${health.status} duration=${health.duration_ms}ms`);
  } catch (err) {
    agentLog.push(`[HEALTH] ❌ Fetch fallito: ${String(err)}`);
  }

  // ── 2. Evaluate status ───────────────────────────────────────────────────
  const isSiteDown = !fetchOk || !health || health.status === 'error';
  const isDegraded = health?.status === 'degraded';
  const hasIssue = isSiteDown || isDegraded;

  // ── 3. Alert if needed ───────────────────────────────────────────────────
  if (hasIssue) {
    const severity = isSiteDown ? '🔴 CRITICO' : '🟡 DEGRADATO';
    const failedChecks = health?.checks
      ? Object.entries(health.checks)
          .filter(([, v]) => !v.ok)
          .map(([k, v]) => `  • ${k}: ${v.detail ?? 'errore'}`)
          .join('\n')
      : '  • Sito non raggiungibile';

    const alertMessage =
      `🚨 ${severity} — Barberia Garofalo\n\n` +
      `Il sito presenta problemi!\n\n` +
      `🔍 Problemi rilevati:\n${failedChecks}\n\n` +
      `⏰ Rilevato alle: ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}\n` +
      `🌐 URL: ${siteOrigin}\n\n` +
      `Controlla subito la dashboard Vercel:\nhttps://vercel.com/dashboard`;

    agentLog.push('[ALERT] 🚨 Invio notifica...');
    await sendWhatsAppAlert(alertMessage);
    agentLog.push('[ALERT] ✅ Notifica processata');
  } else {
    agentLog.push('[STATUS] ✅ Tutti i sistemi operativi');
  }

  return NextResponse.json({
    agent: 'monitoring-agent-v1',
    timestamp,
    site: siteOrigin,
    overall_status: hasIssue ? (isSiteDown ? 'critical' : 'degraded') : 'operational',
    health,
    log: agentLog,
  });
}
