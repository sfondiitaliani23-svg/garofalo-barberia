import { processReviewRequests } from '@/lib/utils/review-request';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV !== 'production';
  return request.headers.get('authorization') === `Bearer ${cronSecret}`;
}

/** ?dry=1 mostra quante email partirebbero, senza inviare. ?force=1 invia anche fuori orario (serve REVIEW_EMAILS=on). */
export async function GET(request: Request) {
  if (!isAuthorized(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const result = await processReviewRequests({ dry: url.searchParams.get('dry') === '1', force: url.searchParams.get('force') === '1' });
  return Response.json(result, { status: result.ok ? 200 : 500 });
}
