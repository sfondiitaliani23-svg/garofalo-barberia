import { Resend } from 'resend';
import { SITE_CONFIG } from '@/lib/site-config';
import { formatItalianDate } from '@/lib/utils/slots';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface BookingNotificationData {
  serviceName: string;
  priceCents: number;
  barberName: string;
  startsAt: Date;
  customerName: string;
  customerPhone: string;
  notes?: string;
}

export function buildWhatsAppBookingMessage(data: BookingNotificationData): string {
  const dateStr = formatItalianDate(data.startsAt);
  const timeStr = data.startsAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const price = `€${(data.priceCents / 100).toFixed(0)}`;

  return (
    `Ciao Garofalo Barberia! Ho prenotato:\n\n` +
    `Servizio: ${data.serviceName} (${price})\n` +
    `Barbiere: ${data.barberName}\n` +
    `Data: ${dateStr}\n` +
    `Orario: ${timeStr}\n\n` +
    `Nome: ${data.customerName}\n` +
    `Telefono: ${data.customerPhone}` +
    (data.notes ? `\nNote: ${data.notes}` : '')
  );
}

export function getWhatsAppBookingUrl(data: BookingNotificationData): string {
  const message = encodeURIComponent(buildWhatsAppBookingMessage(data));
  return `https://wa.me/${SITE_CONFIG.whatsapp}?text=${message}`;
}

export async function sendAdminBookingEmail(data: BookingNotificationData) {
  if (!resend || !process.env.ADMIN_EMAIL) return { ok: false, reason: 'not_configured' };

  const dateStr = formatItalianDate(data.startsAt);
  const timeStr = data.startsAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const price = `€${(data.priceCents / 100).toFixed(0)}`;

  try {
    await resend.emails.send({
      from: 'Garofalo Barberia <onboarding@resend.dev>',
      to: process.env.ADMIN_EMAIL,
      subject: `Nuova prenotazione — ${data.customerName} — ${dateStr} ${timeStr}`,
      html: `
        <h2>Nuova prenotazione online</h2>
        <p><strong>Cliente:</strong> ${data.customerName} (${data.customerPhone})</p>
        <p><strong>Servizio:</strong> ${data.serviceName} — ${price}</p>
        <p><strong>Barbiere:</strong> ${data.barberName}</p>
        <p><strong>Data:</strong> ${dateStr} alle ${timeStr}</p>
        ${data.notes ? `<p><strong>Note:</strong> ${data.notes}</p>` : ''}
        <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/prenotazioni">Vedi calendario admin</a></p>
      `,
    });
    return { ok: true };
  } catch (error) {
    console.error('Email notification failed:', error);
    return { ok: false, reason: 'send_failed' };
  }
}