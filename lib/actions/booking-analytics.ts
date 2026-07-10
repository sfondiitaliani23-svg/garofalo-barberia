'use server';

import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

export interface ServiceRanking {
  id: string;
  name: string;
  count: number;
  revenueCents: number;
}

export interface CustomerRanking {
  key: string;
  name: string;
  phone: string;
  customerId: string | null;
  count: number;
}

export interface BarberRanking {
  id: string;
  name: string;
  count: number;
}

export interface MonthlyBookings {
  month: string;
  label: string;
  count: number;
}

export interface BookingAnalytics {
  configured: boolean;
  totalBookings: number;
  activeBookings: number;
  cancelledBookings: number;
  completedBookings: number;
  totalRevenueCents: number;
  averageTicketCents: number;
  mostRequestedService: ServiceRanking | null;
  topServices: ServiceRanking[];
  mostLoyalCustomer: CustomerRanking | null;
  topCustomers: CustomerRanking[];
  topBarbers: BarberRanking[];
  bookingsByMonth: MonthlyBookings[];
}

function emptyAnalytics(): BookingAnalytics {
  return {
    configured: false,
    totalBookings: 0,
    activeBookings: 0,
    cancelledBookings: 0,
    completedBookings: 0,
    totalRevenueCents: 0,
    averageTicketCents: 0,
    mostRequestedService: null,
    topServices: [],
    mostLoyalCustomer: null,
    topCustomers: [],
    topBarbers: [],
    bookingsByMonth: [],
  };
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '');
}

function customerKey(customerId: string | null, name: string, phone: string) {
  if (customerId) return `id:${customerId}`;
  const normalized = normalizePhone(phone);
  if (normalized) return `phone:${normalized}`;
  return `name:${name.trim().toLowerCase()}`;
}

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function getBookingAnalytics(): Promise<BookingAnalytics> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return emptyAnalytics();

  const [{ data: appointments }, { data: allServices }] = await Promise.all([
    supabase
      .from('appointments')
      .select(`
        id,
        customer_id,
        customer_name,
        customer_phone,
        status,
        starts_at,
        discount_cents,
        service_id,
        barber_id,
        service:services(id, name, price_cents),
        barber:barbers(id, name)
      `),
    supabase.from('services').select('id, name, price_cents').eq('is_active', true),
  ]);

  const rows = appointments ?? [];

  let activeBookings = 0;
  let cancelledBookings = 0;
  let completedBookings = 0;
  let totalRevenueCents = 0;
  let revenueCount = 0;

  const serviceMap = new Map<string, ServiceRanking>();
  const customerMap = new Map<string, CustomerRanking>();
  const barberMap = new Map<string, BarberRanking>();
  const monthMap = new Map<string, number>();

  for (const apt of rows) {
    const status = apt.status as string;

    if (status === 'cancelled') cancelledBookings += 1;
    else if (status === 'completed') completedBookings += 1;
    else if (status === 'confirmed') activeBookings += 1;

    const monthKey = format(new Date(apt.starts_at), 'yyyy-MM');
    monthMap.set(monthKey, (monthMap.get(monthKey) ?? 0) + 1);

    const service = unwrapRelation(apt.service as { id: string; name: string; price_cents: number } | { id: string; name: string; price_cents: number }[] | null);
    if (service && status !== 'cancelled') {
      const existing = serviceMap.get(service.id) ?? {
        id: service.id,
        name: service.name,
        count: 0,
        revenueCents: 0,
      };
      existing.count += 1;
      if (status === 'confirmed' || status === 'completed') {
        const net = Math.max(0, service.price_cents - (apt.discount_cents ?? 0));
        existing.revenueCents += net;
        totalRevenueCents += net;
        revenueCount += 1;
      }
      serviceMap.set(service.id, existing);
    }

    if (status !== 'cancelled') {
      const key = customerKey(apt.customer_id, apt.customer_name, apt.customer_phone);
      const existing = customerMap.get(key) ?? {
        key,
        name: apt.customer_name,
        phone: apt.customer_phone,
        customerId: apt.customer_id,
        count: 0,
      };
      existing.count += 1;
      customerMap.set(key, existing);

      const barber = unwrapRelation(apt.barber as { id: string; name: string } | { id: string; name: string }[] | null);
      if (barber) {
        const barberExisting = barberMap.get(barber.id) ?? {
          id: barber.id,
          name: barber.name,
          count: 0,
        };
        barberExisting.count += 1;
        barberMap.set(barber.id, barberExisting);
      }
    }
  }

  const topServices = (allServices ?? [])
    .map((service) => {
      const ranked = serviceMap.get(service.id);
      return {
        id: service.id,
        name: service.name,
        count: ranked?.count ?? 0,
        revenueCents: ranked?.revenueCents ?? 0,
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'it'))
    .slice(0, 5);

  const topCustomers = [...customerMap.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'it'))
    .slice(0, 5);
  const topBarbers = [...barberMap.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  const bookingsByMonth = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, count]) => ({
      month,
      label: format(new Date(`${month}-01`), 'MMM yyyy', { locale: it }),
      count,
    }));

  return {
    configured: true,
    totalBookings: rows.length,
    activeBookings,
    cancelledBookings,
    completedBookings,
    totalRevenueCents,
    averageTicketCents: revenueCount > 0 ? Math.round(totalRevenueCents / revenueCount) : 0,
    mostRequestedService: topServices[0] ?? null,
    topServices,
    mostLoyalCustomer: topCustomers[0] ?? null,
    topCustomers,
    topBarbers,
    bookingsByMonth,
  };
}