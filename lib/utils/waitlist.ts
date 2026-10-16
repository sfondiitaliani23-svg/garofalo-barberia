import { isValidCustomerEmail } from '@/lib/utils/customer-email';

export interface WaitlistInput {
  date: string;
  barberId: string | null;
  serviceIds: string[];
  customerName: string;
  customerPhone: string;
  customerEmail: string;
}

export interface WaitlistValue {
  date: string;
  barberId: string | null;
  serviceIds: string[];
  customerName: string;
  customerPhone: string;
  customerEmail: string;
}

/** Controlla i dati della lista d'attesa. `today` è il giorno di oggi nel salone (aaaa-mm-gg). */
export function validateWaitlistInput(
  input: WaitlistInput,
  today: string
): { ok: true; value: WaitlistValue } | { ok: false; error: string } {
  const customerName = input.customerName?.trim() ?? '';
  const customerPhone = input.customerPhone?.trim() ?? '';
  const customerEmail = input.customerEmail?.trim() ?? '';
  if (customerName.length < 2 || customerName.length > 120) {
    return { ok: false, error: 'Scrivi il tuo nome.' };
  }
  if (customerPhone.replace(/\D/g, '').length < 6 || customerPhone.length > 30) {
    return { ok: false, error: 'Scrivi un numero di telefono valido.' };
  }
  if (!isValidCustomerEmail(customerEmail)) {
    return { ok: false, error: 'Scrivi un’email valida: ti avvisiamo lì.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date ?? '') || input.date < today) {
    return { ok: false, error: 'Scegli un giorno valido.' };
  }
  const serviceIds = Array.isArray(input.serviceIds) ? input.serviceIds.filter((s) => typeof s === 'string' && s) : [];
  if (serviceIds.length === 0 || serviceIds.length > 8) {
    return { ok: false, error: 'Scegli almeno un servizio.' };
  }
  return {
    ok: true,
    value: { date: input.date, barberId: input.barberId || null, serviceIds, customerName, customerPhone, customerEmail },
  };
}

/** Quante persone avvisare: una per ogni posto libero, al massimo 3. */
export function howManyToNotify(freeSlots: number, waiting: number): number {
  return Math.max(0, Math.min(freeSlots, waiting, 3));
}
