import { Resend } from 'resend';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { SITE_CONFIG } from '@/lib/site-config';
import type { SupabaseClient } from '@supabase/supabase-js';
type DayScheduleInput = {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime: string;
  endTime: string;
};

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const DAY_LABELS: Record<number, string> = {
  0: 'Domenica',
  1: 'Lunedì',
  2: 'Martedì',
  3: 'Mercoledì',
  4: 'Giovedì',
  5: 'Venerdì',
  6: 'Sabato',
};

export type ScheduleChange = {
  dayLabel: string;
  type: 'closed' | 'half_day';
  detail: string;
};

type OldAvailabilityRow = {
  day_of_week: number;
  is_available: boolean;
  start_time: string;
  end_time: string;
};

export function detectScheduleChanges(
  oldRows: OldAvailabilityRow[],
  newDays: DayScheduleInput[]
): ScheduleChange[] {
  const changes: ScheduleChange[] = [];

  for (const day of newDays) {
    if (day.dayOfWeek === 0 || day.dayOfWeek === 1) continue;

    const old = oldRows.find((row) => row.day_of_week === day.dayOfWeek);
    const oldAvailable = old?.is_available ?? false;
    const oldStart = old?.start_time?.slice(0, 5) ?? '09:00';
    const oldEnd = old?.end_time?.slice(0, 5) ?? '19:30';
    const dayLabel = DAY_LABELS[day.dayOfWeek] ?? `Giorno ${day.dayOfWeek}`;

    if (oldAvailable && !day.isAvailable) {
      changes.push({ dayLabel, type: 'closed', detail: 'Chiuso' });
      continue;
    }

    if (day.isAvailable && oldAvailable) {
      const startLater = day.startTime > oldStart;
      const endEarlier = day.endTime < oldEnd;
      if (startLater || endEarlier) {
        changes.push({
          dayLabel,
          type: 'half_day',
          detail: `Orario ridotto: ${day.startTime} – ${day.endTime} (prima: ${oldStart} – ${oldEnd})`,
        });
      }
    }
  }

  return changes;
}

export async function getAllCustomerEmails(supabase: SupabaseClient) {
  const emails = new Set<string>();

  const { data: profiles } = await supabase
    .from('profiles')
    .select('email')
    .not('email', 'is', null);

  for (const profile of profiles ?? []) {
    const email = profile.email?.trim();
    if (email) emails.add(email.toLowerCase());
  }

  const { data: appointments } = await supabase
    .from('appointments')
    .select('customer_email')
    .not('customer_email', 'is', null);

  for (const appointment of appointments ?? []) {
    const email = appointment.customer_email?.trim();
    if (email) emails.add(email.toLowerCase());
  }

  return Array.from(emails);
}

function buildScheduleEmailHtml(heading: string, lines: string[]) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://garofalo-barberia.vercel.app';
  const bodyLines = lines.map((line) => `<li>${line}</li>`).join('');

  return `
    <h2>${heading}</h2>
    <p>Ti informiamo di un aggiornamento degli orari di <strong>Garofalo Barberia</strong>.</p>
    <ul>${bodyLines}</ul>
    <p>Puoi prenotare o gestire i tuoi appuntamenti dalla <a href="${siteUrl}/prenota">pagina prenotazioni</a> o dalla <a href="${siteUrl}/area-cliente/appuntamenti">tua area cliente</a>.</p>
    <p style="margin-top:1.5rem;color:#666;font-size:13px">
      ${SITE_CONFIG.address}<br />
      Tel. ${SITE_CONFIG.phoneDisplay}
    </p>
  `;
}

export async function sendScheduleChangeEmails(
  emails: string[],
  payload: { subject: string; heading: string; lines: string[] }
) {
  if (!resend || emails.length === 0) {
    return { ok: false, sent: 0, total: emails.length, reason: 'not_configured' as const };
  }

  const from = process.env.RESEND_FROM ?? 'Garofalo Barberia <onboarding@resend.dev>';
  const html = buildScheduleEmailHtml(payload.heading, payload.lines);
  let sent = 0;

  const results = await Promise.all(
    emails.map(async (email) => {
      const { error } = await resend.emails.send({
        from,
        to: email,
        subject: payload.subject,
        html,
      });
      return !error;
    })
  );

  sent = results.filter(Boolean).length;
  return { ok: sent > 0, sent, total: emails.length };
}

export async function notifyCustomersBarberScheduleChanges(
  supabase: SupabaseClient,
  barberName: string,
  changes: ScheduleChange[]
) {
  if (changes.length === 0) return { ok: true, sent: 0, total: 0 };

  const emails = await getAllCustomerEmails(supabase);
  const lines = changes.map((change) => {
    const prefix = change.type === 'closed' ? 'Chiusura' : 'Mezza giornata';
    return `<strong>${change.dayLabel}</strong> — ${prefix}: ${change.detail}`;
  });

  return sendScheduleChangeEmails(emails, {
    subject: `Aggiornamento orari — Garofalo Barberia`,
    heading: `Orari aggiornati (${barberName})`,
    lines,
  });
}

export async function notifyCustomersSalonClosure(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string,
  reason?: string | null
) {
  const emails = await getAllCustomerEmails(supabase);
  const startLabel = format(parseISO(`${startDate}T12:00:00`), 'd MMMM yyyy', { locale: it });
  const endLabel = format(parseISO(`${endDate}T12:00:00`), 'd MMMM yyyy', { locale: it });

  const lines = [
    `Il salone sarà <strong>chiuso</strong> dal ${startLabel} al ${endLabel}.`,
    ...(reason ? [`Motivo: ${reason}`] : []),
  ];

  return sendScheduleChangeEmails(emails, {
    subject: `Chiusura straordinaria — Garofalo Barberia`,
    heading: 'Chiusura straordinaria del salone',
    lines,
  });
}