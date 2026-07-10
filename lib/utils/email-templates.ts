import { SITE_CONFIG } from '@/lib/site-config';

export const EMAIL_LOGO_CID = 'garofalo-logo';

const GOLD = '#cd9a4f';
const GOLD_LIGHT = '#ffb949';
const GOLD_DARK = '#c88c23';
const BG = '#050505';
const CARD = '#0f0f0f';
const BORDER = '#2a2218';
const MUTED = '#9a9a9a';
const TEXT = '#f2f2f2';

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://barberiagarofalo.it';
}

function logoSrc() {
  return `cid:${EMAIL_LOGO_CID}`;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderDetailRow(label: string, value: string, highlight = false) {
  const bg = highlight ? 'background:#14110d;' : '';
  const accent = highlight ? `border-left:3px solid ${GOLD};` : '';

  return `
    <tr>
      <td colspan="2" style="padding:0 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px;border:1px solid ${BORDER};border-radius:12px;${bg}${accent}">
          <tr>
            <td style="padding:14px 16px 4px;font-family:Georgia,'Times New Roman',serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${GOLD};">
              ${label}
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px 14px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.45;color:${TEXT};font-weight:600;">
              ${value}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function renderCta(href: string, label: string) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 8px;">
      <tr>
        <td align="center" style="border-radius:999px;background:linear-gradient(135deg,${GOLD_LIGHT} 0%,${GOLD} 55%,${GOLD_DARK} 100%);">
          <a href="${href}" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#000;text-decoration:none;letter-spacing:0.04em;">
            ${label}
          </a>
        </td>
      </tr>
    </table>
  `;
}

export type EmailTemplateOptions = {
  preheader?: string;
  eyebrow: string;
  title: string;
  intro: string;
  detailRows: Array<{ label: string; value: string; highlight?: boolean }>;
  cta?: { href: string; label: string };
  footerNote?: string;
  badge?: string;
};

export function renderEmailTemplate(options: EmailTemplateOptions) {
  const preheader = options.preheader ?? options.title;
  const detailHtml = options.detailRows.map((row) => renderDetailRow(row.label, row.value, row.highlight)).join('');
  const ctaHtml = options.cta ? renderCta(options.cta.href, options.cta.label) : '';
  const badgeHtml = options.badge
    ? `<span style="display:inline-block;margin:0 0 14px;padding:6px 14px;border:1px solid ${GOLD};border-radius:999px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${GOLD_LIGHT};">${options.badge}</span>`
    : '';
  const footerNote = options.footerNote
    ? `<p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:${MUTED};">${options.footerNote}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${escapeHtml(options.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BG};color:${TEXT};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;">
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,${GOLD_DARK},${GOLD_LIGHT},${GOLD_DARK});border-radius:999px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 0 18px;text-align:center;">
              <img src="${logoSrc()}" width="200" height="133" alt="${escapeHtml(SITE_CONFIG.name)}" style="display:block;margin:0 auto 18px;border:0;max-width:200px;height:auto;" />
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.1;color:${GOLD_LIGHT};letter-spacing:0.03em;">
                ${escapeHtml(SITE_CONFIG.name)}
              </div>
              <div style="margin-top:8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};">
                Foggia · Dal 1996
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:${CARD};border:1px solid ${BORDER};border-radius:20px;overflow:hidden;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:28px 24px 8px;text-align:center;">
                    ${badgeHtml}
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:${GOLD};margin-bottom:10px;">
                      ${options.eyebrow}
                    </div>
                    <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.2;color:${TEXT};font-weight:400;">
                      ${options.title}
                    </h1>
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#cfcfcf;">
                      ${options.intro}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0 4px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${detailHtml}
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:4px 24px 28px;text-align:center;">
                    ${ctaHtml}
                    ${footerNote}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 8px 8px;text-align:center;">
              <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:${MUTED};">
                ${escapeHtml(SITE_CONFIG.address)}
              </p>
              <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${MUTED};">
                Tel. <a href="tel:${SITE_CONFIG.phone}" style="color:${GOLD_LIGHT};text-decoration:none;">${escapeHtml(SITE_CONFIG.phoneDisplay)}</a>
                &nbsp;·&nbsp;
                <a href="${SITE_CONFIG.instagram}" style="color:${GOLD_LIGHT};text-decoration:none;">${escapeHtml(SITE_CONFIG.instagramHandle)}</a>
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#666;">
                © ${new Date().getFullYear()} ${escapeHtml(SITE_CONFIG.name)} · Email transazionale
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderAdminBookingEmailHtml(data: {
  customerName: string;
  phone: string;
  serviceName: string;
  price: string;
  barberName: string;
  dateStr: string;
  timeStr: string;
  notes?: string;
}) {
  const adminUrl = `${siteUrl()}/admin/prenotazioni`;

  return renderEmailTemplate({
    preheader: `Nuova prenotazione da ${data.customerName} per ${data.dateStr} alle ${data.timeStr}`,
    badge: 'Nuova prenotazione',
    eyebrow: 'Notifica staff',
    title: `${escapeHtml(data.customerName)} ha prenotato`,
    intro: 'È arrivata una nuova richiesta dal sito. Tutti i dettagli sono qui sotto — apri il calendario per confermare o gestire l’appuntamento.',
    detailRows: [
      { label: 'Cliente', value: escapeHtml(data.customerName), highlight: true },
      { label: 'Telefono', value: escapeHtml(data.phone) },
      { label: 'Servizio', value: `${escapeHtml(data.serviceName)} · ${escapeHtml(data.price)}` },
      { label: 'Barbiere', value: escapeHtml(data.barberName) },
      { label: 'Data e ora', value: `${escapeHtml(data.dateStr)} alle ${escapeHtml(data.timeStr)}`, highlight: true },
      ...(data.notes ? [{ label: 'Note cliente', value: escapeHtml(data.notes) }] : []),
    ],
    cta: { href: adminUrl, label: 'Apri calendario admin' },
    footerNote: 'Ricevi questa email perché sei il referente delle prenotazioni online.',
  });
}

export function renderCustomerReminderEmailHtml(data: {
  customerName: string;
  serviceName: string;
  barberName: string;
  dateStr: string;
  timeStr: string;
}) {
  const areaUrl = `${siteUrl()}/area-cliente/appuntamenti`;

  return renderEmailTemplate({
    preheader: `Il tuo appuntamento da Garofalo Barberia è oggi alle ${data.timeStr}`,
    badge: 'Promemoria',
    eyebrow: 'Ci vediamo presto',
    title: `Ciao ${escapeHtml(data.customerName)},`,
    intro: 'Mancano circa <strong style="color:#ffb949;">6 ore</strong> al tuo appuntamento. Ecco il riepilogo — ti aspettiamo in salone con lo stesso stile che ami online.',
    detailRows: [
      { label: 'Servizio', value: escapeHtml(data.serviceName) },
      { label: 'Barbiere', value: escapeHtml(data.barberName) },
      { label: 'Data', value: escapeHtml(data.dateStr) },
      { label: 'Orario', value: escapeHtml(data.timeStr), highlight: true },
      { label: 'Dove siamo', value: escapeHtml(SITE_CONFIG.address) },
    ],
    cta: { href: areaUrl, label: 'Gestisci appuntamento' },
    footerNote: `Puoi modificare o disdire entro ${SITE_CONFIG.cancellationMinutes} minuti prima dell’orario dalla tua area cliente.`,
  });
}

export function renderScheduleChangeEmailHtml(heading: string, lines: string[]) {
  const bookUrl = `${siteUrl()}/prenota`;

  return renderEmailTemplate({
    preheader: `${heading} — aggiornamento orari Garofalo Barberia`,
    badge: 'Aggiornamento',
    eyebrow: 'Comunicazione salone',
    title: escapeHtml(heading),
    intro: 'Abbiamo aggiornato gli orari del salone. Controlla i dettagli qui sotto e prenota quando preferisci.',
    detailRows: lines.map((line, index) => ({
      label: index === 0 ? 'Novità' : 'Dettaglio',
      value: escapeHtml(line),
      highlight: index === 0,
    })),
    cta: { href: bookUrl, label: 'Prenota un appuntamento' },
    footerNote: 'Grazie per la comprensione. Per urgenze puoi contattarci su WhatsApp o telefono.',
  });
}