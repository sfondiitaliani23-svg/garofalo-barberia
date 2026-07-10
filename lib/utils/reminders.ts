import { addMinutes } from 'date-fns';
import { Resend } from 'resend';
import { createServiceClient } from '@/lib/supabase/server';
import { SITE_CONFIG } from '@/lib/site-config';
import { buildTransactionalEmail } from '@/lib/utils/email-delivery';
import { renderCustomerReminderEmailHtml } from '@/lib/utils/email-templates';
import { formatItalianDate } from '@/lib/utils/slots';
import { normalizeItalianPhone } from '@/lib/utils/phone';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const REMINDER_HOURS = 6;
const WINDOW_MINUTES = 30;

export interface ReminderAppointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_id: string | null;
  starts_at: string;
  barber?: { name: string } | null;
  service?: { name: string; price_cents: number } | null;
}

export interface ReminderPayload {
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  serviceName: string;
  barberName: string;
  startsAt: Date;
  priceCents: number;
}

function buildReminderMessage(data: ReminderPayload) {
  const dateStr = formatItalianDate(data.startsAt);
  const timeStr = data.startsAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://garofalo-barberia.vercel.app';

  return (
    `Ciao ${data.customerName}! Ti ricordiamo il tuo appuntamento da Garofalo Barberia tra circa 6 ore:\n\n` +
    `Servizio: ${data.serviceName}\n` +
    `Barbiere: ${data.barberName}\n` +
    `Data: ${dateStr}\n` +
    `Orario: ${timeStr}\n` +
    `Indirizzo: ${SITE_CONFIG.address}\n\n` +
    `Per modificare o disdire (entro 30 min prima): ${siteUrl}/area-cliente/appuntamenti\n\n` +
    `A presto!`
  );
}

async function sendMetaWhatsApp(phone: string, body: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return { ok: false, reason: 'not_configured' as const };

  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Meta WhatsApp reminder failed:', detail);
      return { ok: false, reason: 'send_failed' as const };
    }

    return { ok: true as const };
  } catch (error) {
    console.error('Meta WhatsApp reminder failed:', error);
    return { ok: false, reason: 'send_failed' as const };
  }
}

async function sendTwilioWhatsApp(phone: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!accountSid || !authToken || !from) return { ok: false, reason: 'not_configured' as const };

  try {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const form = new URLSearchParams({
      From: from,
      To: `whatsapp:+${phone}`,
      Body: body,
    });

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Twilio WhatsApp reminder failed:', detail);
      return { ok: false, reason: 'send_failed' as const };
    }

    return { ok: true as const };
  } catch (error) {
    console.error('Twilio WhatsApp reminder failed:', error);
    return { ok: false, reason: 'send_failed' as const };
  }
}

