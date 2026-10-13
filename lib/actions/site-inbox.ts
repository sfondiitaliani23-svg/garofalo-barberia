'use server';

import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * Posta del sito: feedback anonimi e candidature "Lavora con noi".
 * Salvati in site_content con is_active = false: per le regole del database
 * solo l'admin può leggerli (mai visibili al pubblico).
 */
export type InboxKind = 'feedback' | 'candidatura';

export type InboxItem = {
  id: string;
  kind: InboxKind;
  createdAt: string;
  read: boolean;
  data: Record<string, string | number | boolean | null>;
};

const PREFIX = 'inbox:';
const COOLDOWN_MS = 60_000;

function clean(value: unknown, max: number) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, max);
}

async function throttle(kind: InboxKind) {
  const jar = await cookies();
  const name = `gb_${kind}_sent`;
  const last = Number(jar.get(name)?.value ?? 0);
  if (Date.now() - last < COOLDOWN_MS) return false;
  jar.set(name, String(Date.now()), { httpOnly: true, sameSite: 'lax', secure: true, maxAge: 3600, path: '/' });
  return true;
}

async function pushToAdmin(title: string, message: string) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return;
  const baseUrl = (process.env.NTFY_URL ?? 'https://ntfy.sh').replace(/\/$/, '');
  const headers: Record<string, string> = {
    Title: title,
    Tags: 'envelope',
    Click: 'https://barberiagarofalo.it/admin/messaggi',
  };
  if (process.env.NTFY_TOKEN) headers.Authorization = `Bearer ${process.env.NTFY_TOKEN}`;
  try {
    await fetch(`${baseUrl}/${topic}`, { method: 'POST', headers, body: message });
  } catch {
    /* la notifica è un extra: il messaggio è già salvato */
  }
}

async function save(kind: InboxKind, title: string, data: Record<string, unknown>) {
  const supabase = await createServiceClient();
  if (!supabase) return false;
  const { error } = await supabase.from('site_content').insert({
    key: `${PREFIX}${kind}:${Date.now()}-${randomUUID().slice(0, 8)}`,
    title,
    body: JSON.stringify({ ...data, read: false }),
    is_active: false,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error('[site-inbox] salvataggio fallito:', error.message);
  return !error;
}

type Result = { ok: true } | { ok: false; error: string };

export async function submitFeedbackAction(input: { rating: number; message?: string; visit?: string; website?: string }): Promise<Result> {
  if (input.website) return { ok: true }; // campo trappola per i bot
  const rating = Math.round(Number(input.rating));
  if (!(rating >= 1 && rating <= 5)) return { ok: false, error: 'Scegli un voto da 1 a 5.' };
  const message = clean(input.message, 1500);
  const visit = clean(input.visit, 80);
  if (!(await throttle('feedback'))) return { ok: false, error: 'Hai appena inviato un feedback. Riprova tra un minuto.' };
  const ok = await save('feedback', `${rating}/5`, { rating, message, visit });
  if (!ok) return { ok: false, error: 'Invio non riuscito. Riprova tra poco.' };
  await pushToAdmin(`Nuovo feedback anonimo: ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`, message || '(nessun commento)');
  return { ok: true };
}

export async function submitApplicationAction(input: {
  name: string;
  phone: string;
  email?: string;
  role: string;
  experience: string;
  link?: string;
  message?: string;
  consent: boolean;
  website?: string;
}): Promise<Result> {
  if (input.website) return { ok: true };
  const name = clean(input.name, 80);
  const phone = clean(input.phone, 30);
  const email = clean(input.email, 120);
  const role = clean(input.role, 40);
  const experience = clean(input.experience, 40);
  const link = clean(input.link, 200);
  const message = clean(input.message, 2000);
  if (name.length < 2) return { ok: false, error: 'Scrivi il tuo nome.' };
  if (phone.replace(/\D/g, '').length < 8) return { ok: false, error: 'Scrivi un numero di telefono valido.' };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Controlla l'email." };
  if (!input.consent) return { ok: false, error: 'Serve il consenso al trattamento dei dati per valutare la candidatura.' };
  if (link && !/^https?:\/\//i.test(link) && !link.startsWith('@')) return { ok: false, error: 'Il link deve iniziare con https:// oppure con @.' };
  if (!(await throttle('candidatura'))) return { ok: false, error: 'Hai appena inviato una candidatura. Riprova tra un minuto.' };
  const ok = await save('candidatura', name, { name, phone, email, role, experience, link, message, consentAt: new Date().toISOString() });
  if (!ok) return { ok: false, error: 'Invio non riuscito. Riprova tra poco.' };
  await pushToAdmin(`Nuova candidatura: ${name}`, `${role} · ${experience}\n${phone}`);
  return { ok: true };
}

// ─── Admin ──────────────────────────────────────────────────────────────────

export async function getInboxAction(): Promise<InboxItem[]> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('site_content')
    .select('id, key, body, updated_at')
    .like('key', `${PREFIX}%`)
    .order('updated_at', { ascending: false })
    .limit(500);
  return (data ?? []).map((row) => {
    let parsed: Record<string, string | number | boolean | null> = {};
    try {
      parsed = JSON.parse(row.body ?? '{}');
    } catch {
      /* corpo non valido */
    }
    const kind = (row.key as string).split(':')[1] as InboxKind;
    const { read, ...rest } = parsed;
    return { id: row.id as string, kind, createdAt: row.updated_at as string, read: read === true, data: rest };
  });
}

export async function markInboxReadAction(id: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false };
  const { data } = await supabase.from('site_content').select('key, body').eq('id', id).maybeSingle();
  if (!data || !(data.key as string).startsWith(PREFIX)) return { ok: false };
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(data.body ?? '{}');
  } catch {
    /* ignora */
  }
  const { error } = await supabase.from('site_content').update({ body: JSON.stringify({ ...body, read: true }) }).eq('id', id);
  return { ok: !error };
}

export async function deleteInboxItemAction(id: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false };
  const { error } = await supabase.from('site_content').delete().eq('id', id).like('key', `${PREFIX}%`);
  return { ok: !error };
}

/** Scansioni dei QR negli ultimi 90 giorni (visite con ?qr=..., solo con consenso statistiche). */
export async function getQrScanCountsAction(): Promise<Record<string, number>> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return {};
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const counts: Record<string, number> = {};
  for (let from = 0; from < 20000; from += 1000) {
    const { data } = await supabase
      .from('page_views')
      .select('path')
      .like('path', '%qr=%')
      .gte('viewed_at', since)
      .range(from, from + 999);
    for (const r of data ?? []) {
      const m = /[?&]qr=([a-z0-9-]+)/i.exec(r.path as string);
      if (m) counts[m[1]] = (counts[m[1]] ?? 0) + 1;
    }
    if (!data || data.length < 1000) break;
  }
  return counts;
}
