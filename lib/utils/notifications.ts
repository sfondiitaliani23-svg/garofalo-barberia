import { Resend } from 'resend';
import { SITE_CONFIG } from '@/lib/site-config';
import { buildTransactionalEmail } from '@/lib/utils/email-delivery';
import { renderAdminBookingEmailHtml } from '@/lib/utils/email-templates';
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

function formatBookingDetails(data: BookingNotificationData) {
  const dateStr = formatItalianDate(data.startsAt);
  const timeStr = data.startsAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const price = `€${(data.priceCents / 100).toFixed(0)}`;
  const phone = data.customerPhone?.trim() || 'Non indicato';

  return { dateStr, timeStr, price, phone };
}

export function buildWhatsAppBookingMessage(data: BookingNotificationData): string {
  const { dateStr, timeStr, price, phone } = formatBookingDetails(data);

  return (
    `Ciao Garofalo Barberia! Ho prenotato:\n\n` +
    `Servizio: ${data.serviceName} (${price})\n` +
    `Barbiere: ${data.barberName}\n` +
    `Data: ${dateStr}\n` +
    `Orario: ${timeStr}\n\n` +
    `Nome: ${data.customerName}\n` +
    `Telefono: ${phone}` +
    (data.notes ? `\nNote: ${data.notes}` : '')
  );
}

export function getWhatsAppBookingUrl(data: BookingNotificationData): string {
  const message = encodeURIComponent(buildWhatsAppBookingMessage(data));
  return `https://wa.me/${SITE_CONFIG.whatsapp}?text=${message}`;
}

export async function sendAdminBookingPush(data: BookingNotificationData) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return { ok: false, reason: 'not_configured' };

  const baseUrl = (process.env.NTFY_URL ?? 'https://ntfy.sh').replace(/\/$/, '');
  const { dateStr, timeStr, price, phone } = formatBookingDetails(data);
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://garofalo-barberia.vercel.app'}/admin/prenotazioni`;

  const message =
    `${data.customerName} (${phone})\n` +
    `${data.serviceName} — ${price}\n` +
    `Con ${data.barberName}\n` +
    `${dateStr} alle ${timeStr}` +
    (data.notes ? `\nNote: ${data.notes}` : '');

  const headers: Record<string, string> = {
    Title: `Nuova prenotazione - ${data.customerName}`,
    Priority: 'urgent',
    Tags: 'calendar,barber',
    Click: adminUrl,
  };

  if (process.env.NTFY_TOKEN) {
    headers.Authorization = `Bearer ${process.env.NTFY_TOKEN}`;
  }

  try {
    const response = await fetch(`${baseUrl}/${topic}`, {
      method: 'POST',
      headers,
      body: message,
    });

    if (!response.ok) {
      return { ok: false, reason: 'send_failed' };
    }

    return { ok: true };
  } catch (error) {
    console.error('Push notification failed:', error);
    return { ok: false, reason: 'send_failed' };
  }
}

function getBookingNotificationEmail(): string | undefined {
  return process.env.BOOKING_NOTIFICATION_EMAIL?.trim() || process.env.ADMIN_EMAIL?.trim();
}

export async function sendAdminBookingEmail(data: BookingNotificationData) {
  const notificationEmail = getBookingNotificationEmail();
  if (!resend || !notificationEmail) return { ok: false, reason: 'not_configured' };

  const { dateStr, timeStr, price, phone } = formatBookingDetails(data);
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://garofalo-barberia.vercel.app'}/admin/prenotazioni`;
  const subject = `Nuova prenotazione — ${data.customerName} — ${dateStr} ${timeStr}`;
  const text =
    `Nuova prenotazione online\n\n` +
    `Cliente: ${data.customerName} (${phone})\n` +
    `Servizio: ${data.serviceName} — ${price}\n` +
    `Barbiere: ${data.barberName}\n` +
    `Data: ${dateStr} alle ${timeStr}\n` +
    (data.notes ? `Note: ${data.notes}\n` : '') +
    `\nCalendario admin: ${adminUrl}`;

  try {
    const { error } = await resend.emails.send(
      buildTransactionalEmail({
        to: notificationEmail,
        subject,
        text,
        html: renderAdminBookingEmailHtml({
          customerName: data.customerName,
          phone,
          serviceName: data.serviceName,
          price,
          barberName: data.barberName,
          dateStr,
          timeStr,
          notes: data.notes,
        }),
      })
    );

    if (error) {
      console.error('Email notification failed:', error);
      return { ok: false, reason: 'send_failed' };
    }

    return { ok: true };
  } catch (error) {
    console.error('Email notification failed:', error);
    return { ok: false, reason: 'send_failed' };
  }
}

export async function sendAdminBookingWeb3Forms(data: BookingNotificationData) {
  const accessKey = process.env.WEB3FORMS_ACCESS_KEY;
  if (!accessKey) return { ok: false, reason: 'not_configured' };

  const { dateStr, timeStr, price, phone } = formatBookingDetails(data);

  try {
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: accessKey,
        subject: `Nuova prenotazione — ${data.customerName} — ${dateStr} ${timeStr}`,
        from_name: 'Garofalo Barberia',
        name: data.customerName,
        phone,
        servizio: data.serviceName,
        barbiere: data.barberName,
        data: dateStr,
        orario: timeStr,
        prezzo: price,
        note: data.notes ?? '',
        message:
          `Nuova prenotazione\n\n` +
          `Cliente: ${data.customerName}\n` +
          `Telefono: ${phone}\n` +
          `Servizio: ${data.serviceName} (${price})\n` +
          `Barbiere: ${data.barberName}\n` +
          `Data: ${dateStr} alle ${timeStr}` +
          (data.notes ? `\nNote: ${data.notes}` : ''),
      }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      return { ok: false, reason: 'send_failed' };
    }

    return { ok: true };
  } catch (error) {
    console.error('Web3Forms notification failed:', error);
    return { ok: false, reason: 'send_failed' };
  }
}

export async function notifyAdminNewBooking(data: BookingNotificationData) {
  const [push, email, web3] = await Promise.all([
    sendAdminBookingPush(data),
    sendAdminBookingEmail(data),
    sendAdminBookingWeb3Forms(data),
  ]);

  const delivered = [push, email, web3].some((r) => r.ok);

  return {
    ok: delivered,
    push,
    email,
    web3,
  };
}