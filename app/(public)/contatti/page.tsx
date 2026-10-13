import { ArrowRight, Clock, Mail, Phone } from 'lucide-react';
import { ContactForm } from '@/components/contatti/ContactForm';
import { InstagramFeed } from '@/components/contatti/InstagramFeed';
import { BookingQRCard } from '@/components/contatti/BookingQRCard';
import { SITE_CONFIG, getWhatsAppLink } from '@/lib/site-config';
import '../public-pages.css';
import './contatti.css';

export const metadata = {
  title: 'Contatti e orari',
  description: "Indirizzo, orari, telefono e WhatsApp della Barberia Garofalo, Viale Ignazio d'Addedda 236, Foggia. Mappa e indicazioni.",
  alternates: { canonical: '/contatti' },
};

export default function ContattiPage() {
  return (
    <div className="public-page">
      <h1 className="sr-only">Dove siamo e contatti</h1>

      {/* ── Mappa a tutta larghezza, versione scura ───────────────────── */}
      <section className="ct-map" aria-label="Mappa">
        <iframe
          src={SITE_CONFIG.googleMapsEmbed}
          className="ct-map-frame"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Mappa Garofalo Barberia"
        />
        <div className="ct-map-shade" aria-hidden />

        <div className="ct-sede">
          <p className="ct-sede-title">La nostra sede</p>
          <p className="ct-sede-address">
            {SITE_CONFIG.addressShort}
            <br />
            {SITE_CONFIG.addressCity}
          </p>
          <a href={SITE_CONFIG.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="ct-btn-outline">
            Apri su Google Maps
            <ArrowRight size={14} aria-hidden />
          </a>
        </div>
      </section>

      {/* ── Informazioni sotto la mappa ───────────────────────────────── */}
      <section className="ct-info" aria-label="Contatti e orari">
        <div className="ct-info-grid">
          <div className="ct-col">
            <Phone className="ct-icon" size={26} strokeWidth={1.4} aria-hidden />
            <p className="ct-col-title">Telefono / WhatsApp</p>
            <a href={`tel:${SITE_CONFIG.phone}`} className="ct-col-main">
              +39 {SITE_CONFIG.phoneDisplay}
            </a>
            <a href={getWhatsAppLink()} target="_blank" rel="noopener noreferrer" className="ct-col-note ct-link">
              Scrivici su WhatsApp →
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
            <p className="ct-col-title">Orari di apertura</p>
            <dl className="ct-hours">
              {SITE_CONFIG.hours.map((h) => (
                <div key={h.day} className="ct-hours-row">
                  <dt>{h.day}</dt>
                  <dd className={h.time === 'Chiuso' ? 'is-closed' : ''}>{h.time}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="ct-col ct-col-cta">
            <p className="ct-cta-title">Hai una domanda?</p>
            <p className="ct-col-note">Scrivici, saremo felici di aiutarti.</p>
            <a href="#scrivici" className="ct-btn-solid">
              Contattaci
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
            <InstagramFeed />
          </div>

          <div className="mt-16 border-t border-white/10 pt-16">
            <BookingQRCard />
          </div>
        </div>
      </section>
    </div>
  );
}
