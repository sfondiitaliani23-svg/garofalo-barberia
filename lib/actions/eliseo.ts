'use server';

import { requireAdmin, requireAdminView } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { fetchAllRows } from '@/lib/utils/fetch-all';
import { maskForTester } from '@/lib/utils/tester-mask';
import {
  buildContatti,
  cleanModelli,
  cleanTags,
  isContactKey,
  ETICHETTE_KEY,
  MODELLI_INIZIALI,
  MODELLI_KEY,
  type ApptRow,
  type Contatto,
  type Modello,
} from '@/lib/utils/eliseo';

export type EliseoData =
  | { ok: true; contatti: Contatto[]; tester: boolean; modelli: Modello[] }
  | { ok: false; error: string };
type Res = { ok: true } | { ok: false; error: string };

type Supa = NonNullable<Awaited<ReturnType<typeof createServiceClient>>>;

/** Riga privata di site_content (is_active = false: non la legge nessuno tranne il server e l'admin). */
async function readJson<T>(supabase: Supa, key: string, fallback: T): Promise<T> {
  const { data } = await supabase.from('site_content').select('body').eq('key', key).maybeSingle();
  if (!data?.body) return fallback;
  try {
    return JSON.parse(data.body as string) as T;
  } catch {
    return fallback;
  }
}
async function writeJson(supabase: Supa, key: string, value: unknown) {
  const { error } = await supabase
    .from('site_content')
    .upsert({ key, title: 'Eliseo', body: JSON.stringify(value), is_active: false, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  return !error;
}

/**
 * Eliseo · rubrica dagli appuntamenti degli ultimi 2 anni (più quelli futuri), con etichette e modelli.
 * Solo lettura: admin, dipendente e tester (al tester arrivano nomi e numeri nascosti).
 */
export async function getEliseoAction(): Promise<EliseoData> {
  const { tester } = await requireAdminView();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };
  try {
    const since = new Date(Date.now() - 730 * 86_400_000).toISOString();
    const base = () =>
      supabase.from('appointments').select('customer_id', { count: 'exact', head: true }).gte('starts_at', since);
    const [rows, tags, modelli] = await Promise.all([
      fetchAllRows<ApptRow>(base, (from, to) =>
        supabase
          .from('appointments')
          .select('customer_id, customer_name, customer_phone, customer_email, starts_at, status, barber:barbers(name), service:services(name, category)')
          .gte('starts_at', since)
          .order('starts_at', { ascending: true })
          .range(from, to) as unknown as PromiseLike<{ data: ApptRow[] | null; error: unknown }>
      ),
      readJson<Record<string, string[]>>(supabase, ETICHETTE_KEY, {}),
      readJson<Modello[]>(supabase, MODELLI_KEY, MODELLI_INIZIALI),
    ]);
    const contatti = buildContatti(rows).map((c) => ({ ...c, etichette: cleanTags(tags[c.key] ?? []) }));
    // La chiave contiene telefono o email: al tester arriva solo un numero d'ordine.
    const safe = tester ? maskForTester(contatti).map((c, i) => ({ ...c, key: `c${i}`, customer_id: null })) : contatti;
    const m = cleanModelli(modelli);
    return { ok: true, tester, contatti: safe, modelli: m.ok ? m.modelli : MODELLI_INIZIALI };
  } catch {
    return { ok: false, error: 'Non riesco a leggere gli appuntamenti. Riprova tra poco.' };
  }
}

/** Salva le etichette di un contatto. Admin e dipendente (il tester viene fermato). */
export async function setEtichetteAction(key: string, etichette: string[]): Promise<Res & { etichette?: string[] }> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Permesso negato.' };
  }
  if (!isContactKey(key)) return { ok: false, error: 'Contatto non valido.' };
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };
  const tags = cleanTags(etichette);
  const all = await readJson<Record<string, string[]>>(supabase, ETICHETTE_KEY, {});
  if (tags.length) all[key] = tags;
  else delete all[key];
  if (Object.keys(all).length > 5000) return { ok: false, error: 'Troppe etichette salvate.' };
  return (await writeJson(supabase, ETICHETTE_KEY, all)) ? { ok: true, etichette: tags } : { ok: false, error: 'Salvataggio non riuscito. Riprova.' };
}

/** Salva tutti i modelli di messaggio. Admin e dipendente (il tester viene fermato). */
export async function saveModelliAction(list: Modello[]): Promise<Res & { modelli?: Modello[] }> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Permesso negato.' };
  }
  const m = cleanModelli(list);
  if (!m.ok) return m;
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };
  return (await writeJson(supabase, MODELLI_KEY, m.modelli)) ? { ok: true, modelli: m.modelli } : { ok: false, error: 'Salvataggio non riuscito. Riprova.' };
}
