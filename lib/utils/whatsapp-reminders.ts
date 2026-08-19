import { SITE_CONFIG } from '@/lib/site-config';
import { formatShopBookingDateTime } from '@/lib/utils/booking-datetime';
import { normalizeItalianPhone } from '@/lib/utils/phone';

export interface ReminderPayload {
  customerName: string;
  customerPhone: string;
  serviceName: string;
  barberName: string;
  startsAt: Date;
}

/**
 * Genera il testo formattato del messaggio WhatsApp di promemoria.
 */
export function buildWhatsAppReminderMessage(data: ReminderPayload): string {
  const { dateStr, timeStr } = formatShopBookingDateTime(data.startsAt);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barberiagarofalo.it';

  return (
    `💈 *Garofalo Barberia — Promemoria Appuntamento*\n\n` +
    `Ciao *${data.customerName}*! Ti ricordiamo il tuo appuntamento:\n\n` +
    `✂️ *Servizio:* ${data.serviceName}\n` +
    `👤 *Barbiere:* ${data.barberName}\n` +
    `📅 *Data:* ${dateStr}\n` +
    `⏰ *Orario:* ${timeStr}\n` +
    `📍 *Indirizzo:* ${SITE_CONFIG.address}\n\n` +
    `Per visualizzare o gestire la prenotazione:\n${siteUrl}/area-cliente/appuntamenti\n\n` +
    `A presto!`
  );
}

/**
 * Genera il link wa.me diretto con il messaggio precompilato.
 */
export function getWhatsAppReminderUrl(data: ReminderPayload): string {
  const normalized = normalizeItalianPhone(data.customerPhone) || data.customerPhone.replace(/\D/g, '');
  const message = encodeURIComponent(buildWhatsAppReminderMessage(data));
  return `https://wa.me/${normalized}?text=${message}`;
}
