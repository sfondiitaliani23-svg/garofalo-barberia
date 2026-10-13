import { createClient } from '@/lib/supabase/server';
import { sendPushToUser } from '@/lib/utils/push';

export const dynamic = 'force-dynamic';

/** Notifica di prova al proprio telefono. */
export async function POST() {
  const supabase = await createClient();
  if (!supabase) return new Response(null, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(null, { status: 401 });
  const sent = await sendPushToUser(user.id, {
    title: 'Notifiche attive ✂️',
    body: 'Da ora ricevi qui promemoria e novità di Barberia Garofalo.',
    url: '/area-cliente/appuntamenti',
    tag: 'test',
  });
  return Response.json({ sent });
}
