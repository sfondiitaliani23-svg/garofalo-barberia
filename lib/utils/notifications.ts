import { Resend } from 'resend';
import { SITE_CONFIG } from '@/lib/site-config';
import { buildTransactionalEmail, filterCustomerRecipients } from '@/lib/utils/email-delivery';
import {
  renderCustomerBookingEmailHtml,
  renderCustomerCancellationEmailHtml,
} from '@/lib/utils/email-templates';
import { formatShopBookingDateTime } from '@/lib/utils/booking-datetime';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface BookingNotificationData {
  serviceName: string;
  priceCents: number;
  barberName: string;
  startsAt: Date;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
  createdAt?: Date;
}

function formatBookingDetails(data: BookingNotificationData) {
  const { dateStr, timeStr } = formatShopBookingDateTime(data.startsAt);
  const price = `€${(data.priceCents / 100).toFixed(0)}`;
  const phone = data.customerPhone?.trim() || 'Non indicato';
  const email = data.customerEmail?.trim() || 'Non indicata';
  const receivedAt = data.createdAt
    ? formatShopBookingDateTime(data.createdAt)
    : formatShopBookingDateTime(new Date());
  const receivedAtStr = `${receivedAt.dateStr} alle ${receivedAt.timeStr}`;

  return { dateStr, timeStr, price, phone, email, receivedAtStr };
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

function visibleCustomerNotes(notes?: string) {
  const cleaned = notes?.replace(/\[Combo:\s*combo_[^\]]+\]/gi, '').trim();
  return cleaned || undefined;
}

/** Lo staff non riceve mail di prenotazione. La funzione resta per non riattivare l'invio per sbaglio. */
export async function sendAdminBookingEmail(_data: BookingNotificationData) {
  return { ok: true, reason: 'disabled' as const };
}

export async function sendCustomerBookingEmail(data: BookingNotificationData) {
  const customerEmail = data.customerEmail?.trim() ?? '';
  if (!customerEmail) {
    return { ok: true, reason: 'no_customer_email' as const };
  }

  if (filterCustomerRecipients(customerEmail).length === 0) {
    console.warn('[EMAIL CLIENTE] invio bloccato: il destinatario è una casella dello staff.');
    return { ok: true, reason: 'staff_blocked' as const };
  }

  if (!resend) {
    console.warn('[EMAIL CLIENTE] RESEND_API_KEY non configurata. Conferma al cliente saltata.');
    return { ok: false, reason: 'not_configured' as const };
  }

  const { dateStr, timeStr, price } = formatBookingDetails(data);
  const notes = visibleCustomerNotes(data.notes);
  const subject = `Prenotazione confermata - ${dateStr} alle ${timeStr}`;
  const text =
    `Ciao ${data.customerName},\n\n` +
    `la tua prenotazione da Garofalo Barberia è confermata.\n\n` +
    `Servizio: ${data.serviceName} (${price})\n` +
    `Barbiere: ${data.barberName}\n` +
    `Data: ${dateStr}\n` +
    `Orario: ${timeStr}\n` +
    (notes ? `Note: ${notes}\n` : '') +
    `\nTi aspettiamo in salone.`;

  const payload = buildTransactionalEmail({
    to: customerEmail,
    subject,
    text,
    html: renderCustomerBookingEmailHtml({
      customerName: data.customerName,
      serviceName: data.serviceName,
      price,
      barberName: data.barberName,
      dateStr,
      timeStr,
      notes,
    }),
  });

  if (!payload) {
    return { ok: true, reason: 'staff_blocked' as const };
  }

  try {
    const { error } = await resend.emails.send(payload);

    if (error) {
      console.error('[EMAIL CLIENTE] conferma prenotazione fallita:', error);
      return { ok: false, reason: 'send_failed' as const };
    }

    return { ok: true as const };
  } catch (error) {
    console.error('[EMAIL CLIENTE] conferma prenotazione fallita:', error);
    return { ok: false, reason: 'send_failed' as const };
  }
}

export async function notifyAdminNewBooking(data: BookingNotificationData) {
  const [push, email] = await Promise.all([
    sendAdminBookingPush(data),
    sendCustomerBookingEmail(data),
  ]);

  return {
    ok: push.ok || email.ok,
    push,
    email,
    web3: { ok: false, reason: 'disabled' as const },
  };
}

/** Lo staff non riceve mail di disdetta. */
export async function sendAdminCancellationEmail(_data: BookingNotificationData) {
  return { ok: true, reason: 'disabled' as const };
}

export async function sendCustomerCancellationEmail(data: BookingNotificationData) {
  const customerEmail = data.customerEmail?.trim() ?? '';
  if (!customerEmail) {
    return { ok: true, reason: 'no_customer_email' as const };
  }

  if (filterCustomerRecipients(customerEmail).length === 0) {
    console.warn('[EMAIL CLIENTE] disdetta bloccata: il destinatario è una casella dello staff.');
    return { ok: true, reason: 'staff_blocked' as const };
  }

  if (!resend) {
    return { ok: false, reason: 'not_configured' as const };
  }

  const { dateStr, timeStr, price } = formatBookingDetails(data);
  const subject = `Prenotazione annullata - ${dateStr} alle ${timeStr}`;
  const text =
    `Ciao ${data.customerName},\n\n` +
    `la prenotazione del ${dateStr} alle ${timeStr} è stata annullata.\n\n` +
    `Servizio: ${data.serviceName} (${price})\n` +
    `Barbiere: ${data.barberName}\n`;

  const payload = buildTransactionalEmail({
    to: customerEmail,
    subject,
    text,
    html: renderCustomerCancellationEmailHtml({
      customerName: data.customerName,
      serviceName: data.serviceName,
      price,
      barberName: data.barberName,
      dateStr,
      timeStr,
    }),
  });

  if (!payload) {
    return { ok: true, reason: 'staff_blocked' as const };
  }

  try {
    const { error } = await resend.emails.send(payload);
    if (error) {
      console.error('[EMAIL CLIENTE] disdetta fallita:', error);
      return { ok: false, reason: 'send_failed' as const };
    }
    return { ok: true as const };
  } catch (error) {
    console.error('[EMAIL CLIENTE] disdetta fallita:', error);
    return { ok: false, reason: 'send_failed' as const };
  }
}

export async function sendAdminCancellationPush(data: BookingNotificationData) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) return { ok: false, reason: 'not_configured' };

  const baseUrl = (process.env.NTFY_URL ?? 'https://ntfy.sh').replace(/\/$/, '');
  const { dateStr, timeStr, price, phone } = formatBookingDetails(data);
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://garofalo-barberia.vercel.app'}/admin/prenotazioni/storico`;

  const message =
    `DISDETTA — ${data.customerName} (${phone})\n` +
    `${data.serviceName} — ${price}\n` +
    `Con ${data.barberName}\n` +
    `${dateStr} alle ${timeStr}` +
    (data.notes ? `\nNote: ${data.notes}` : '');

  const headers: Record<string, string> = {
    Title: `Disdetta — ${data.customerName}`,
    Priority: 'high',
    Tags: 'warning,calendar',
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
    console.error('Cancellation push failed:', error);
    return { ok: false, reason: 'send_failed' };
  }
}

export async function notifyAdminBookingCancellation(data: BookingNotificationData) {
  const [email, push] = await Promise.all([
    sendCustomerCancellationEmail(data),
    sendAdminCancellationPush(data),
  ]);

  return {
    ok: email.ok || push.ok,
    email,
    push,
  };
}