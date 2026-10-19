import { processAppointmentReminders } from '@/lib/utils/reminders';
import { processComebackReminders } from '@/lib/utils/comeback';
import { processReviewRequests } from '@/lib/utils/review-request';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV !== 'production';

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await processAppointmentReminders();
  // Promemoria "è ora di tornare": parte da solo una volta al giorno (10:30–11:00 di Roma).
  const comeback = await processComebackReminders().catch((e) => ({ ok: false as const, error: String(e) }));
  // Richiesta di recensione il giorno dopo la visita: spenta finché REVIEW_EMAILS non è 'on'.
  const reviews = await processReviewRequests().catch(() => ({ ok: false as const, error: 'errore' }));
  const status = result.ok ? 200 : 500;

  return Response.json({ ...result, comeback, reviews }, { status });
}

export async function POST(request: Request) {
  return GET(request);
}