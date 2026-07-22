'use client';

import { useEffect, useRef } from 'react';

export function LoadingScreen() {
  const loaderRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Se già mostrato in questa sessione, nascondi subito
    if (sessionStorage.getItem('gbf_loader_shown')) {
      if (loaderRef.current) loaderRef.current.style.display = 'none';
      return;
    }

    // Avvia la barra di progresso
    requestAnimationFrame(() => {
      if (barRef.current) {
        setTimeout(() => {
          if (barRef.current) barRef.current.style.width = '100%';
        }, 50);
      }
    });

    // Fade out dopo 2.2s
    const timer = setTimeout(() => {
      const loader = loaderRef.current;
      if (loader) {
        loader.style.opacity = '0';
        loader.style.pointerEvents = 'none';
        setTimeout(() => {
          if (loader) loader.style.display = 'none';
        }, 620);
      }
      sessionStorage.setItem('gbf_loader_shown', '1');
    }, 2200);

    return () => clearTimeout(timer);
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
        transition: 'opacity 0.6s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          animation: 'gbfLoaderFadeUp 0.8s ease forwards',
        }}
      >
        {/* Logo SVG Barberia Garofalo */}
        <svg
          viewBox="0 0 260 90"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            width: '240px',
            height: 'auto',
            filter: 'drop-shadow(0 0 20px rgba(205, 154, 79, 0.4))',
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
            width: '200px',
            height: '1.5px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            ref={barRef}
            style={{
              height: '100%',
              width: '0%',
              background: 'linear-gradient(90deg, #cd9a4f, #ffb949, #cd9a4f)',
              borderRadius: '2px',
              transition: 'width 1.8s cubic-bezier(0.25, 0.1, 0.25, 1)',
            }}
          />
        </div>

        {/* Tagline */}
        <p
          style={{
            fontFamily: "'Montserrat', 'Helvetica Neue', sans-serif",
            fontSize: '10px',
            fontWeight: 400,
            letterSpacing: '6px',
            color: 'rgba(205, 154, 79, 0.6)',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          DAL 2010
        </p>
      </div>

      <style>{`
        @keyframes gbfLoaderFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
