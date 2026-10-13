import { addDays } from 'date-fns';
import { createServiceClient } from '@/lib/supabase/server';
import { SITE_CONFIG } from '@/lib/site-config';
import {
  formatShopBookingDateTime,
  getShopDateString,
  getShopTimeString,
  getShopDayBounds,
  parseBookingDateTime,
} from '@/lib/utils/booking-datetime';
import { describeGreenApiError, normalizeItalianPhone } from '@/lib/utils/phone';
import { Resend } from 'resend';
import { renderCustomerReminderEmailHtml } from '@/lib/utils/email-templates';
import { buildTransactionalEmail } from '@/lib/utils/email-delivery';

export interface ReminderAppointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  customer_id?: string | null;
  starts_at: string;
  ends_at: string;
  notes: string | null;
  reminder_whatsapp_sent_at: string | null;
  reminder_email_sent_at?: string | null;
  barber?: { name: string } | { name: string }[] | null;
  service?: { name: string; price_cents?: number; duration_minutes?: number } | { name: string; price_cents?: number; duration_minutes?: number }[] | null;
}

import {
  type ReminderPayload,
  buildWhatsAppReminderMessage,
  getWhatsAppReminderUrl,
} from '@/lib/utils/whatsapp-reminders';

export type { ReminderPayload };
export { buildWhatsAppReminderMessage, getWhatsAppReminderUrl };

export interface ReminderGroup {
  ids: string[];
  primary: ReminderAppointment;
  serviceNames: string;
  barberName: string;
}

// ---------------------------------------------------------------------------
// Provider WhatsApp (Green API, Meta Cloud API, Twilio)
// ---------------------------------------------------------------------------

async function sendGreenApiWhatsApp(phone: string, body: string) {
  const instanceId = process.env.GREEN_API_INSTANCE_ID;
  const token = process.env.GREEN_API_TOKEN;
  if (!instanceId || !token) return { ok: false, reason: 'not_configured' as const };

  try {
    const host = process.env.GREEN_API_URL || `https://${instanceId.slice(0, 4)}.api.greenapi.com`;
    const response = await fetch(
      `${host.replace(/\/$/, '')}/waInstance${instanceId}/sendMessage/${token}`,
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
      const info = describeGreenApiError(detail);
      console.error(info.quota ? '[Green API] QUOTA ESAURITA:' : 'Green API WhatsApp reminder failed:', info.quota ? info.message : detail);
      return { ok: false, reason: info.quota ? ('quota' as const) : ('send_failed' as const) };
    }

    const result = await response.json();
    if (result?.idMessage) return { ok: true as const };
    return { ok: false, reason: 'send_failed' as const };
  } catch (error) {
    console.error('Green API WhatsApp reminder failed:', error);
    return { ok: false, reason: 'send_failed' as const };
  }
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

/**
 * Invia un messaggio WhatsApp al cliente provando i provider configurati.
 */
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
  let lastReason: 'not_configured' | 'send_failed' | 'quota' = 'not_configured';

  for (const provider of providers) {
    const result = (await provider(normalized, body)) as { ok: boolean; reason?: string };
    if (result.ok) return { ok: true as const };
    if (result.reason === 'quota') lastReason = 'quota';
    else if (result.reason === 'send_failed' && lastReason !== 'quota') lastReason = 'send_failed';
  }

  return { ok: false, reason: lastReason };
}

// ---------------------------------------------------------------------------
// Promemoria via email (gratuito con il piano free di Resend)
// ---------------------------------------------------------------------------

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendCustomerReminderEmail(
  to: string | null | undefined,
  data: { customerName: string; serviceName: string; barberName: string; startsAt: Date; when: 'tomorrow' | 'soon' }
) {
  const email = to?.trim();
  if (!email) return { ok: false as const, reason: 'no_email' as const };
  if (!resendClient) return { ok: false as const, reason: 'not_configured' as const };
  const { dateStr, timeStr } = formatShopBookingDateTime(data.startsAt);
  const payload = buildTransactionalEmail({
    to: email,
    subject: data.when === 'tomorrow' ? `Promemoria: domani alle ${timeStr} da Garofalo Barberia` : `Promemoria: ${dateStr} alle ${timeStr} da Garofalo Barberia`,
    html: renderCustomerReminderEmailHtml({ ...data, dateStr, timeStr }),
    text:
      `Ciao ${data.customerName}, ti ricordiamo il tuo appuntamento da Garofalo Barberia.\n` +
      `Servizio: ${data.serviceName}\nBarbiere: ${data.barberName}\nData: ${dateStr}\nOrario: ${timeStr}\n` +
      `Indirizzo: ${SITE_CONFIG.address}`,
  });
  if (!payload) return { ok: false as const, reason: 'staff_blocked' as const };
  try {
    const { error } = await resendClient.emails.send(payload);
    if (error) {
      console.error('[EMAIL PROMEMORIA] invio fallito:', error);
      return { ok: false as const, reason: 'send_failed' as const };
    }
    return { ok: true as const };
  } catch (e) {
    console.error('[EMAIL PROMEMORIA] invio fallito:', e);
    return { ok: false as const, reason: 'send_failed' as const };
  }
}

