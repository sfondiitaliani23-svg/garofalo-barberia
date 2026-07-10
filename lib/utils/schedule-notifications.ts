import { Resend } from 'resend';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { SITE_CONFIG } from '@/lib/site-config';
import { buildTransactionalEmail } from '@/lib/utils/email-delivery';
import { renderScheduleChangeEmailHtml } from '@/lib/utils/email-templates';
import type { AdminDayScheduleInput } from '@/lib/utils/barber-schedule';
import type { SupabaseClient } from '@supabase/supabase-js';

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
  period?: string | null;
  is_available: boolean;
  start_time: string;
  end_time: string;
};

function formatPeriodLabel(period: 'morning' | 'afternoon') {
  return period === 'morning' ? 'Mattina' : 'Pomeriggio';
}

function wasDayOpen(rows: OldAvailabilityRow[], dayOfWeek: number) {
  return rows.some((row) => row.day_of_week === dayOfWeek && row.is_available);
}

function isDayOpen(day: AdminDayScheduleInput) {
  return (
    (day.morning.enabled && day.morning.startTime < day.morning.endTime) ||
    (day.afternoon.enabled && day.afternoon.startTime < day.afternoon.endTime)
  );
}

export function detectScheduleChanges(
  oldRows: OldAvailabilityRow[],
  newDays: AdminDayScheduleInput[]
): ScheduleChange[] {
  const changes: ScheduleChange[] = [];

  for (const day of newDays) {
    if (day.dayOfWeek === 0 || day.dayOfWeek === 1) continue;

    const dayLabel = DAY_LABELS[day.dayOfWeek] ?? `Giorno ${day.dayOfWeek}`;
    const oldDayRows = oldRows.filter((row) => row.day_of_week === day.dayOfWeek);
    const oldOpen = wasDayOpen(oldDayRows, day.dayOfWeek);
    const newOpen = isDayOpen(day);

    if (oldOpen && !newOpen) {
      changes.push({ dayLabel, type: 'closed', detail: 'Chiuso tutto il giorno' });
      continue;
    }

    for (const period of ['morning', 'afternoon'] as const) {
      const old = oldDayRows.find((row) => row.period === period);
      const slot = day[period];
      const oldEnabled = old?.is_available ?? false;
      const newEnabled = slot.enabled && slot.startTime < slot.endTime;

      if (oldEnabled && !newEnabled) {
        changes.push({
          dayLabel,
          type: 'half_day',
          detail: `${formatPeriodLabel(period)} non disponibile`,
        });
        continue;
      }

      if (!oldEnabled && newEnabled) {
        changes.push({
          dayLabel,
          type: 'half_day',
          detail: `${formatPeriodLabel(period)} aggiunta: ${slot.startTime} – ${slot.endTime}`,
        });
        continue;
      }

      if (oldEnabled && newEnabled && old) {
        const oldStart = old.start_time.slice(0, 5);
        const oldEnd = old.end_time.slice(0, 5);
        const startLater = slot.startTime > oldStart;
        const endEarlier = slot.endTime < oldEnd;
        if (startLater || endEarlier) {
          changes.push({
            dayLabel,
            type: 'half_day',
            detail: `${formatPeriodLabel(period)}: ${slot.startTime} – ${slot.endTime} (prima: ${oldStart} – ${oldEnd})`,
          });
        }
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
  return renderScheduleChangeEmailHtml(heading, lines);
}

export async function sendScheduleChangeEmails(
  emails: string[],
  payload: { subject: string; heading: string; lines: string[] }
) {
  if (!resend || emails.length === 0) {
    return { ok: false, sent: 0, total: emails.length, reason: 'not_configured' as const };
  }

  const html = buildScheduleEmailHtml(payload.heading, payload.lines);
  const text = `${payload.heading}\n\n${payload.lines.join('\n')}\n\nGarofalo Barberia — ${SITE_CONFIG.address}`;
  let sent = 0;

  const results = await Promise.all(
    emails.map(async (email) => {
      const { error } = await resend.emails.send(
        buildTransactionalEmail({
          to: email,
          subject: payload.subject,
          text,
          html,
        })
      );
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
    return `${change.dayLabel} — ${prefix}: ${change.detail}`;
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
    `Il salone sarà chiuso dal ${startLabel} al ${endLabel}.`,
    ...(reason ? [`Motivo: ${reason}`] : []),
  ];

  return sendScheduleChangeEmails(emails, {
    subject: `Chiusura straordinaria — Garofalo Barberia`,
    heading: 'Chiusura straordinaria del salone',
    lines,
  });
}