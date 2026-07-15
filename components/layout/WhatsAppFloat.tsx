'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { getWhatsAppLink } from '@/lib/site-config';
import { useCookieBannerVisible } from '@/components/layout/CookieConsent';
import { cn } from '@/lib/utils';

export function WhatsAppFloat() {
  const cookieBannerVisible = useCookieBannerVisible();
  const pathname = usePathname();
  const isCustomerArea = pathname?.startsWith('/area-cliente') ?? false;

  if (cookieBannerVisible) return null;

  return (
    <a
      href={getWhatsAppLink()}
      aria-label="WhatsApp"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "fixed z-[200] transition-all duration-300 hover:scale-108",
        // Position left on all screens
        isCustomerArea
          ? "left-[calc(1.25rem+env(safe-area-inset-left,0px))] lg:left-[calc(15.25rem+env(safe-area-inset-left,0px))]"
          : "left-[calc(1.25rem+env(safe-area-inset-left,0px))]",
        // Position bottom (raised on mobile area-cliente to clear bottom nav)
        isCustomerArea
          ? "bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:bottom-[calc(1.25rem+env(safe-area-inset-bottom))]"
          : "bottom-[calc(1.25rem+env(safe-area-inset-bottom))]"
      )}
    >
      <Image
        src="/assets/sostituisci-immagini/icone/whatsapp.png"
        alt=""
        width={58}
        height={58}
        className="block object-contain drop-shadow-[0_3px_10px_rgba(0,0,0,0.4)]"
        decoding="async"
      />
    </a>
  );
}