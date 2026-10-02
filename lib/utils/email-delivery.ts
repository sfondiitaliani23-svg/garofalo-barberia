import { readFileSync } from 'fs';
import { join } from 'path';
import { SITE_CONFIG } from '@/lib/site-config';
import { EMAIL_LOGO_CID } from '@/lib/utils/email-templates';

export function getResendFromAddress() {
  return process.env.RESEND_FROM ?? 'Garofalo Barberia <onboarding@resend.dev>';
}

export function getResendReplyTo() {
  return process.env.RESEND_REPLY_TO ?? process.env.ADMIN_EMAIL ?? SITE_CONFIG.email;
}

/** Caselle che non devono mai ricevere mail automatiche del sito. */
const HARDCODED_STAFF_INBOXES = ['luigigarofalo1996@gmail.com'];

export function collectStaffInboxes(): Set<string> {
  const values = [
    ...HARDCODED_STAFF_INBOXES,
    process.env.ADMIN_EMAIL,
    process.env.BOOKING_NOTIFICATION_EMAIL,
    process.env.RESEND_REPLY_TO,
  ];
  const inboxes = new Set<string>();

  for (const value of values) {
    for (const part of (value ?? '').split(',')) {
      const email = part.trim().toLowerCase();
      if (email.includes('@')) inboxes.add(email);
    }
  }

  return inboxes;
}

/** Toglie le caselle dello staff. La mail di prenotazione può andare solo al cliente. */
export function filterCustomerRecipients(to: string | string[]): string[] {
  const blocked = collectStaffInboxes();
  const list = Array.isArray(to) ? to : [to];
  const unique = new Set<string>();

  for (const raw of list) {
    const email = raw.trim();
    if (!email.includes('@')) continue;
    if (blocked.has(email.toLowerCase())) continue;
    unique.add(email);
  }

  return [...unique];
}

export function isResendSandboxFrom(from = getResendFromAddress()) {
  return from.includes('@resend.dev');
}

const EMAIL_LOGO_PATHS = [
  'assets/sostituisci-immagini/icone/favicon/barberia_garofalo-no-white.png',
  'public/assets/sostituisci-immagini/icone/email-logo.png',
  'assets/sostituisci-immagini/icone/email-logo.png',
] as const;

function readEmailLogoBuffer() {
  const candidates = EMAIL_LOGO_PATHS.map((segment) => join(process.cwd(), segment));

  for (const filePath of candidates) {
    try {
      return readFileSync(filePath);
    } catch {
      // try next path
    }
  }

  return null;
}

export function buildTransactionalEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}) {
  const recipients = filterCustomerRecipients(params.to);
  if (recipients.length === 0) return null;

  const from = getResendFromAddress();
  const replyTo = params.replyTo ?? getResendReplyTo();
  const logo = readEmailLogoBuffer();

  return {
    from,
    to: recipients.length === 1 ? recipients[0] : recipients,
    subject: params.subject,
    html: params.html,
    text: params.text,
    replyTo,
    headers: {
      'X-Entity-Ref-ID': 'garofalo-barberia-transactional',
    },
    attachments: logo
      ? [
          {
            filename: 'garofalo-logo.png',
            content: logo,
            contentType: 'image/png',
            inlineContentId: EMAIL_LOGO_CID,
          },
        ]
      : undefined,
  };
}