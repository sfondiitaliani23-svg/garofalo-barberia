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
 * Tutti i servizi del listino (Taglio e shampoo, Taglio baby, Barba, Styling) sono regolarmente prenotabili online.
 */
export function isServiceAdminOnly(serviceName?: string | null): boolean {
  return false;
}

export function isServicePubliclyBookable(serviceName?: string | null): boolean {
  return true;
}