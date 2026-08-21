import type { ServiceCategory } from '@/types/database';

export const CATEGORY_ORDER: ServiceCategory[] = ['taglio', 'baby', 'barba', 'styling'];

export const CATEGORY_META: Record<
  ServiceCategory,
  { label: string; subtitle: string }
> = {
  taglio: { label: 'Taglio', subtitle: 'Tagli precisi con shampoo incluso' },
  baby: { label: 'Baby', subtitle: 'Primi tagli con calma e pazienza' },
  barba: { label: 'Barba', subtitle: 'Rasature e modellature professionali' },
  styling: { label: 'Styling', subtitle: 'Acconciature e rifiniture' },
};

export const BABY_NOTE =
  'Sappiamo che portare un bambino dal barbiere può essere un\'avventura. Qui prendiamo tutto il tempo necessario: niente fretta, niente pressione. Se è la prima volta, scrivilo nelle note quando prenoti.';

/**
 * Restituisce true se il servizio è riservato alla gestione interna (Admin / Staff).
 * Taglio e shampoo e Taglio baby sono bloccati per le prenotazioni online esterne.
 */
export function isServiceAdminOnly(serviceName?: string | null): boolean {
  if (!serviceName) return false;
  const lower = serviceName.toLowerCase().trim();
  return lower.includes('taglio') || lower.includes('baby');
}

export function isServicePubliclyBookable(serviceName?: string | null): boolean {
  return !isServiceAdminOnly(serviceName);
}