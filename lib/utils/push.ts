import { createHash } from 'node:crypto';
import webpush from 'web-push';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * Notifiche sul telefono (Web Push): gratis, senza servizi esterni a pagamento.
 * Le chiavi VAPID si creano da sole al primo uso e restano nel database (riga privata "cfg:vapid").
 * Le iscrizioni dei telefoni sono righe private "push:<hash>" legate all'utente.
 */

type Vapid = { publicKey: string; privateKey: string };
export type PushPayload = { title: string; body: string; url?: string; tag?: string };
type StoredSub = { userId: string; sub: webpush.PushSubscription; at: string; ua?: string };

let cached: Vapid | null = null;

export async function getVapidKeys(): Promise<Vapid | null> {
  if (cached) return cached;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    cached = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
    return cached;
  }
  const supabase = await createServiceClient();
  if (!supabase) return null;
  const read = async () => {
    const { data } = await supabase.from('site_content').select('body').eq('key', 'cfg:vapid').maybeSingle();
    try {
      return data?.body ? (JSON.parse(data.body) as Vapid) : null;
    } catch {
      return null;
    }
  };
  let keys = await read();
  if (!keys) {
    const fresh = webpush.generateVAPIDKeys();
    await supabase
      .from('site_content')
      .insert({ key: 'cfg:vapid', title: 'chiavi notifiche', body: JSON.stringify(fresh), is_active: false, updated_at: new Date().toISOString() });
    keys = await read(); // se due richieste arrivano insieme vince la prima: rileggiamo
  }
  cached = keys;
  return keys;
}

async function configure() {
  const keys = await getVapidKeys();
  if (!keys) return false;
  webpush.setVapidDetails('mailto:info@barberiagarofalo.it', keys.publicKey, keys.privateKey);
  return true;
}

const subKey = (endpoint: string) => `push:${createHash('sha256').update(endpoint).digest('hex').slice(0, 40)}`;

export async function saveSubscription(userId: string, sub: webpush.PushSubscription, ua?: string) {
  const supabase = await createServiceClient();
  if (!supabase || !sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return false;
  const key = subKey(sub.endpoint);
  const body = JSON.stringify({ userId, sub, at: new Date().toISOString(), ua: ua?.slice(0, 120) } satisfies StoredSub);
  const { data } = await supabase.from('site_content').select('id').eq('key', key).maybeSingle();
  const { error } = data
    ? await supabase.from('site_content').update({ body, updated_at: new Date().toISOString() }).eq('id', data.id)
    : await supabase.from('site_content').insert({ key, title: 'notifiche', body, is_active: false, updated_at: new Date().toISOString() });
  return !error;
}

export async function removeSubscription(endpoint: string) {
  const supabase = await createServiceClient();
  if (!supabase) return;
  await supabase.from('site_content').delete().eq('key', subKey(endpoint));
}

export async function userSubscriptionCount(userId: string) {
  const supabase = await createServiceClient();
  if (!supabase) return 0;
  const { count } = await supabase
    .from('site_content')
    .select('id', { head: true, count: 'exact' })
    .like('key', 'push:%')
    .like('body', `%"userId":"${userId}"%`);
  return count ?? 0;
}

/** Invia a tutti i telefoni dell'utente. Le iscrizioni scadute vengono tolte. Torna quanti invii riusciti. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return 0;
  const supabase = await createServiceClient();
  if (!supabase || !(await configure())) return 0;
  const { data } = await supabase.from('site_content').select('key, body').like('key', 'push:%').like('body', `%"userId":"${userId}"%`).limit(20);
  let ok = 0;
  for (const row of data ?? []) {
    let s: StoredSub;
    try {
      s = JSON.parse(row.body ?? '{}');
    } catch {
      continue;
    }
    try {
      await webpush.sendNotification(s.sub, JSON.stringify(payload), { TTL: 60 * 60 * 12, urgency: 'normal' });
      ok++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await supabase.from('site_content').delete().eq('key', row.key);
    }
  }
  return ok;
}

/** Invia una sola volta per chiave (es. un promemoria per appuntamento), anche se il job gira più volte. */
export async function sendPushOnce(onceKey: string, userId: string, payload: PushPayload) {
  const supabase = await createServiceClient();
  if (!supabase) return 0;
  const { error } = await supabase
    .from('site_content')
    .insert({ key: `pushrem:${onceKey}`, title: 'notifica inviata', body: '{}', is_active: false, updated_at: new Date().toISOString() });
  if (error) return 0; // già inviata
  return sendPushToUser(userId, payload);
}

/** Invia a tutti i telefoni iscritti (avvisi del salone). Torna inviati e iscrizioni totali. */
export async function sendPushToAll(payload: PushPayload): Promise<{ sent: number; total: number; users: number }> {
  const supabase = await createServiceClient();
  if (!supabase || !(await configure())) return { sent: 0, total: 0, users: 0 };
  const rows: { key: string; body: string | null }[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data } = await supabase.from('site_content').select('key, body').like('key', 'push:%').range(from, from + 999);
    rows.push(...((data ?? []) as { key: string; body: string | null }[]));
    if (!data || data.length < 1000) break;
  }
  let sent = 0;
  const users = new Set<string>();
  const body = JSON.stringify(payload);
  for (let i = 0; i < rows.length; i += 20) {
    await Promise.all(
      rows.slice(i, i + 20).map(async (row) => {
        let s: StoredSub;
        try {
          s = JSON.parse(row.body ?? '{}');
        } catch {
          return;
        }
        try {
          await webpush.sendNotification(s.sub, body, { TTL: 60 * 60 * 24, urgency: 'normal' });
          sent++;
          users.add(s.userId);
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await supabase.from('site_content').delete().eq('key', row.key);
        }
      })
    );
  }
  return { sent, total: rows.length, users: users.size };
}

export async function pushAudience(): Promise<{ devices: number; users: number }> {
  const supabase = await createServiceClient();
  if (!supabase) return { devices: 0, users: 0 };
  const { data } = await supabase.from('site_content').select('body').like('key', 'push:%').limit(20000);
  const users = new Set<string>();
  for (const r of data ?? []) {
    try {
      users.add(JSON.parse(r.body ?? '{}').userId);
    } catch {
      /* riga non valida */
    }
  }
  return { devices: data?.length ?? 0, users: users.size };
}

export type BroadcastLog = { at: string; title: string; body: string; url: string; sent: number; users: number };
