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
import { normalizeItalianPhone } from '@/lib/utils/phone';

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
  barber?: { name: string } | { name: string }[] | null;
  service?: { name: string; price_cents?: number; duration_minutes?: number } | { name: string; price_cents?: number; duration_minutes?: number }[] | null;
}

export interface ReminderPayload {
  customerName: string;
  customerPhone: string;
  serviceName: string;
  barberName: string;
  startsAt: Date;
}

export interface ReminderGroup {
  ids: string[];
  primary: ReminderAppointment;
  serviceNames: string;
  barberName: string;
}

/**
 * Genera il messaggio WhatsApp di promemoria formattato per il cliente.
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

export function getWhatsAppReminderUrl(data: ReminderPayload): string {
  const normalized = normalizeItalianPhone(data.customerPhone) || data.customerPhone.replace(/\D/g, '');
  const message = encodeURIComponent(buildWhatsAppReminderMessage(data));
  return `https://wa.me/${normalized}?text=${message}`;
}

// ---------------------------------------------------------------------------
// Provider WhatsApp (Green API, Meta Cloud API, Twilio)
// ---------------------------------------------------------------------------

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
  let lastReason: 'not_configured' | 'send_failed' = 'not_configured';

  for (const provider of providers) {
    const result = await provider(normalized, body);
    if (result.ok) return result;
    if (result.reason === 'send_failed') lastReason = 'send_failed';
  }

  return { ok: false, reason: lastReason };
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
      `id, customer_name, customer_phone, starts_at, ends_at, notes,
       reminder_whatsapp_sent_at,
       barber:barbers(name),
       service:services(name)`
    )
    .in('id', appointmentIds);

  if (!appointments || appointments.length === 0) {
    return { sent: false, reason: 'not_found' };
  }

  // Se uno qualsiasi dei record ha già il promemoria inviato, non re-inviare
  if (appointments.some((a) => a.reminder_whatsapp_sent_at !== null)) {
    return { sent: false, reason: 'already_sent' };
  }

  const firstApt = appointments[0];
  if (!firstApt.customer_phone?.trim()) {
    return { sent: false, reason: 'no_phone' };
  }

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

    const message = buildWhatsAppReminderMessage(payload);
    const result = await sendCustomerWhatsAppReminder(group.primary.customer_phone, message);

    if (result.ok) {
      const nowIso = new Date().toISOString();
      await supabase
        .from('appointments')
        .update({ reminder_whatsapp_sent_at: nowIso })
        .in('id', group.ids);
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
  const currentRomeDate = getShopDateString(now);
  const tomorrowRomeDate = getShopDateString(
    addDays(parseBookingDateTime(currentRomeDate, '12:00'), 1)
  );
  const { dayStart: tomorrowStart, dayEnd: tomorrowEnd } = getShopDayBounds(tomorrowRomeDate);

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(
      `id, customer_name, customer_phone, customer_email, customer_id, starts_at, ends_at, notes,
       reminder_whatsapp_sent_at,
       barber:barbers(name),
       service:services(name, price_cents, duration_minutes)`
    )
    .eq('status', 'confirmed')
    .is('reminder_whatsapp_sent_at', null)
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

  for (const group of groups) {
    const primaryApt = group.primary;
    if (!primaryApt.customer_phone?.trim()) {
      continue;
    }

    const payload = {
      customerName: primaryApt.customer_name,
      customerPhone: primaryApt.customer_phone,
      serviceName: group.serviceNames,
      barberName: group.barberName,
      startsAt: new Date(primaryApt.starts_at),
    };

    const message = buildWhatsAppReminderMessage(payload);
    const result = await sendCustomerWhatsAppReminder(primaryApt.customer_phone, message);

    if (result.ok) {
      const nowIso = new Date().toISOString();
      await supabase
        .from('appointments')
        .update({ reminder_whatsapp_sent_at: nowIso })
        .in('id', group.ids);
    }

    processed.push({
      ids: group.ids,
      customer: primaryApt.customer_name,
      phone: primaryApt.customer_phone,
      startsAt: primaryApt.starts_at,
      service: group.serviceNames,
      barber: group.barberName,
      whatsapp: result,
    });
  }

  return {
    ok: true as const,
    targetDate: tomorrowRomeDate,
    count: processed.length,
    processed,
  };
}