async function sendGreenApiWhatsApp(phone: string, body: string) {
  const instanceId = process.env.GREEN_API_INSTANCE_ID;
  const token = process.env.GREEN_API_TOKEN;
  if (!instanceId || !token) return { ok: false, reason: 'not_configured' as const };

  try {
    const response = await fetch(
      `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: `${phone}@c.us`,
          message: body,
        }),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error('Green API WhatsApp reminder failed:', detail);
      return { ok: false, reason: 'send_failed' as const };
    }

    const result = await response.json();
    if (result?.idMessage) return { ok: true as const };
    return { ok: false, reason: 'send_failed' as const };
  } catch (error) {
    console.error('Green API WhatsApp reminder failed:', error);
    return { ok: false, reason: 'send_failed' as const };
  }
}

export async function sendCustomerWhatsAppReminder(phone: string, body: string) {
  const normalized = normalizeItalianPhone(phone);
  if (!normalized) return { ok: false, reason: 'invalid_phone' as const };

  const providerOrder = (process.env.WHATSAPP_PROVIDER ?? 'green').toLowerCase();
  const providerMap: Record<string, typeof sendGreenApiWhatsApp> = {
    green: sendGreenApiWhatsApp,
    meta: sendMetaWhatsApp,
    twilio: sendTwilioWhatsApp,
  };
  const preferred = providerMap[providerOrder];
  const providers = preferred
    ? [preferred, ...Object.values(providerMap).filter((fn) => fn !== preferred)]
    : [sendGreenApiWhatsApp, sendMetaWhatsApp, sendTwilioWhatsApp];
  let lastReason: 'not_configured' | 'send_failed' = 'not_configured';

  for (const provider of providers) {
    const result = await provider(normalized, body);
    if (result.ok) return result;
    if (result.reason === 'send_failed') lastReason = 'send_failed';
  }

  return { ok: false, reason: lastReason };
}

export async function sendCustomerEmailReminder(email: string, data: ReminderPayload) {
  if (!resend) return { ok: false, reason: 'not_configured' as const };

  const dateStr = formatItalianDate(data.startsAt);
  const timeStr = data.startsAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://garofalo-barberia.vercel.app';
  const message = buildReminderMessage(data);
  const subject = `Promemoria appuntamento — oggi alle ${timeStr} | Garofalo Barberia`;
  const text =
    `Ciao ${data.customerName}!\n\n` +
    `Ti ricordiamo il tuo appuntamento da Garofalo Barberia tra circa 6 ore.\n\n` +
    `Servizio: ${data.serviceName}\n` +
    `Barbiere: ${data.barberName}\n` +
    `Data: ${dateStr}\n` +
    `Orario: ${timeStr}\n` +
    `Indirizzo: ${SITE_CONFIG.address}\n\n` +
    `Area cliente: ${siteUrl}/area-cliente/appuntamenti\n\n` +
    message;

  try {
    const { error } = await resend.emails.send(
      buildTransactionalEmail({
        to: email,
        subject,
        text,
        html: renderCustomerReminderEmailHtml({
          customerName: data.customerName,
          serviceName: data.serviceName,
          barberName: data.barberName,
          dateStr,
          timeStr,
        }),
      })
    );

    if (error) {
      console.error('Email reminder failed:', error);
      return { ok: false, reason: 'send_failed' as const };
    }

    return { ok: true as const };
  } catch (error) {
    console.error('Email reminder failed:', error);
    return { ok: false, reason: 'send_failed' as const };
  }
}

async function resolveCustomerEmail(
  supabase: NonNullable<Awaited<ReturnType<typeof createServiceClient>>>,
  appointment: ReminderAppointment
) {
  if (appointment.customer_email?.trim()) return appointment.customer_email.trim();

  if (!appointment.customer_id) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', appointment.customer_id)
    .maybeSingle();

  return profile?.email?.trim() ?? null;
}

function toReminderPayload(appointment: ReminderAppointment, email: string | null): ReminderPayload {
  return {
    customerName: appointment.customer_name,
    customerPhone: appointment.customer_phone,
    customerEmail: email,
    serviceName: appointment.service?.name ?? 'Servizio',
    barberName: appointment.barber?.name ?? 'Barbiere',
    startsAt: new Date(appointment.starts_at),
    priceCents: appointment.service?.price_cents ?? 0,
  };
}

export async function sendAppointmentReminder(
  supabase: NonNullable<Awaited<ReturnType<typeof createServiceClient>>>,
  appointment: ReminderAppointment
) {
  const email = await resolveCustomerEmail(supabase, appointment);
  const payload = toReminderPayload(appointment, email);
  const message = buildReminderMessage(payload);

  const results: {
    email: { ok: boolean; reason?: string; skipped?: boolean };
    whatsapp: { ok: boolean; reason?: string; skipped?: boolean };
  } = {
    email: { ok: false, reason: 'pending' },
    whatsapp: { ok: false, reason: 'pending' },
  };

  if (!email) {
    results.email = { ok: false, reason: 'no_email', skipped: true };
  } else {
    results.email = await sendCustomerEmailReminder(email, payload);
  }

  if (!appointment.customer_phone?.trim()) {
    results.whatsapp = { ok: false, reason: 'no_phone', skipped: true };
  } else {
    results.whatsapp = await sendCustomerWhatsAppReminder(appointment.customer_phone, message);
  }

  return results;
}

export async function processAppointmentReminders() {
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false as const, error: 'Database non configurato' };

  const now = new Date();
  const windowStart = addMinutes(now, REMINDER_HOURS * 60 - WINDOW_MINUTES / 2);
  const windowEnd = addMinutes(now, REMINDER_HOURS * 60 + WINDOW_MINUTES / 2);

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(
      `id, customer_name, customer_phone, customer_email, customer_id, starts_at,
       reminder_email_sent_at, reminder_whatsapp_sent_at,
       barber:barbers(name),
       service:services(name, price_cents)`
    )
    .eq('status', 'confirmed')
    .gte('starts_at', windowStart.toISOString())
    .lte('starts_at', windowEnd.toISOString());

  if (error) {
    console.error('Reminder query failed:', error);
    return { ok: false as const, error: 'Query fallita' };
  }

  const pending = (appointments ?? [])
    .filter((apt) => !apt.reminder_email_sent_at || !apt.reminder_whatsapp_sent_at)
    .map((apt) => {
      const barber = Array.isArray(apt.barber) ? apt.barber[0] : apt.barber;
      const service = Array.isArray(apt.service) ? apt.service[0] : apt.service;
      return { ...apt, barber, service } as ReminderAppointment & {
        reminder_email_sent_at: string | null;
        reminder_whatsapp_sent_at: string | null;
      };
    });

  const processed = [];

  for (const appointment of pending) {
    const needsEmail = !appointment.reminder_email_sent_at;
    const needsWhatsApp = !appointment.reminder_whatsapp_sent_at;
    const results = await sendAppointmentReminder(supabase, appointment);

    const updates: Record<string, string> = {};

    if (needsEmail) {
      if (results.email.ok || results.email.skipped) {
        updates.reminder_email_sent_at = new Date().toISOString();
      }
    }

    if (needsWhatsApp) {
      if (results.whatsapp.ok || results.whatsapp.skipped) {
        updates.reminder_whatsapp_sent_at = new Date().toISOString();
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('appointments').update(updates).eq('id', appointment.id);
    }

    processed.push({
      id: appointment.id,
      customer: appointment.customer_name,
      startsAt: appointment.starts_at,
      email: results.email,
      whatsapp: results.whatsapp,
    });
  }

  return {
    ok: true as const,
    window: {
      from: windowStart.toISOString(),
      to: windowEnd.toISOString(),
    },
    count: processed.length,
    processed,
  };
}