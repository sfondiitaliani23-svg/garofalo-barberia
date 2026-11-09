'use server';

import { requireAdmin, requireAdminView } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { SITE_URL } from '@/lib/seo';
import { SITE_CONFIG } from '@/lib/site-config';
import { cleanImpostazioni, IMPOSTAZIONI_KEY, type EliseoImpostazioni } from '@/lib/utils/eliseo-impostazioni';
import type { TrainingPrompt } from '@/lib/utils/eliseo-training';
import { PROMPTS_KEY, clearTrainingCache } from '@/lib/chat/eliseo-training-server';

// Impostazioni, profilo ed escalation dell'area Eliseo (sul modello di Keplero, 09/11/2026).
// Salvate in site_content con is_active = false: non si leggono dal sito pubblico. Nessuna migrazione.

const base = () => ({
  azienda: SITE_CONFIG.name,
  privacyUrl: `${SITE_URL}/privacy`,
  terminiUrl: '',
});

async function readKey(key: string): Promise<string | null> {
  const supabase = await createServiceClient();
  if (!supabase) return null;
  const { data } = await supabase.from('site_content').select('body').eq('key', key).maybeSingle();
  return (data?.body as string | undefined) ?? null;
}

async function writeKey(key: string, title: string, body: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };
  const now = new Date().toISOString();
  const { data: row } = await supabase.from('site_content').select('id').eq('key', key).maybeSingle();
  const res = row
    ? await supabase.from('site_content').update({ body, is_active: false, updated_at: now }).eq('id', row.id)
    : await supabase.from('site_content').insert({ key, title, body, is_active: false, updated_at: now });
  if (res.error) return { ok: false, error: res.error.message };
  return { ok: true };
}

export type EliseoAccount = { email: string | null; fullName: string | null; role: string };

export async function getImpostazioniAction(): Promise<
  { ok: true; impostazioni: EliseoImpostazioni; prompts: TrainingPrompt[]; account: EliseoAccount } | { ok: false; error: string }
> {
  const { profile } = await requireAdminView();
  const account: EliseoAccount = { email: profile.email, fullName: profile.full_name, role: profile.role };
  try {
    const [rawImp, rawPrompts] = await Promise.all([readKey(IMPOSTAZIONI_KEY), readKey(PROMPTS_KEY)]);
    let imp: unknown = {};
    try { imp = rawImp ? JSON.parse(rawImp) : {}; } catch { imp = {}; }
    return { ok: true, impostazioni: cleanImpostazioni(imp, base()), prompts: cleanPrompts(safeJson(rawPrompts)), account };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lettura impostazioni non riuscita.' };
  }
}

export async function saveImpostazioniAction(raw: unknown): Promise<{ ok: true; impostazioni: EliseoImpostazioni } | { ok: false; error: string }> {
  await requireAdmin();
  const clean = cleanImpostazioni(raw, base());
  const res = await writeKey(IMPOSTAZIONI_KEY, 'impostazioni Eliseo', JSON.stringify(clean));
  return res.ok ? { ok: true, impostazioni: clean } : res;
}

function safeJson(s: string | null): unknown {
  try { return s ? JSON.parse(s) : []; } catch { return []; }
}

const MAX_PROMPTS = 10;
const MAX_PROMPT_CHARS = 10000;

function cleanPrompts(raw: unknown): TrainingPrompt[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
    .map((p, i) => ({
      titolo: (typeof p.titolo === 'string' && p.titolo.trim() ? p.titolo.trim() : `Prompt ${i + 2}`).slice(0, 80),
      testo: (typeof p.testo === 'string' ? p.testo : '').slice(0, MAX_PROMPT_CHARS),
      attivo: typeof p.attivo === 'boolean' ? p.attivo : true,
    }))
    .slice(0, MAX_PROMPTS);
}

/** Prompt aggiuntivi (oltre al principale da 10.000 caratteri): fino a 10, ciascuno fino a 10.000 caratteri. */
export async function savePromptsAction(raw: unknown): Promise<{ ok: true; prompts: TrainingPrompt[] } | { ok: false; error: string }> {
  await requireAdmin();
  const prompts = cleanPrompts(raw);
  const res = await writeKey(PROMPTS_KEY, 'prompt aggiuntivi Eliseo', JSON.stringify(prompts));
  if (!res.ok) return res;
  clearTrainingCache();
  return { ok: true, prompts };
}

// ───────────────────────────────────────────────
// Google Sheet collegati (gratis): il foglio deve essere condiviso «Chiunque abbia il link».
// Si scarica come CSV e diventa un file dell'addestramento. «Aggiorna» lo riscarica.
// ───────────────────────────────────────────────

const SHEETS_KEY = 'eliseo:sheets';
export type SheetLink = { url: string; docId: string; titolo: string; aggiornato: string };

