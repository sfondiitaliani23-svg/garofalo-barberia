'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { SITE_CONFIG } from '@/lib/site-config';

export function LoadingScreen() {
  const loaderRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Se la pagina viene ricaricata (F5/Reload) o se ci troviamo sulla Homepage ('/'),
    // la schermata di caricamento deve SEMPRE essere mostrata.
    const isReload =
      typeof window !== 'undefined' &&
      window.performance &&
      window.performance.getEntriesByType('navigation')?.length > 0 &&
      (window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type === 'reload';

    const isHomepage = typeof window !== 'undefined' && window.location.pathname === '/';

    // Salta la schermata di caricamento solo per le transizioni tra sottopagine nello stesso tab
    if (sessionStorage.getItem('gbf_loader_shown') && !isReload && !isHomepage) {
      return;
    }

    setShouldRender(true);

    // Avvia la barra di progresso
    const barTimer = setTimeout(() => {
      if (barRef.current) {
        barRef.current.style.width = '100%';
      }
    }, 40);

    // Fade out rapido dopo 1.0s per un'esperienza fluida e scattante
    const fadeTimer = setTimeout(() => {
      const loader = loaderRef.current;
      if (loader) {
        loader.style.opacity = '0';
        loader.style.pointerEvents = 'none';
        setTimeout(() => {
          setShouldRender(false);
        }, 400);
      }
      sessionStorage.setItem('gbf_loader_shown', '1');
    }, 1000);

    return () => {
      clearTimeout(barTimer);
      clearTimeout(fadeTimer);
    };
  }, []);

  if (!shouldRender) return null;

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
        transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          animation: 'gbfLoaderFadeUp 0.5s ease forwards',
        }}
      >
        {/* Logo Ufficiale Barberia Garofalo */}
        <div style={{ position: 'relative', width: '200px', height: '120px' }}>
          <Image
            src="/assets/sostituisci-immagini/icone/barberia_garofalo.png"
            alt={SITE_CONFIG.name}
            width={200}
            height={120}
            priority
            className="w-auto h-full object-contain"
            style={{
              mixBlendMode: 'screen',
              filter: 'drop-shadow(0 0 20px rgba(205, 154, 79, 0.5))',
            }}
          />
        </div>

        {/* Barra di progresso */}
        <div
          style={{
            width: '180px',
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
              transition: 'width 0.9s cubic-bezier(0.25, 0.1, 0.25, 1)',
            }}
          />
        </div>

        {/* Tagline */}
        <p
          style={{
            fontFamily: "'Montserrat', 'Helvetica Neue', sans-serif",
            fontSize: '9px',
            fontWeight: 500,
            letterSpacing: '6px',
            color: 'rgba(205, 154, 79, 0.7)',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          DAL 2025
        </p>
      </div>

      <style>{`
        @keyframes gbfLoaderFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
