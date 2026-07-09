import type { DiscountType, Promotion } from '@/types/database';

export interface DiscountResult {
  discountCents: number;
  finalCents: number;
}

export function calculateDiscount(priceCents: number, promotion: Pick<Promotion, 'discount_type' | 'discount_value'>): DiscountResult {
  let discountCents = 0;

  if (promotion.discount_type === 'percent') {
    discountCents = Math.round(priceCents * (promotion.discount_value / 100));
  } else {
    discountCents = promotion.discount_value;
  }

  discountCents = Math.min(Math.max(discountCents, 0), priceCents);

  return {
    discountCents,
    finalCents: priceCents - discountCents,
  };
}

export function isPromotionActive(
  promotion: Pick<Promotion, 'is_active' | 'starts_at' | 'ends_at'>,
  at: Date = new Date()
) {
  if (!promotion.is_active) return false;
  if (promotion.starts_at && new Date(promotion.starts_at) > at) return false;
  if (promotion.ends_at && new Date(promotion.ends_at) < at) return false;
  return true;
}

export function promotionAppliesToService(
  promotion: Pick<Promotion, 'service_id'>,
  serviceId: string
) {
  return !promotion.service_id || promotion.service_id === serviceId;
}

export function formatDiscountLabel(type: DiscountType, value: number) {
  if (type === 'percent') return `-${value}%`;
  return `-€${(value / 100).toFixed(0)}`;
}