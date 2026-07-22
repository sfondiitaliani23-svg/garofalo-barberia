'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { SITE_CONFIG } from '@/lib/site-config';

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

    // Mantiene lo schermo di caricamento visibile per 2.8 secondi prima del fade out
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
        {/* Logo Ufficiale Barberia Garofalo */}
        <div style={{ position: 'relative', width: '220px', height: '140px' }}>
          <Image
            src="/assets/sostituisci-immagini/icone/barberia_garofalo.png"
            alt={SITE_CONFIG.name}
            width={220}
            height={140}
            priority
            className="w-auto h-full object-contain"
            style={{
              mixBlendMode: 'screen',
              filter: 'drop-shadow(0 0 24px rgba(205, 154, 79, 0.5))',
            }}
          />
        </div>

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
