import { createClient } from '@/lib/supabase/server';
import { removeSubscription, saveSubscription } from '@/lib/utils/push';
import { isPushEndpoint } from '@/lib/utils/push-endpoint';

export const dynamic = 'force-dynamic';

async function currentUserId() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Iscrive questo telefono alle notifiche. Con l'account: anche i promemoria; senza (14/11/2026): solo gli avvisi del salone. */
export async function POST(request: Request) {
  const userId = (await currentUserId()) ?? '';
  let sub;
  try {
    sub = await request.json();
  } catch {
    return Response.json({ error: 'Dati non validi' }, { status: 400 });
  }
  if (!isPushEndpoint(sub?.endpoint)) return Response.json({ error: 'Dati non validi' }, { status: 400 });
  const ok = await saveSubscription(userId, sub, request.headers.get('user-agent') ?? undefined);
  return Response.json({ ok }, { status: ok ? 200 : 400 });
}

/** Disattiva le notifiche su questo telefono (serve l'indirizzo segreto del telefono, anche senza account). */
export async function DELETE(request: Request) {
  try {
    const { endpoint } = await request.json();
    if (typeof endpoint === 'string') await removeSubscription(endpoint);
  } catch {
    /* niente da togliere */
  }
  return new Response(null, { status: 204 });
}
