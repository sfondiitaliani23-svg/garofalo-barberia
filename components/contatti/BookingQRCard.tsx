'use client';

import { QRCodeSVG } from 'qrcode.react';
import Image from 'next/image';

const BOOKING_URL = 'https://barberiagarofalo.it/login';

export function BookingQRCard() {
  return (
    <div className="booking-qr-section">
      {/* Eyebrow */}
      <div className="eyebrow mb-6">
        <div className="eyebrow-line" />
        <span className="eyebrow-text">Accedi con un click</span>
      </div>

      <div className="booking-qr-wrapper">
        {/* Card stile portachiave */}
        <div className="booking-qr-card" aria-label="QR Code per prenotare">
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
              style={{ mixBlendMode: 'screen' }}
            />
            <p className="qr-brand-name">BARBERIA<br />GAROFALO</p>
            <div className="qr-divider" />
            <p className="qr-tagline">Foggia · dal 2025</p>
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
        <div className="booking-qr-card" aria-label="QR Code prenotazione">
          {/* Foro portachiave */}
          <div className="qr-keychain-hole" aria-hidden="true" />

          {/* Lato RETRO: QR Code */}
          <div className="qr-card-back">
            <p className="qr-scan-label">SCANSIONA</p>
            <div className="qr-code-wrap">
              <QRCodeSVG
                value={BOOKING_URL}
                size={140}
                bgColor="transparent"
                fgColor="#c5a859"
                level="H"
                imageSettings={{
                  src: '/assets/logo.png',
                  x: undefined,
                  y: undefined,
                  height: 28,
                  width: 28,
                  excavate: true,
                }}
              />
            </div>
            <p className="qr-scan-sub">per accedere alla tua area personale</p>
            <div className="qr-divider" />
            <p className="qr-url-text">barberiagarofalo.it/login</p>
          </div>
        </div>
      </div>

      {/* CTA testo sotto */}
      <p className="qr-cta-text">
        Inquadra il QR con la fotocamera del tuo smartphone e accedi direttamente alla tua area personale — senza digitare nulla.
      </p>

      {/* Bottone diretto */}
      <a
        href={BOOKING_URL}
        className="qr-direct-btn"
        aria-label="Accedi ora"
      >
        Accedi ora
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </div>
  );
}
