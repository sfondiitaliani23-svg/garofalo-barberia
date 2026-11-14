import { createClient } from '@/lib/supabase/server';
import { sendPushToEndpoint, sendPushToUser } from '@/lib/utils/push';
import { isPushEndpoint } from '@/lib/utils/push-endpoint';

export const dynamic = 'force-dynamic';

/** Notifica di prova al proprio telefono. Senza account (14/11/2026): solo al telefono appena iscritto. */
export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return new Response(null, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const payload = {
    title: 'Notifiche attive',
    body: user ? 'Da ora ricevi qui promemoria e novità di Barberia Garofalo.' : 'Da ora ricevi qui le novità di Barberia Garofalo.',
    url: user ? '/area-cliente/appuntamenti' : '/',
    tag: 'test',
  };
  if (user) return Response.json({ sent: await sendPushToUser(user.id, payload) });
  let endpoint: unknown = '';
  try {
    endpoint = (await request.json())?.endpoint;
  } catch {
    endpoint = '';
  }
  if (!isPushEndpoint(endpoint)) return new Response(null, { status: 400 });
  return Response.json({ sent: await sendPushToEndpoint(endpoint as string, payload) });
}