// ---------------------------------------------------------------------------
// Raggruppamento e Logica di Invio
// ---------------------------------------------------------------------------

/**
 * Raggruppa record di appuntamenti appartenenti allo stesso cliente/combo
 * così da inviare un unico promemoria con i servizi combinati.
 */
export function groupAppointmentsForReminders(
  appointments: ReminderAppointment[]
): ReminderGroup[] {
  const groups: ReminderGroup[] = [];
  const handledIds = new Set<string>();

  for (const apt of appointments) {
    if (handledIds.has(apt.id)) continue;

    const barberObj = Array.isArray(apt.barber) ? apt.barber[0] : apt.barber;
    const serviceObj = Array.isArray(apt.service) ? apt.service[0] : apt.service;
    const barberName = barberObj?.name ?? 'Barbiere';

    // Cerca identificativo combo nelle note
    const comboMatch = apt.notes?.match(/\[Combo: (combo_[a-z0-9]+_\d+)\]/);
    const comboId = comboMatch ? comboMatch[1] : null;

    let relatedApts: ReminderAppointment[] = [];
    if (comboId) {
      relatedApts = appointments.filter((a) => a.notes?.includes(`[Combo: ${comboId}]`));
    } else {
      relatedApts = appointments.filter((a) =>
        a.customer_phone === apt.customer_phone &&
        a.starts_at === apt.starts_at
      );
    }

    if (relatedApts.length === 0) {
      relatedApts = [apt];
    }

    // Ordina per starts_at
    relatedApts.sort((a, b) => a.starts_at.localeCompare(b.starts_at));

    const ids = relatedApts.map((a) => a.id);
    ids.forEach((id) => handledIds.add(id));

    const serviceNames = relatedApts
      .map((a) => {
        const s = Array.isArray(a.service) ? a.service[0] : a.service;
        return s?.name;
      })
      .filter(Boolean)
      .join(' + ') || (serviceObj?.name ?? 'Servizio');

    groups.push({
      ids,
      primary: relatedApts[0],
      serviceNames,
      barberName,
    });
  }

  return groups;
}

/**
 * Verifica se un appuntamento richiede l'invio immediato del promemoria WhatsApp
 * (es. prenotazione creata per il giorno stesso, oppure per domani dopo le 22:30).
 */
export function shouldSendImmediateWhatsAppReminder(appointmentStartsAt: Date): boolean {
  const now = new Date();
  const currentRomeDate = getShopDateString(now);
  const currentRomeTime = getShopTimeString(now); // "HH:mm"

  const aptRomeDate = getShopDateString(appointmentStartsAt);

  // 1. Se l'appuntamento è per oggi (il batch delle 22:30 di ieri è già passato)
  if (aptRomeDate === currentRomeDate) {
    return true;
  }

  // 2. Se l'appuntamento è per domani e sono già passate le 22:30 di oggi (il batch di stasera è già passato)
  const tomorrowRomeDate = getShopDateString(
    addDays(parseBookingDateTime(currentRomeDate, '12:00'), 1)
  );
  if (aptRomeDate === tomorrowRomeDate && currentRomeTime >= '22:30') {
    return true;
  }

  return false;
}

/**
 * Invia immediatamente il promemoria WhatsApp al momento della prenotazione
 * solo se l'appuntamento è last-minute (oggi, o domani dopo le 22:30) e non ancora inviato.
 */
export async function sendImmediateWhatsAppReminderIfEligible(appointmentIds: string[]) {
  if (!appointmentIds || appointmentIds.length === 0) return { sent: false, reason: 'no_ids' };

  const supabase = await createServiceClient();
  if (!supabase) return { sent: false, reason: 'no_db' };

  const { data: appointments } = await supabase
    .from('appointments')
    .select(
      `id, customer_name, customer_phone, customer_email, starts_at, ends_at, notes,
       reminder_whatsapp_sent_at, reminder_email_sent_at,
       barber:barbers(name),
       service:services(name)`
    )
    .in('id', appointmentIds);

  if (!appointments || appointments.length === 0) {
    return { sent: false, reason: 'not_found' };
  }

  // Se il promemoria è già partito su entrambi i canali, non re-inviare
  if (appointments.some((a) => a.reminder_whatsapp_sent_at !== null && a.reminder_email_sent_at !== null)) {
    return { sent: false, reason: 'already_sent' };
  }

  const firstApt = appointments[0];
  const startsAt = new Date(firstApt.starts_at);
  if (!shouldSendImmediateWhatsAppReminder(startsAt)) {
    return { sent: false, reason: 'not_last_minute' };
  }

  const groups = groupAppointmentsForReminders(appointments as any);
  for (const group of groups) {
    const payload = {
      customerName: group.primary.customer_name,
      customerPhone: group.primary.customer_phone,
      serviceName: group.serviceNames,
      barberName: group.barberName,
      startsAt: new Date(group.primary.starts_at),
    };

    const primary = group.primary as ReminderAppointment;
    const nowIso = new Date().toISOString();

    if (!primary.reminder_whatsapp_sent_at && primary.customer_phone?.trim()) {
      const result = await sendCustomerWhatsAppReminder(primary.customer_phone, buildWhatsAppReminderMessage(payload));
      if (result.ok) await supabase.from('appointments').update({ reminder_whatsapp_sent_at: nowIso }).in('id', group.ids);
    }

    if (!primary.reminder_email_sent_at) {
      const mail = await sendCustomerReminderEmail(primary.customer_email, { ...payload, when: 'soon' });
      if (mail.ok) await supabase.from('appointments').update({ reminder_email_sent_at: nowIso }).in('id', group.ids);
    }
  }

  return { sent: true };
}

