import { getLiveStoriesFresh } from '@/lib/stories-server';

export const dynamic = 'force-dynamic';

/** Storie visibili in questo momento. La home la rilegge anche se la pagina è in cache. */
export async function GET(request: Request) {
  const lang = new URL(request.url).searchParams.get('lang') === 'en' ? 'en' : 'it';
  const slides = await getLiveStoriesFresh(lang);
  return Response.json({ slides }, { headers: { 'Cache-Control': 'no-store' } });
}
