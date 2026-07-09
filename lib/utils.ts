import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(cents: number): string {
  return `€${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function formatDuration(minutes: number): string {
  return `${minutes} min`;
}

/** Corregge testi ruolo barbiere corrotti da encoding (es. "Titolare A." → "Titolare · ..."). */
export function formatBarberRole(role: string): string {
  return role
    .replace(/Â·/g, '·')
    .replace(/Ã¨/g, 'è')
    .replace(/Titolare\s*A\.?\s*/i, 'Titolare · ')
    .replace(/\s*·\s*/g, ' · ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}