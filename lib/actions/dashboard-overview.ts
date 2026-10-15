'use server';

import { requireAdminView } from '@/lib/auth';
import { maskForTester } from '@/lib/utils/tester-mask';
import { unstable_cache } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/server';
import type { OverviewData, OverviewApt } from '@/lib/utils/dashboard-overview';

const STATUS_CODE: Record<string, 0 | 1 | 2 | 3> = { confirmed: 0, completed: 1, cancelled: 2, no_show: 3 };

/**
 * Dati della dashboard admin: appuntamenti da inizio anno scorso (per il confronto
 * anno su anno), servizi, barbieri, nuovi clienti e ultime prenotazioni.
 * Tutto in forma compatta: i conti per periodo li fa la pagina, così il cambio
 * periodo è istantaneo.
 */
export async function getDashboardOverviewAction(): Promise<OverviewData> {
  const { tester } = await requireAdminView();
  const data = await buildOverviewCached();
  // Tester: i nomi dei clienti nelle ultime prenotazioni restano nascosti.
  return tester ? { ...data, recent: data.recent.map((r) => ({ ...r, name: 'Cliente' })) } : data;
}

/** I conti pesanti si fanno una volta ogni 30 secondi e si riusano (la pagina prima ricaricava tutto a ogni apertura). */
const buildOverviewCached = unstable_cache(buildOverview, ['admin-overview-v1'], { revalidate: 30, tags: ['admin-overview'] });

async function buildOverview(): Promise<OverviewData> {
  const now = new Date();
  const empty: OverviewData = { now: now.toISOString(), services: [], barbers: [], apts: [], customers: [], recent: [], unread: 0 };
  const supabase = await createServiceClient();
  if (!supabase) return empty;

  const from = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1)).toISOString();

  const [servicesRes, barbersRes, customersRes, recentRes, unreadRes] = await Promise.all([
    supabase.from('services').select('id, name, category, price_cents, duration_minutes'),
    supabase.from('barbers').select('id, name, image_url, is_active, sort_order').order('sort_order'),
    supabase.from('profiles').select('created_at').eq('role', 'customer').gte('created_at', from).limit(20000),
    supabase
      .from('appointments')
      .select('id, customer_name, starts_at, created_at, status, discount_cents, service:services(name, price_cents), barber:barbers(name)')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('site_content')
      .select('id', { head: true, count: 'exact' })
      .like('key', 'inbox:%')
      .not('body', 'like', '%"read":true%'),
  ]);

  // Appuntamenti a pagine da 1000 (limite di Supabase)
  type Row = { starts_at: string; status: string; discount_cents: number | null; service_id: string; barber_id: string; customer_id: string | null; customer_phone: string | null };
  // Prima si contano le righe, poi tutte le pagine si chiedono insieme (prima si aspettava una pagina alla volta).
  const rows: Row[] = [];
  const { count } = await supabase.from('appointments').select('id', { head: true, count: 'exact' }).gte('starts_at', from);
  const pages = Math.min(40, Math.max(1, Math.ceil((count ?? 0) / 1000)));
  const chunks = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      supabase
        .from('appointments')
        .select('starts_at, status, discount_cents, service_id, barber_id, customer_id, customer_phone')
        .gte('starts_at', from)
        .order('starts_at', { ascending: true })
        .range(i * 1000, i * 1000 + 999)
    )
  );
  for (const c of chunks) {
    if (c.error || !c.data) break;
    rows.push(...(c.data as Row[]));
  }

  const services = (servicesRes.data ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    category: s.category as string,
    price: (s.price_cents as number) ?? 0,
    minutes: (s.duration_minutes as number) ?? 0,
  }));
  const barbers = (barbersRes.data ?? []).map((b) => ({
    id: b.id as string,
    name: b.name as string,
    image: (b.image_url as string | null) ?? null,
    active: b.is_active !== false,
  }));
  const sIdx = new Map(services.map((s, i) => [s.id, i]));
  const bIdx = new Map(barbers.map((b, i) => [b.id, i]));
  const custIdx = new Map<string, number>();

  const apts: OverviewApt[] = [];
  for (const r of rows) {
    const si = sIdx.get(r.service_id);
    const bi = bIdx.get(r.barber_id);
    if (si === undefined || bi === undefined) continue;
    const key = r.customer_id ?? (r.customer_phone ? r.customer_phone.replace(/\D/g, '').slice(-9) : '');
    let ci = -1;
    if (key) {
      ci = custIdx.get(key) ?? custIdx.size;
      custIdx.set(key, ci);
    }
    const net = Math.max(0, services[si].price - (r.discount_cents ?? 0));
    apts.push([new Date(r.starts_at).getTime(), STATUS_CODE[r.status] ?? 0, net, si, bi, ci]);
  }

  const recent = (recentRes.data ?? []).map((a) => {
    const svc = (Array.isArray(a.service) ? a.service[0] : a.service) as { name?: string; price_cents?: number } | null;
    const brb = (Array.isArray(a.barber) ? a.barber[0] : a.barber) as { name?: string } | null;
    return {
      id: a.id as string,
      name: (a.customer_name as string) ?? 'Cliente',
      service: svc?.name ?? '',
      barber: brb?.name ?? '',
      amount: Math.max(0, (svc?.price_cents ?? 0) - ((a.discount_cents as number) ?? 0)),
      status: a.status as string,
      startsAt: a.starts_at as string,
      createdAt: a.created_at as string,
    };
  });

  return {
    now: now.toISOString(),
    services,
    barbers,
    apts,
    customers: (customersRes.data ?? []).map((c) => new Date(c.created_at as string).getTime()),
    recent,
    unread: unreadRes.count ?? 0,
  };
}
