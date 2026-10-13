import { getVapidKeys } from '@/lib/utils/push';

export const dynamic = 'force-dynamic';

/** Chiave pubblica per iscrivere il telefono alle notifiche. */
export async function GET() {
  const keys = await getVapidKeys();
  if (!keys) return Response.json({ error: 'non disponibile' }, { status: 503 });
  return Response.json({ publicKey: keys.publicKey }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
