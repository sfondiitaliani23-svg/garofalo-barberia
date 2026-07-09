import Link from 'next/link';
import { SITE_CONFIG } from '@/lib/site-config';

function PhoneIcon() {
  return (
    <svg className="footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg className="footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg className="footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <path d="M22 6l-10 7L2 6" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer border-t border-white/10 bg-black py-12 text-white/70">
      <div className="container-lux footer-grid grid gap-8 md:grid-cols-3">
        <div>
          <h3 className="footer-heading mb-4 font-display text-sm uppercase tracking-wider text-white">Servizi</h3>
          <ul className="footer-list space-y-2 text-sm">
            {SITE_CONFIG.services.map((service) => (
              <li key={service}>
                <Link href="/servizi" className="hover:text-gold-light">
                  {service}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="footer-heading mb-4 font-display text-sm uppercase tracking-wider text-white">Contatti</h3>
          <p className="footer-location-name mb-2 text-sm font-semibold text-white/80">Foggia</p>
          <ul className="footer-contact-list">
            <li className="footer-contact-item">
              <a href={`tel:${SITE_CONFIG.phone}`} className="footer-contact-link">
                <PhoneIcon />
                <span>{SITE_CONFIG.phoneDisplay}</span>
              </a>
            </li>
            <li className="footer-contact-item">
              <LocationIcon />
              <Link href="/contatti" className="hover:text-gold-light">
                {SITE_CONFIG.address}
              </Link>
            </li>
          </ul>
          <p className="footer-location-name mb-2 mt-4 text-sm font-semibold text-white/80">Email</p>
          <ul className="footer-contact-list">
            <li className="footer-contact-item">
              <a
                href={SITE_CONFIG.gmailComposeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-contact-link"
              >
                <EmailIcon />
                <span>{SITE_CONFIG.email}</span>
              </a>
            </li>
          </ul>
          <div className="footer-social mt-4 flex gap-2">
            <a
              href={`https://wa.me/${SITE_CONFIG.whatsapp}`}
              className="footer-social-link"
              aria-label="WhatsApp"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.532 5.855L.057 23.43l5.746-1.507A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.82a9.82 9.82 0 01-5.01-1.374l-.36-.214-3.407.894.908-3.32-.235-.374A9.82 9.82 0 0112 2.18c5.422 0 9.82 4.398 9.82 9.82 0 5.422-4.398 9.82-9.82 9.82z" />
              </svg>
            </a>
            <a
              href={SITE_CONFIG.instagram}
              className="footer-social-link"
              aria-label="Instagram"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
                <path d="M17.5 6.5h.01" />
              </svg>
            </a>
          </div>
        </div>

        <div>
          <h3 className="footer-heading mb-4 font-display text-sm uppercase tracking-wider text-white">
            Orari di apertura
          </h3>
          <p className="footer-location-name mb-2 text-sm font-semibold text-white/80">Foggia</p>
          <div className="footer-hours flex flex-col gap-1 text-sm">
            {SITE_CONFIG.detailedHours.map((h) => (
              <div key={h.day} className="footer-hours-row flex justify-between gap-4">
                <span>{h.day}</span>
                <span>{h.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="footer-copy container-lux border-t border-white/10 text-center text-xs text-white/40">
        © 2026 Garofalo Barberia by Elisee Graphic. Tutti i diritti riservati.
      </p>
    </footer>
  );
}