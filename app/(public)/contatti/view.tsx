import { ArrowRight, Clock, Mail, Phone } from 'lucide-react';
import { ContactForm } from '@/components/contatti/ContactForm';
import { InstagramFeed } from '@/components/contatti/InstagramFeed';
import { BookingQRCard } from '@/components/contatti/BookingQRCard';
import { SITE_CONFIG, getWhatsAppLink } from '@/lib/site-config';
import { L, type Lang } from '@/lib/i18n';
import { dayName, timeText } from '@/lib/i18n/content-en';
import '../public-pages.css';
import './contatti.css';

export default function ContattiView({ lang }: { lang: Lang }) {
  return (
    <div className="public-page">
      <h1 className="sr-only">{L(lang, 'Dove siamo e contatti', 'Where to find us and contact details')}</h1>

      {/* ── Mappa a tutta larghezza, versione scura ───────────────────── */}
      <section className="ct-map" aria-label={L(lang, 'Mappa', 'Map')}>
        <iframe
          src={lang === 'en' ? SITE_CONFIG.googleMapsEmbed.replace('&hl=it', '&hl=en') : SITE_CONFIG.googleMapsEmbed}
          className="ct-map-frame"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={L(lang, 'Mappa Garofalo Barberia', 'Map of Garofalo Barberia')}
        />
        <div className="ct-map-shade" aria-hidden />

        <div className="ct-sede">
          <p className="ct-sede-title">{L(lang, 'La nostra sede', 'Our barbershop')}</p>
          <p className="ct-sede-address">
            {SITE_CONFIG.addressShort}
            <br />
            {SITE_CONFIG.addressCity}
          </p>
          <a href={SITE_CONFIG.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="ct-btn-outline">
            {L(lang, 'Apri su Google Maps', 'Open in Google Maps')}
            <ArrowRight size={14} aria-hidden />
          </a>
        </div>
      </section>

      {/* ── Informazioni sotto la mappa ───────────────────────────────── */}
      <section className="ct-info" aria-label={L(lang, 'Contatti e orari', 'Contact and opening hours')}>
        <div className="ct-info-grid">
          <div className="ct-col">
            <Phone className="ct-icon" size={26} strokeWidth={1.4} aria-hidden />
            <p className="ct-col-title">{L(lang, 'Telefono / WhatsApp', 'Phone / WhatsApp')}</p>
            <a href={`tel:${SITE_CONFIG.phone}`} className="ct-col-main">
              +39 {SITE_CONFIG.phoneDisplay}
            </a>
            <a href={getWhatsAppLink(L(lang, undefined, 'Hello! I would like to book an appointment at Garofalo Barberia. Can you help me?'))} target="_blank" rel="noopener noreferrer" className="ct-col-note ct-link">
              {L(lang, 'Scrivici su WhatsApp →', 'Message us on WhatsApp →')}
            </a>
          </div>

          <div className="ct-col">
            <Mail className="ct-icon" size={26} strokeWidth={1.4} aria-hidden />
            <p className="ct-col-title">Email</p>
            <a href={SITE_CONFIG.gmailComposeUrl} target="_blank" rel="noopener noreferrer" className="ct-col-main ct-break">
              {SITE_CONFIG.email}
            </a>
            <a href={SITE_CONFIG.instagram} target="_blank" rel="noopener noreferrer" className="ct-col-note ct-link">
              Instagram {SITE_CONFIG.instagramHandle}
            </a>
          </div>

          <div className="ct-col">
            <Clock className="ct-icon" size={26} strokeWidth={1.4} aria-hidden />
            <p className="ct-col-title">{L(lang, 'Orari di apertura', 'Opening hours')}</p>
            <dl className="ct-hours">
              {SITE_CONFIG.hours.map((h) => (
                <div key={h.day} className="ct-hours-row">
                  <dt>{dayName(lang, h.day)}</dt>
                  <dd className={h.time === 'Chiuso' ? 'is-closed' : ''}>{timeText(lang, h.time)}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="ct-col ct-col-cta">
            <p className="ct-cta-title">{L(lang, 'Hai una domanda?', 'Have a question?')}</p>
            <p className="ct-col-note">{L(lang, 'Scrivici, saremo felici di aiutarti.', 'Write to us, we will be happy to help.')}</p>
            <a href="#scrivici" className="ct-btn-solid">
              {L(lang, 'Contattaci', 'Contact us')}
              <ArrowRight size={14} aria-hidden />
            </a>
          </div>
        </div>
      </section>

      {/* ── Funzioni di sempre: modulo, Instagram, QR ─────────────────── */}
      <section className="section section-white pb-24">
        <div className="container-lux">
          <div id="scrivici" className="scroll-mt-28">
            <ContactForm />
          </div>

          <div className="mt-16">
            <InstagramFeed lang={lang} />
          </div>

          <div className="mt-16 border-t border-white/10 pt-16">
            <BookingQRCard />
          </div>
        </div>
      </section>
    </div>
  );
}