function sheetCsvUrl(url: string): string | null {
  const m = url.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/);
  if (!m) return null;
  const gid = url.match(/[#&?]gid=(\d+)/)?.[1] ?? '0';
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
}

async function readSheets(): Promise<SheetLink[]> {
  const raw = safeJson(await readKey(SHEETS_KEY));
  return Array.isArray(raw) ? (raw as SheetLink[]).filter((s) => s && typeof s.url === 'string' && typeof s.docId === 'string') : [];
}

export async function getSheetsAction(): Promise<SheetLink[]> {
  await requireAdminView();
  return readSheets();
}

export async function importGoogleSheetAction(input: { url: string; titolo?: string }): Promise<
  { ok: true; sheet: SheetLink; item: { id: string; titolo: string; testo: string; attivo: boolean; aggiornato_il?: string } } | { ok: false; error: string }
> {
  await requireAdmin();
  const url = String(input.url || '').trim();
  const csvUrl = sheetCsvUrl(url);
  if (!csvUrl) return { ok: false, error: 'Incolla il link di un foglio Google (docs.google.com/spreadsheets/…).' };
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  let csv = '';
  try {
    const res = await fetch(csvUrl, { cache: 'no-store', redirect: 'follow', signal: AbortSignal.timeout(15000) });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || type.includes('text/html')) {
      return { ok: false, error: 'Non riesco a leggere il foglio. In Google Sheets: Condividi → «Chiunque abbia il link» → Visualizzatore.' };
    }
    csv = (await res.text()).replace(/\r\n?/g, '\n').trim();
  } catch {
    return { ok: false, error: 'Google non ha risposto. Riprova tra poco.' };
  }
  if (csv.length < 3) return { ok: false, error: 'Il foglio è vuoto.' };

  const testo = csv.slice(0, 20000);
  const sheets = await readSheets();
  const prev = sheets.find((s) => s.url === url);
  const titolo = (input.titolo?.trim() || prev?.titolo || 'Google Sheet').slice(0, 100);
  const now = new Date().toISOString();

  const row = { titolo: `${titolo} (Google Sheet)`.slice(0, 120), testo, attivo: true, aggiornato_il: now };
  const q = prev
    ? supabase.from('eliseo_documenti').update(row).eq('id', prev.docId).select().single()
    : supabase.from('eliseo_documenti').insert(row).select().single();
  const { data, error } = await q;
  if (error || !data) return { ok: false, error: error?.message || 'Salvataggio non riuscito.' };

  const sheet: SheetLink = { url, docId: data.id as string, titolo, aggiornato: now };
  const next = [sheet, ...sheets.filter((s) => s.url !== url)].slice(0, 30);
  await writeKey(SHEETS_KEY, 'fogli Google collegati a Eliseo', JSON.stringify(next));
  clearTrainingCache();
  return { ok: true, sheet, item: data as { id: string; titolo: string; testo: string; attivo: boolean; aggiornato_il?: string } };
}

// ───────────────────────────────────────────────
// Calendario (come Keplero): calendari = barbieri, tipi di appuntamento = servizi, agenda dei prossimi 7 giorni.
// Legge le prenotazioni vere del sito. Il tester vede i nomi nascosti.
// ───────────────────────────────────────────────

export type CalendarioData = {
  barbieri: Array<{ id: string; nome: string; ruolo: string; attivo: boolean }>;
  servizi: Array<{ id: string; nome: string; minuti: number; prezzo: number; attivo: boolean }>;
  appuntamenti: Array<{ id: string; inizio: string; fine: string; barbiere: string; servizio: string; cliente: string; stato: string }>;
  orari: Array<{ giorno: string; orario: string }>;
};

export async function getCalendarioAction(): Promise<{ ok: true; data: CalendarioData } | { ok: false; error: string }> {
  const { tester } = await requireAdminView();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + 8 * 86_400_000);
  const [b, s, a] = await Promise.all([
    supabase.from('barbers').select('id, name, role, is_active').order('sort_order', { ascending: true }),
    supabase.from('services').select('id, name, duration_minutes, price_cents, is_active').order('sort_order', { ascending: true }),
    supabase
      .from('appointments')
      .select('id, starts_at, ends_at, status, customer_name, barber_id, service_id')
      .gte('starts_at', from.toISOString())
      .lt('starts_at', to.toISOString())
      .neq('status', 'cancelled')
      .order('starts_at', { ascending: true })
      .limit(500),
  ]);
  if (b.error || s.error || a.error) return { ok: false, error: (b.error || s.error || a.error)?.message || 'Lettura non riuscita.' };
  const barbieri = (b.data ?? []).map((x) => ({ id: x.id as string, nome: x.name as string, ruolo: (x.role as string) || '', attivo: x.is_active !== false }));
  const servizi = (s.data ?? []).map((x) => ({ id: x.id as string, nome: x.name as string, minuti: x.duration_minutes as number, prezzo: x.price_cents as number, attivo: x.is_active !== false }));
  const nomeS = new Map(servizi.map((x) => [x.id, x.nome]));
  const appuntamenti = (a.data ?? []).map((x) => ({
    id: x.id as string,
    inizio: x.starts_at as string,
    fine: x.ends_at as string,
    barbiere: (x.barber_id as string) || '',
    servizio: nomeS.get(x.service_id as string) || 'Servizio',
    cliente: tester ? 'Cliente' : ((x.customer_name as string) || 'Cliente'),
    stato: x.status as string,
  }));
  return {
    ok: true,
    data: { barbieri, servizi, appuntamenti, orari: SITE_CONFIG.detailedHours.map((h) => ({ giorno: h.day, orario: h.time })) },
  };
}
