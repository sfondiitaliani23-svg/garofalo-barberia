'use server';

import { requireAdminView } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { fetchAllRows } from '@/lib/utils/fetch-all';
import { maskForTester } from '@/lib/utils/tester-mask';
import { buildContatti, type ApptRow, type Contatto } from '@/lib/utils/eliseo';

export type EliseoData = { ok: true; contatti: Contatto[]; tester: boolean } | { ok: false; error: string };

/**
 * Eliseo · rubrica dagli appuntamenti degli ultimi 2 anni (più quelli futuri).
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
    const rows = await fetchAllRows<ApptRow>(base, (from, to) =>
      supabase
        .from('appointments')
        .select('customer_id, customer_name, customer_phone, customer_email, starts_at, status, barber:barbers(name), service:services(name, category)')
        .gte('starts_at', since)
        .order('starts_at', { ascending: true })
        .range(from, to) as unknown as PromiseLike<{ data: ApptRow[] | null; error: unknown }>
    );
    const contatti = buildContatti(rows);
    // La chiave contiene telefono o email: al tester arriva solo un numero d'ordine.
    const safe = tester ? maskForTester(contatti).map((c, i) => ({ ...c, key: `c${i}`, customer_id: null })) : contatti;
    return { ok: true, tester, contatti: safe };
  } catch {
    return { ok: false, error: 'Non riesco a leggere gli appuntamenti. Riprova tra poco.' };
  }
}
