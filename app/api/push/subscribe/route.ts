import { createClient } from '@/lib/supabase/server';
import { removeSubscription, saveSubscription } from '@/lib/utils/push';

export const dynamic = 'force-dynamic';

async function currentUserId() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Iscrive il telefono dell'utente collegato alle notifiche. */
export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: 'Accedi per attivare le notifiche' }, { status: 401 });
  let sub;
  try {
    sub = await request.json();
  } catch {
    return Response.json({ error: 'Dati non validi' }, { status: 400 });
  }
  const ok = await saveSubscription(userId, sub, request.headers.get('user-agent') ?? undefined);
  return Response.json({ ok }, { status: ok ? 200 : 400 });
}

/** Disattiva le notifiche su questo telefono. */
export async function DELETE(request: Request) {
  const userId = await currentUserId();
  if (!userId) return new Response(null, { status: 401 });
  try {
    const { endpoint } = await request.json();
    if (typeof endpoint === 'string') await removeSubscription(endpoint);
  } catch {
    /* niente da togliere */
  }
  return new Response(null, { status: 204 });
}
