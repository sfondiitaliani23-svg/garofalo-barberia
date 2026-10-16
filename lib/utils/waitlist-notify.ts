import { Resend } from 'resend';
import { SITE_CONFIG } from '@/lib/site-config';
import { createServiceClient } from '@/lib/supabase/server';
import { getAvailableSlots } from '@/lib/actions/availability';
import { isCutService } from '@/lib/data/services';
import { buildTransactionalEmail } from '@/lib/utils/email-delivery';
import { escapeHtml, renderEmailTemplate } from '@/lib/utils/email-templates';
import { howManyToNotify } from '@/lib/utils/waitlist';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barberiagarofalo.it';
}

async function sendFreeSlotEmail(to: { name: string; email: string }, dateLabel: string) {
  if (!resend) return false;
  const url = `${siteUrl()}/prenota`;
  const payload = buildTransactionalEmail({
    to: to.email,
    subject: `Si è liberato un posto - ${dateLabel}`,
    text:
      `Ciao ${to.name},\n\nsi è liberato un posto da Garofalo Barberia per ${dateLabel}.\n` +
      `Prenota subito: ${url}\n\nI posti si riempiono in fretta. Chi prenota prima, trova l’orario.`,
    html: renderEmailTemplate({
      preheader: `Si è liberato un posto per ${dateLabel}`,
      badge: 'Lista d’attesa',
      eyebrow: 'Buone notizie',
      title: `Ciao ${escapeHtml(to.name)},`,
      intro: 'Si è liberato un posto nel giorno che volevi. Prenota subito, prima che lo prenda qualcun altro.',
      detailRows: [
        { label: 'Giorno', value: escapeHtml(dateLabel), highlight: true },
        { label: 'Dove siamo', value: escapeHtml(SITE_CONFIG.address) },
      ],
      cta: { href: url, label: 'Prenota ora' },
      footerNote: 'Ricevi questa email perché ti sei messo in lista d’attesa sul sito. Non riceverai altri avvisi per questo giorno.',
    }),
  });
  if (!payload) return false;
  try {
    const { error } = await resend.emails.send(payload);
    if (error) {
      console.error('[LISTA ATTESA] email fallita:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[LISTA ATTESA] email fallita:', error);
    return false;
  }
}

/**
 * Dopo una disdetta: avvisa chi aspetta quel giorno, se c'è davvero un orario libero.
 * Non lancia mai errori: la disdetta non deve fallire per colpa della lista d'attesa.
 */
export async function notifyWaitlistForDate(date: string): Promise<{ notified: number }> {
  try {
    const supabase = await createServiceClient();
    if (!supabase) return { notified: 0 };

    const { data: waiting } = await supabase
      .from('waitlist_entries')
      .select('*')
      .eq('desired_date', date)
      .eq('status', 'waiting')
      .order('created_at', { ascending: true });
    if (!waiting || waiting.length === 0) return { notified: 0 };

    let notified = 0;
    let used = 0;
    const [y, m, d] = date.split('-');
    const dateLabel = `${d}/${m}/${y}`;

    // Quanti posti sono liberi in totale per la prima persona in coda; poi si scala.
    for (const entry of waiting) {
      const { data: services } = await supabase.from('services').select('name, category, duration_minutes').in('id', entry.service_ids);
      if (!services || services.length === 0) continue;
      const duration = services.reduce((acc, s) => acc + s.duration_minutes, 0);
      const hasCut = services.some((s) => isCutService(s.name) || isCutService(s.category));
      const res = await getAvailableSlots(entry.barber_id, date, duration, undefined, false, hasCut);
      const free = res.slots?.length ?? 0;
      if (howManyToNotify(free - used, waiting.length - notified) === 0) continue;

      const sent = await sendFreeSlotEmail({ name: entry.customer_name, email: entry.customer_email }, dateLabel);
      if (!sent) continue;
      await supabase
        .from('waitlist_entries')
        .update({ status: 'notified', notified_at: new Date().toISOString() })
        .eq('id', entry.id);
      notified++;
      used++;
      if (notified >= 3) break;
    }
    return { notified };
  } catch (error) {
    console.error('notifyWaitlistForDate failed:', error);
    return { notified: 0 };
  }
}
