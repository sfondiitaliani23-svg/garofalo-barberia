import { readFileSync } from 'fs';
import { Resend } from 'resend';
import { filterCustomerRecipients } from '../lib/utils/email-delivery';
import {
  renderCustomerBookingEmailHtml,
  renderCustomerReminderEmailHtml,
} from '../lib/utils/email-templates';

const env = readFileSync('.env.local', 'utf8').replace(/^\uFEFF/, '');
const get = (key: string) => env.match(new RegExp(`^${key}=(.+)$`, 'm'))?.[1]?.trim() ?? '';

const resend = new Resend(get('RESEND_API_KEY'));
const from = get('RESEND_FROM');
const replyTo = get('RESEND_REPLY_TO');
const requested = process.argv[2]?.trim();
const [to] = requested ? filterCustomerRecipients(requested) : [];
if (!to) {
  console.error('Passa l\'email di un cliente. Le caselle dello staff sono bloccate.');
  process.exit(1);
}

const previews = [
  {
    subject: '[Anteprima] Prenotazione confermata — design email',
    html: renderCustomerBookingEmailHtml({
      customerName: 'Marco Rossi',
      serviceName: 'Taglio e shampoo',
      price: '€17',
      barberName: 'Luigi Garofalo',
      dateStr: 'venerdì 11 luglio 2026',
      timeStr: '10:30',
      notes: 'Preferisco acconciatura classica',
    }),
  },
  {
    subject: '[Anteprima] Promemoria appuntamento — design email',
    html: renderCustomerReminderEmailHtml({
      customerName: 'Eliseo',
      serviceName: 'Taglio e shampoo',
      barberName: 'Luigi Garofalo',
      dateStr: 'venerdì 11 luglio 2026',
      timeStr: '10:30',
    }),
  },
];

async function main() {
  for (const preview of previews) {
    const result = await resend.emails.send({
      from,
      to,
      replyTo,
      subject: preview.subject,
      html: preview.html,
      text: 'Anteprima template email Garofalo Barberia',
    });

    if (result.error) {
      console.error(preview.subject, result.error);
      process.exit(1);
    }

    console.log(preview.subject, result.data?.id);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});