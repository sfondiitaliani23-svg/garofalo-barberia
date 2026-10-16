'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { getShopDateString } from '@/lib/utils/booking-datetime';
import { validateWaitlistInput, type WaitlistInput } from '@/lib/utils/waitlist';

/** Il cliente si mette in lista d'attesa per un giorno al completo. */
export async function joinWaitlist(input: WaitlistInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const checked = validateWaitlistInput(input, getShopDateString(new Date()));
    if (!checked.ok) return checked;
    const v = checked.value;

    const supabase = await createServiceClient();
    if (!supabase) return { ok: false, error: 'Servizio non disponibile. Riprova tra poco.' };

    const { error } = await supabase.from('waitlist_entries').insert({
      desired_date: v.date,
      barber_id: v.barberId,
      service_ids: v.serviceIds,
      customer_name: v.customerName,
      customer_phone: v.customerPhone,
      customer_email: v.customerEmail,
    });

    if (error) {
      if (error.code === '23505') return { ok: false, error: 'Sei già in lista per questo giorno. Ti avvisiamo via email.' };
      console.error('joinWaitlist failed:', error);
      return { ok: false, error: 'Non siamo riusciti a salvare la richiesta. Riprova.' };
    }
    return { ok: true };
  } catch (error) {
    console.error('joinWaitlist failed:', error);
    return { ok: false, error: 'Errore imprevisto. Riprova.' };
  }
}
