import { SITE_CONFIG } from '@/lib/site-config';

export function minutesUntilAppointment(startsAt: string | Date): number {
  const start = typeof startsAt === 'string' ? new Date(startsAt) : startsAt;
  return (start.getTime() - Date.now()) / (1000 * 60);
}

export function canManageAppointment(startsAt: string | Date, isAdmin = false): boolean {
  if (isAdmin) return true;
  return minutesUntilAppointment(startsAt) >= SITE_CONFIG.cancellationMinutes;
}

export function manageAppointmentError(): string {
  return `Modifica o disdetta possibile solo fino a ${SITE_CONFIG.cancellationMinutes} minuti prima dell'appuntamento`;
}