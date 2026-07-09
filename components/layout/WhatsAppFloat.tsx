import Image from 'next/image';
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
      <Image
        src="/assets/sostituisci-immagini/icone/whatsapp.png"
        alt="WhatsApp"
        width={58}
        height={58}
        className="whatsapp-float-icon"
      />
    </a>
  );
}