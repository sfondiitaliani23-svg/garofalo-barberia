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

export function isResendSandboxFrom(from = getResendFromAddress()) {
  return from.includes('@resend.dev');
}

function readEmailLogoBuffer() {
  const candidates = [
    join(process.cwd(), 'public/assets/sostituisci-immagini/icone/email-logo.png'),
    join(process.cwd(), 'assets/sostituisci-immagini/icone/email-logo.png'),
  ];

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
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const from = getResendFromAddress();
  const replyTo = getResendReplyTo();
  const logo = readEmailLogoBuffer();

  return {
    from,
    to: params.to,
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