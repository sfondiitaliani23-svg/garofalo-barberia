import type { Barber, Service } from '@/types/database';

export const FALLBACK_SERVICES: Service[] = [
  { id: '1', name: 'Taglio e shampoo', description: null, category: 'taglio', price_cents: 1700, duration_minutes: 30, is_active: true, sort_order: 1 },
  { id: '2', name: 'Taglio baby', description: null, category: 'baby', price_cents: 1300, duration_minutes: 25, is_active: true, sort_order: 2 },
  { id: '3', name: 'Barba rasata / lama', description: null, category: 'barba', price_cents: 600, duration_minutes: 15, is_active: true, sort_order: 3 },
  { id: '4', name: 'Barba modellata a forbici', description: null, category: 'barba', price_cents: 800, duration_minutes: 20, is_active: true, sort_order: 4 },
  { id: '5', name: 'Barba con panno caldo', description: null, category: 'barba', price_cents: 1000, duration_minutes: 25, is_active: true, sort_order: 5 },
  { id: '6', name: 'Shampoo e acconciatura', description: null, category: 'styling', price_cents: 800, duration_minutes: 15, is_active: true, sort_order: 6 },
];

export const FALLBACK_BARBERS: Barber[] = [
  { id: '1', name: 'Luigi Garofalo', role: 'Titolare · Barbiere professionista', image_url: '/assets/sostituisci-immagini/team/luigi-garofalo.png', bio: null, is_active: true, sort_order: 1 },
  { id: '2', name: 'Vittorio Morlino', role: 'Barbiere professionista', image_url: '/assets/sostituisci-immagini/team/vittorio-morlino.png', bio: null, is_active: true, sort_order: 2 },
  { id: '3', name: 'Francesco Costantino', role: 'Barbiere professionista', image_url: '/assets/sostituisci-immagini/team/francesco-costantino.png', bio: null, is_active: true, sort_order: 3 },
];