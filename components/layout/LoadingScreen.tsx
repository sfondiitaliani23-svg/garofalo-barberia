'use client';

import { useEffect, useRef } from 'react';

export function LoadingScreen() {
  const loaderRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Avvia la barra di progresso con leggero delay per consentire il render
    const barTimer = setTimeout(() => {
      if (barRef.current) {
        barRef.current.style.width = '100%';
      }
    }, 80);

    // Mantiene lo schermo di caricamento visibile per 2.8 secondi prima di iniziare il fade out
    const fadeTimer = setTimeout(() => {
      const loader = loaderRef.current;
      if (loader) {
        loader.style.opacity = '0';
        loader.style.pointerEvents = 'none';
        
        // Rimuove completamente dal DOM dopo la transizione di fade out (800ms)
        setTimeout(() => {
          if (loader) loader.style.display = 'none';
        }, 800);
      }
    }, 2800);

    return () => {
      clearTimeout(barTimer);
      clearTimeout(fadeTimer);
    };
  }, []);

  return (
    <div
      ref={loaderRef}
      id="gbf-loader"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        zIndex: 999999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          animation: 'gbfLoaderFadeUp 0.9s ease forwards',
        }}
      >
        {/* Logo SVG Barberia Garofalo */}
        <svg
          viewBox="0 0 260 90"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            width: '250px',
            height: 'auto',
            filter: 'drop-shadow(0 0 24px rgba(205, 154, 79, 0.45))',
          }}
        >
          <defs>
            <linearGradient id="gbf-gold-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#cd9a4f" />
              <stop offset="50%" stopColor="#ffb949" />
              <stop offset="100%" stopColor="#cd9a4f" />
            </linearGradient>
          </defs>
          {/* Simbolo forbici stilizzato a sinistra */}
          <g transform="translate(8, 12)">
            {/* Lama superiore */}
            <path
              d="M4 4 L32 24 L28 28 L0 8 Z"
              fill="url(#gbf-gold-grad)"
              rx="1"
            />
            {/* Lama inferiore */}
            <path
              d="M4 52 L32 32 L28 28 L0 48 Z"
              fill="url(#gbf-gold-grad)"
              rx="1"
            />
            {/* Perno centrale */}
            <circle cx="28" cy="28" r="4" fill="url(#gbf-gold-grad)" />
          </g>
          {/* Testo BARBERIA */}
          <text
            x="56"
            y="36"
            fontFamily="'Oswald', 'Montserrat', sans-serif"
            fontSize="13"
            fontWeight="600"
            fill="url(#gbf-gold-grad)"
            letterSpacing="6"
            textAnchor="start"
          >
            BARBERIA
          </text>
          {/* Testo GAROFALO */}
          <text
            x="54"
            y="60"
            fontFamily="'Rye', Georgia, serif"
            fontSize="28"
            fontWeight="700"
            fill="url(#gbf-gold-grad)"
            letterSpacing="4"
            textAnchor="start"
          >
            GAROFALO
          </text>
          {/* Linea decorativa */}
          <line
            x1="56"
            y1="68"
            x2="240"
            y2="68"
            stroke="url(#gbf-gold-grad)"
            strokeWidth="0.8"
            opacity="0.5"
          />
          {/* Sottotitolo */}
          <text
            x="56"
            y="80"
            fontFamily="'Montserrat', sans-serif"
            fontSize="9"
            fontWeight="400"
            fill="#cd9a4f"
            letterSpacing="5"
            opacity="0.7"
          >
            FOGGIA
          </text>
        </svg>

        {/* Barra di progresso */}
        <div
          style={{
            width: '210px',
            height: '2px',
            background: 'rgba(255,255,255,0.12)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          <div
            ref={barRef}
            style={{
              height: '100%',
              width: '0%',
              background: 'linear-gradient(90deg, #cd9a4f, #ffb949, #cd9a4f)',
              borderRadius: '3px',
              transition: 'width 2.5s cubic-bezier(0.25, 0.1, 0.25, 1)',
            }}
          />
        </div>

        {/* Tagline */}
        <p
          style={{
            fontFamily: "'Montserrat', 'Helvetica Neue', sans-serif",
            fontSize: '10px',
            fontWeight: 500,
            letterSpacing: '7px',
            color: 'rgba(205, 154, 79, 0.7)',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          DAL 2010
        </p>
      </div>

      <style>{`
        @keyframes gbfLoaderFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
