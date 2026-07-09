import { getWhatsAppLink } from '@/lib/site-config';

export function WhatsAppFloat() {
  return (
    <a
      href={getWhatsAppLink()}
      className="whatsapp-float"
      aria-label="WhatsApp"
      target="_blank"
      rel="noopener noreferrer"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
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