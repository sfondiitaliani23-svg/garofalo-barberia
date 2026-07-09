'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  calculateDiscount,
  isPromotionActive,
  promotionAppliesToService,
} from '@/lib/utils/promotions';
import type { Promotion } from '@/types/database';

export async function getActivePromotions(): Promise<Promotion[]> {
  try {
    const supabase = await createClient();
    if (!supabase) return [];

    const { data } = await supabase
      .from('promotions')
      .select('*, service:services(id, name)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    const now = new Date();
    return (data ?? []).filter((p) => isPromotionActive(p, now));
  } catch {
    return [];
  }
}

export type ResolvedPromotion = {
  promotion: Promotion | null;
  discountCents: number;
  finalCents: number;
};

export async function resolvePromotionForBooking(
  serviceId: string,
  code?: string
): Promise<{ ok: true } & ResolvedPromotion | { ok: false; error: string }> {
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };

  const { data: service } = await supabase
    .from('services')
    .select('price_cents')
    .eq('id', serviceId)
    .single();

  if (!service) return { ok: false, error: 'Servizio non trovato' };

  const normalizedCode = code?.trim().toUpperCase() || null;

  if (normalizedCode) {
    const { data: promo } = await supabase
      .from('promotions')
      .select('*')
      .eq('code', normalizedCode)
      .eq('is_active', true)
      .maybeSingle();

    if (!promo) return { ok: false, error: 'Codice promozionale non valido' };
    if (!isPromotionActive(promo)) {
      return { ok: false, error: 'Questa promozione non è più attiva' };
    }
    if (!promotionAppliesToService(promo, serviceId)) {
      return { ok: false, error: 'Il codice non è valido per questo servizio' };
    }

    const { discountCents, finalCents } = calculateDiscount(service.price_cents, promo);
    return { ok: true, promotion: promo, discountCents, finalCents };
  }

  const { data: promos } = await supabase
    .from('promotions')
    .select('*')
    .eq('is_active', true)
    .is('code', null);

  const applicable = (promos ?? []).filter(
    (p) => isPromotionActive(p) && promotionAppliesToService(p, serviceId)
  );

  if (applicable.length === 0) {
    return {
      ok: true,
      promotion: null,
      discountCents: 0,
      finalCents: service.price_cents,
    };
  }

  let best = applicable[0];
  let bestDiscount = calculateDiscount(service.price_cents, best).discountCents;

  for (const promo of applicable.slice(1)) {
    const discount = calculateDiscount(service.price_cents, promo).discountCents;
    if (discount > bestDiscount) {
      best = promo;
      bestDiscount = discount;
    }
  }

  const { discountCents, finalCents } = calculateDiscount(service.price_cents, best);
  return { ok: true, promotion: best, discountCents, finalCents };
}

export async function validatePromotionCode(code: string, serviceId: string) {
  if (!code.trim()) return { ok: false as const, error: 'Inserisci un codice promozionale' };
  return resolvePromotionForBooking(serviceId, code);
}