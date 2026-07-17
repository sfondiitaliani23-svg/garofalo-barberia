'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { GALLERY_FILTERS, GALLERY_IMAGES } from '@/lib/data/gallery';

// ─── Costanti animazione ────────────────────────────────────────────────────
const FLIGHT_MS = 420;
const EASING = 'cubic-bezier(0.35, 0.2, 0.2, 1)';

type Rect = { top: number; left: number; width: number; height: number };

/** Calcola il rettangolo di destinazione centrato nello schermo */
function targetRect(): Rect {
  const maxW = Math.min(window.innerWidth * 0.92, 880);
  const maxH = window.innerHeight * 0.88;
  // Mantieni un aspect-ratio 3:4 al massimo
  const w = Math.min(maxW, (maxH / 4) * 3);
  const h = (w / 3) * 4;
  const finalH = Math.min(h, maxH);
  const finalW = (finalH / 4) * 3;
  return {
    top: (window.innerHeight - finalH) / 2,
    left: (window.innerWidth - finalW) / 2,
    width: finalW,
    height: finalH,
  };
}

// ─── Componente principale ───────────────────────────────────────────────────
export function GalleryGrid() {
  const [activeFilter, setActiveFilter] = useState<string>('tutti');

  const filtered =
    activeFilter === 'tutti'
      ? GALLERY_IMAGES
      : GALLERY_IMAGES.filter((img) => img.category === activeFilter);

  // ── Stato lightbox ──────────────────────────────────────────────────────
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [fromRect, setFromRect] = useState<Rect | null>(null);
  const [flightTo, setFlightTo] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => { setPortalReady(true); }, []);

  // Chiudi con Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeLightbox(); };
    if (activeIdx !== null) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [activeIdx]);

  // Blocca scroll body e html quando aperto
  useEffect(() => {
    if (activeIdx !== null) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [activeIdx]);

  const openLightbox = useCallback((globalIdx: number) => {
    if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }

    // Troviamo il ref dall'indice nella lista filtrata
    const el = itemRefs.current[globalIdx];
    if (!el) return;

    const rect = el.getBoundingClientRect();
    setFromRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    setFlightTo(false);
    setActiveIdx(globalIdx);

    requestAnimationFrame(() => requestAnimationFrame(() => setFlightTo(true)));
  }, []);

  const closeLightbox = useCallback(() => {
    if (activeIdx === null) return;
    setFlightTo(false);
    closeTimer.current = window.setTimeout(() => {
      setActiveIdx(null);
      setFromRect(null);
      closeTimer.current = null;
    }, FLIGHT_MS);
  }, [activeIdx]);

  // Rect corrente dell'immagine volante
  const currentRect: Rect | null = fromRect
    ? (flightTo ? targetRect() : fromRect)
    : null;

  const flyStyle: CSSProperties | undefined = currentRect
    ? {
        position: 'fixed',
        top: currentRect.top,
        left: currentRect.left,
        width: currentRect.width,
        height: currentRect.height,
        transition: `top ${FLIGHT_MS}ms ${EASING}, left ${FLIGHT_MS}ms ${EASING}, width ${FLIGHT_MS}ms ${EASING}, height ${FLIGHT_MS}ms ${EASING}`,
        zIndex: 9999,
        borderRadius: '28px',
        overflow: 'hidden',
        pointerEvents: 'none',
      }
    : undefined;

  const activeImage = activeIdx !== null ? filtered[activeIdx] : null;

  // ── Portal: backdrop + immagine volante ──────────────────────────────────
  const portal =
    portalReady && activeImage && fromRect
      ? createPortal(
          <>
            {/* Backdrop: stessa foto sfocata + overlay scuro */}
            <div
              className="fixed inset-0"
              style={{
                zIndex: 9998,
                cursor: 'zoom-out',
                transition: `opacity ${FLIGHT_MS}ms ease`,
                opacity: flightTo ? 1 : 0,
              }}
              onClick={closeLightbox}
              aria-hidden="true"
            >
              {/* Foto sfocata come sfondo */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${activeImage.src})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(28px) brightness(0.25) saturate(0.8)',
                  transform: 'scale(1.1)',
                }}
              />
              {/* Overlay aggiuntivo */}
              <div className="absolute inset-0 bg-black/55" />
            </div>

            {/* Immagine che vola */}
            <div style={flyStyle}>
              <Image
                src={activeImage.src}
                alt={activeImage.alt}
                fill
                sizes="90vw"
                className="object-cover"
                priority
              />
            </div>

            {/* Tasto chiudi */}
            <button
              onClick={closeLightbox}
              aria-label="Chiudi"
              className="fixed top-4 right-4 z-[10000] w-10 h-10 flex items-center justify-center rounded-full bg-black/60 border border-white/20 text-white hover:bg-gold hover:text-black hover:border-gold transition-all backdrop-blur-sm"
              style={{
                transition: `opacity ${FLIGHT_MS}ms ease`,
                opacity: flightTo ? 1 : 0,
              }}
            >
              <X size={18} />
            </button>

            {/* Caption */}
            {flightTo && (
              <p
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] text-xs text-white/60 tracking-widest uppercase bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/10 whitespace-nowrap"
                style={{
                  transition: `opacity ${FLIGHT_MS}ms ease`,
                  opacity: flightTo ? 1 : 0,
                }}
              >
                {activeImage.alt}
              </p>
            )}
          </>,
          document.body,
        )
      : null;

  // ── Render griglia ───────────────────────────────────────────────────────
  return (
    <>
      {portal}

      {/* Filtri */}
      <div className="gallery-filters-bar mb-8 flex flex-wrap items-center gap-3">
        {GALLERY_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={`filter-btn${activeFilter === filter.id ? ' active' : ''}`}
            onClick={() => {
              setActiveFilter(filter.id);
              itemRefs.current = [];
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Griglia foto */}
      <div className="gallery-grid">
        {filtered.map((image, idx) => (
          <div
            key={image.src}
            ref={(el) => { itemRefs.current[idx] = el; }}
            className="gallery-item"
            data-category={image.category}
            role="button"
            tabIndex={0}
            aria-label={`Apri foto: ${image.alt}`}
            style={{ cursor: 'zoom-in' }}
            onClick={() => openLightbox(idx)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openLightbox(idx);
              }
            }}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {/* Overlay hover */}
            <div className="gallery-item-overlay absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
              <span className="opacity-0 hover:opacity-100 transition-opacity duration-300 text-white/80 text-xs uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                Apri
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}