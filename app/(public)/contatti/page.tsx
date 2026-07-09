import Image from 'next/image';
import Link from 'next/link';
import { ContactForm } from '@/components/contatti/ContactForm';
import { SITE_CONFIG, getWhatsAppLink } from '@/lib/site-config';
import '../public-pages.css';

export const metadata = { title: 'Contatti' };

export default function ContattiPage() {
  return (
    <div className="public-page">
      <section className="page-hero">
        <div className="container-lux">
          <h1 className="hero-heading">Dove siamo</h1>
          <p className="hero-sub max-w-xl">Vieni in salone o contattaci per telefono e WhatsApp.</p>
        </div>
      </section>

      <section className="section section-white pb-24">
        <div className="container-lux">
          <div className="split-section split-section--align-top">
            <div className="space-y-4">
              <div className="form-card p-6">
                <div className="eyebrow">
                  <div className="eyebrow-line" />
                  <span className="eyebrow-text">Indirizzo</span>
                </div>
                <p className="font-semibold">{SITE_CONFIG.addressShort}</p>
                <p className="text-sm text-white/50">{SITE_CONFIG.addressCity}</p>
                <a
                  href={SITE_CONFIG.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-sm text-gold hover:text-gold-light"
                >
                  Apri in Google Maps →
                </a>
              </div>

              <div className="form-card p-6">
                <div className="eyebrow">
                  <div className="eyebrow-line" />
                  <span className="eyebrow-text">Orari</span>
                </div>
                <div className="price-list">
                  {SITE_CONFIG.detailedHours.map((h) => (
                    <div key={h.day} className="price-row">
                      <span>{h.day}</span>
                      <span className={h.time === 'Chiuso' ? 'text-white/50' : ''}>{h.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-card p-6">
                <div className="eyebrow">
                  <div className="eyebrow-line" />
                  <span className="eyebrow-text">Contatti</span>
                </div>
                <ul className="space-y-3 text-sm">
                  <li>
                    <a href={`tel:${SITE_CONFIG.phone}`} className="hover:text-gold-light">
                      {SITE_CONFIG.phoneDisplay}
                    </a>
                  </li>
                  <li>
                    <a
                      href={getWhatsAppLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 hover:text-gold-light"
                    >
                      <Image
                        src="/assets/sostituisci-immagini/icone/whatsapp.png"
                        alt=""
                        width={22}
                        height={22}
                        className="whatsapp-icon-inline"
                        aria-hidden
                      />
                      WhatsApp
                    </a>
                  </li>
                  <li>
                    <a
                      href={SITE_CONFIG.gmailComposeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-gold-light"
                    >
                      {SITE_CONFIG.email}
                    </a>
                  </li>
                  <li>
                    <a
                      href={SITE_CONFIG.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-gold-light"
                    >
                      {SITE_CONFIG.instagramHandle}
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="map-embed">
              <iframe
                src={SITE_CONFIG.googleMapsEmbed}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: 400, display: 'block' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Mappa Garofalo Barberia"
              />
            </div>
          </div>

          <div className="mt-12">
            <ContactForm />
          </div>

          <div className="mt-10 text-center">
            <Link href="/prenota" className="btn-primary">
              Prenota ora
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}