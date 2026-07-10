'use client';

import Image from 'next/image';
import { getWhatsAppLink } from '@/lib/site-config';
import { useCookieBannerVisible } from '@/components/layout/CookieConsent';

export function WhatsAppFloat() {
  const cookieBannerVisible = useCookieBannerVisible();

  if (cookieBannerVisible) return null;

  return (
    <a
      href={getWhatsAppLink()}
      className="whatsapp-float"
      aria-label="WhatsApp"
      target="_blank"
      rel="noopener noreferrer"
    >
      <Image
        src="/assets/sostituisci-immagini/icone/whatsapp.png"
        alt=""
        width={58}
        height={58}
        className="whatsapp-float-icon"
        decoding="async"
      />
    </a>
  );
}