/**
 * Job batch giornaliero eseguito alle 22:30 (ora locale):
 * Recupera tutte le prenotazioni confermate per il giorno successivo che non hanno ancora
 * ricevuto il promemoria WhatsApp e invia il messaggio a ciascun cliente.
 */
export async function processAppointmentReminders() {
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false as const, error: 'Database non configurato' };

  const now = new Date();
  // Il promemoria della sera parte dalle 22:30 (ora di Foggia), non prima.
  if (getShopTimeString(now) < '22:30') {
    return { ok: true as const, skipped: 'before_22_30' as const, count: 0, processed: [] };
  }
  const currentRomeDate = getShopDateString(now);
  const tomorrowRomeDate = getShopDateString(
    addDays(parseBookingDateTime(currentRomeDate, '12:00'), 1)
  );
  const { dayStart: tomorrowStart, dayEnd: tomorrowEnd } = getShopDayBounds(tomorrowRomeDate);

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(
      `id, customer_name, customer_phone, customer_email, customer_id, starts_at, ends_at, notes,
       reminder_whatsapp_sent_at, reminder_email_sent_at,
       barber:barbers(name),
       service:services(name, price_cents, duration_minutes)`
    )
    .eq('status', 'confirmed')
    .or('reminder_whatsapp_sent_at.is.null,reminder_email_sent_at.is.null')
    .gte('starts_at', tomorrowStart.toISOString())
    .lt('starts_at', tomorrowEnd.toISOString())
    .order('starts_at', { ascending: true });

  if (error) {
    console.error('Reminder query failed:', error);
    return { ok: false as const, error: 'Query fallita' };
  }

  if (!appointments || appointments.length === 0) {
    return {
      ok: true as const,
      targetDate: tomorrowRomeDate,
      count: 0,
      processed: [],
    };
  }

  const groups = groupAppointmentsForReminders(appointments as any);
  const processed = [];
  // Se la quota WhatsApp è esaurita, non sprechiamo altri tentativi stasera.
  let whatsappBlocked = false;

  for (const group of groups) {
    const primaryApt = group.primary as ReminderAppointment;

    const payload = {
      customerName: primaryApt.customer_name,
      customerPhone: primaryApt.customer_phone,
      serviceName: group.serviceNames,
      barberName: group.barberName,
      startsAt: new Date(primaryApt.starts_at),
    };

    const nowIso = new Date().toISOString();
    let result: { ok: boolean; reason?: string } = { ok: false, reason: 'skipped' };
    if (!primaryApt.reminder_whatsapp_sent_at && primaryApt.customer_phone?.trim() && !whatsappBlocked) {
      result = await sendCustomerWhatsAppReminder(primaryApt.customer_phone, buildWhatsAppReminderMessage(payload));
      if (result.ok) await supabase.from('appointments').update({ reminder_whatsapp_sent_at: nowIso }).in('id', group.ids);
      if (result.reason === 'quota') whatsappBlocked = true;
    }

    let email: { ok: boolean; reason?: string } = { ok: false, reason: 'already_sent' };
    if (!primaryApt.reminder_email_sent_at) {
      email = await sendCustomerReminderEmail(primaryApt.customer_email, { ...payload, when: 'tomorrow' });
      if (email.ok) await supabase.from('appointments').update({ reminder_email_sent_at: nowIso }).in('id', group.ids);
    }

    let push = 0;
    if (primaryApt.customer_id) {
      const { sendPushOnce } = await import('@/lib/utils/push');
      const time = new Date(primaryApt.starts_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
      push = await sendPushOnce(`domani:${group.ids[0]}`, primaryApt.customer_id, {
        title: `Domani alle ${time} ✂️`,
        body: `${group.serviceNames}${group.barberName ? ` con ${group.barberName}` : ''}. Ti aspettiamo da Barberia Garofalo.`,
        url: '/area-cliente/appuntamenti',
        tag: `promemoria-${group.ids[0]}`,
      }).catch(() => 0);
    }

    processed.push({
      push,
      ids: group.ids,
      customer: primaryApt.customer_name,
      phone: primaryApt.customer_phone,
      startsAt: primaryApt.starts_at,
      service: group.serviceNames,
      barber: group.barberName,
      whatsapp: result,
      email,
    });
  }

  return {
    ok: true as const,
    targetDate: tomorrowRomeDate,
    count: processed.length,
    processed,
  };
}