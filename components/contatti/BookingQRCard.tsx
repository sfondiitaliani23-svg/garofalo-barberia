'use client';

import { QRCodeSVG } from 'qrcode.react';
import Image from 'next/image';
import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';

const BOOKING_URL = 'https://barberiagarofalo.it/prenota'; // punta all'area prenotazioni
const BOOKING_URL_EN = 'https://barberiagarofalo.it/en/prenota';

export function BookingQRCard() {
  const lang = useLang();
  const bookingUrl = L(lang, BOOKING_URL, BOOKING_URL_EN);
  return (
    <div className="booking-qr-section">
      {/* Eyebrow */}
      <div className="eyebrow mb-6">
        <div className="eyebrow-line" />
        <span className="eyebrow-text">{L(lang, 'Prenota con un click', 'Book in one click')}</span>
      </div>

      <div className="booking-qr-wrapper">
        {/* Card stile portachiave */}
        <div className="booking-qr-card" aria-label={L(lang, 'QR Code per prenotare', 'QR code to book')}>
          {/* Foro portachiave */}
          <div className="qr-keychain-hole" aria-hidden="true" />

          {/* Lato FRONTE: Logo */}
          <div className="qr-card-front">
            <Image
              src="/assets/sostituisci-immagini/icone/barberia_garofalo.png"
              alt="Barberia Garofalo"
              width={120}
              height={120}
              className="qr-logo-img"
            />
            <p className="qr-brand-name">BARBERIA<br />GAROFALO</p>
            <div className="qr-divider" />
            <p className="qr-tagline">{L(lang, 'Foggia · dal 2025', 'Foggia · since 2025')}</p>
          </div>
        </div>

        {/* Freccia separatrice */}
        <div className="qr-arrow" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path
              d="M6 16h20M18 8l8 8-8 8"
              stroke="#c5a859"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Card stile portachiave - Retro QR */}
        <div className="booking-qr-card" aria-label={L(lang, 'QR Code prenotazione', 'Booking QR code')}>
          {/* Foro portachiave */}
          <div className="qr-keychain-hole" aria-hidden="true" />

          {/* Lato RETRO: QR Code */}
          <div className="qr-card-back">
            <p className="qr-scan-label">{L(lang, 'SCANSIONA', 'SCAN')}</p>
            <div className="qr-code-wrap">
              <QRCodeSVG
                value={bookingUrl}
                size={140}
                bgColor="transparent"
                fgColor="#c5a859"
                level="M"
              />
            </div>
            <p className="qr-scan-sub">{L(lang, 'per prenotare il tuo appuntamento', 'to book your appointment')}</p>
            <div className="qr-divider" />
            <p className="qr-url-text">{L(lang, 'barberiagarofalo.it/prenota', 'barberiagarofalo.it/en/prenota')}</p>
          </div>
        </div>
      </div>

      {/* CTA testo sotto */}
      <p className="qr-cta-text">
        {L(
          lang,
          'Inquadra il QR con la fotocamera del tuo smartphone e prenota il tuo appuntamento — senza telefonate.',
          'Point your smartphone camera at the QR code and book your appointment — no phone calls needed.',
        )}
      </p>

      {/* Bottone diretto */}
      <a
        href={bookingUrl}
        className="qr-direct-btn"
        aria-label={L(lang, 'Prenota ora', 'Book now')}
      >
        {L(lang, 'Prenota ora', 'Book now')}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </div>
  );
}
