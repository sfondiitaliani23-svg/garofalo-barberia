import Link from 'next/link';
import Image from 'next/image';
import { CalendarCheck, MessageCircle, MapPin, Scissors, BookOpen, Star, Instagram, Tag } from 'lucide-react';
import { TrackingOnlyWidgets } from '@/components/layout/ClientFloatingWidgets';
import { OpenNowBadge } from '@/components/layout/OpenNowBadge';
import { SITE_CONFIG, getWhatsAppLink } from '@/lib/site-config';
import '@/components/content/content.css';

export const metadata = {
  title: 'Link',
  description: 'Prenota, scrivici su WhatsApp e trova la Barberia Garofalo a Foggia.',
  alternates: { canonical: '/link' },
  robots: { index: false, follow: true },
};

/** Pagina "link in bio" per Instagram e per il QR in vetrina. */
export default function LinkPage() {
  const items = [
    { href: '/prenota', label: 'Prenota online', icon: CalendarCheck, main: true },
    { href: getWhatsAppLink(), label: 'Scrivici su WhatsApp', icon: MessageCircle, external: true },
    { href: '/servizi', label: 'Servizi e prezzi', icon: Scissors },
    { href: '/offerte', label: 'Offerte', icon: Tag },
    { href: SITE_CONFIG.googleMapsUrl, label: 'Come arrivare', icon: MapPin, external: true },
    { href: '/recensioni', label: 'Recensioni', icon: Star },
    { href: '/journal', label: 'Consigli su capelli e barba', icon: BookOpen },
    { href: SITE_CONFIG.instagram, label: SITE_CONFIG.instagramHandle, icon: Instagram, external: true },
  ];
  return (
    <main className="lk-page">
      <div className="lk-box">
        <Image
          src="/assets/sostituisci-immagini/icone/barberia_garofalo.png"
          alt={SITE_CONFIG.name}
          width={150}
          height={150}
          priority
          className="mx-auto h-auto w-[130px]"
          style={{ mixBlendMode: 'screen' }}
        />
        <h1 className="lk-name">{SITE_CONFIG.name}</h1>
        <p className="lk-sub">{SITE_CONFIG.addressShort} · Foggia</p>
        <OpenNowBadge />
        <nav className="lk-list" aria-label="Link principali">
          {items.map(({ href, label, icon: Icon, main, external }) =>
            external ? (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={`lk-btn ${main ? 'lk-btn--main' : ''}`}>
                <Icon size={18} aria-hidden /> {label}
              </a>
            ) : (
              <Link key={label} href={href} className={`lk-btn ${main ? 'lk-btn--main' : ''}`}>
                <Icon size={18} aria-hidden /> {label}
              </Link>
            )
          )}
        </nav>
        <p className="lk-foot">
          <Link href="/">barberiagarofalo.it</Link>
        </p>
      </div>
      <TrackingOnlyWidgets />
    </main>
  );
}
