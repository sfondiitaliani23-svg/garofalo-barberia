import { createServiceClient } from '@/lib/supabase/server';
import { LIVE_VISITOR_WINDOW_MS } from '@/lib/analytics/live-config';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidVisitorSessionId(id: string) {
  return UUID_REGEX.test(id);
}

export async function touchVisitorSession(sessionId: string) {
  const supabase = await createServiceClient();
  if (!supabase || !isValidVisitorSessionId(sessionId)) return false;

  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from('visitor_sessions')
    .select('id')
    .eq('id', sessionId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('visitor_sessions')
      .update({ last_seen_at: now })
      .eq('id', sessionId);
    return !error;
  }

  const { error } = await supabase.from('visitor_sessions').insert({
    id: sessionId,
    last_seen_at: now,
    first_seen_at: now,
  });

  return !error;
}

/** Rimuove il visitatore dal conteggio live (tab chiusa o in background). */
export async function endVisitorSession(sessionId: string) {
  const supabase = await createServiceClient();
  if (!supabase || !isValidVisitorSessionId(sessionId)) return false;

  const { error } = await supabase
    .from('visitor_sessions')
    .update({ last_seen_at: new Date(0).toISOString() })
    .eq('id', sessionId);

  return !error;
}

export function getLiveVisitorCutoff() {
  return new Date(Date.now() - LIVE_VISITOR_WINDOW_MS);
}

export async function countLiveVisitors() {
  const supabase = await createServiceClient();
  if (!supabase) return 0;

  const { count } = await supabase
    .from('visitor_sessions')
    .select('*', { count: 'exact', head: true })
    .gte('last_seen_at', getLiveVisitorCutoff().toISOString());

  return count ?? 0;
}