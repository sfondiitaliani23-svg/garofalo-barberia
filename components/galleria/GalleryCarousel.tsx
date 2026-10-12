'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Expand, X } from 'lucide-react';
import { GALLERY_FILTERS, GALLERY_IMAGES, type GalleryCategory } from '@/lib/data/gallery';
import './gallery-carousel.css';

const AUTOPLAY_MS = 6000;

const CATEGORY_COPY: Record<GalleryCategory, { eyebrow: string; title: string; accent: string; text: string }> = {
  uomo: {
    eyebrow: 'Tagli uomo',
    title: 'Precisione',
    accent: 'in ogni dettaglio.',
    text: 'Tagli moderni e classici, barba curata. Ogni stile nasce da un ascolto attento e da una tecnica precisa.',
  },
  ragazzo: {
    eyebrow: 'Tagli ragazzo',
    title: 'Lo stile',
    accent: 'che ti rappresenta.',
    text: 'Fade, texture e tagli di tendenza. Ti consigliamo il look giusto e lo realizziamo con cura.',
  },
  bimbo: {
    eyebrow: 'Tagli bimbo',
    title: 'Piccoli clienti,',
    accent: 'grande pazienza.',
    text: 'Prendiamo tutto il tempo necessario: niente fretta, niente pressione. Anche per il primo taglio.',
  },
};

const pad = (n: number) => String(n).padStart(2, '0');

export function GalleryCarousel() {
  const [filter, setFilter] = useState<string>('tutti');
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [mounted, setMounted] = useState(false);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);

  const images = filter === 'tutti' ? GALLERY_IMAGES : GALLERY_IMAGES.filter((img) => img.category === filter);
  const total = images.length;
  const current = images[Math.min(index, total - 1)];
  const copy = CATEGORY_COPY[current.category];

  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + total) % total),
    [total]
  );

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Autoplay (fermo su hover, focus, lightbox o movimento ridotto)
  useEffect(() => {
    if (paused || lightbox || reducedMotion || total < 2) return;
    const id = window.setTimeout(() => go(1), AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [index, paused, lightbox, reducedMotion, total, go]);

  // Miniatura attiva sempre visibile (scorre solo la colonna, non la pagina)
  useEffect(() => {
    const box = thumbsRef.current;
    const el = box?.querySelector<HTMLElement>(`[data-idx="${index}"]`);
    if (!box || !el) return;
    const vertical = box.scrollHeight > box.clientHeight;
    if (vertical) {
      box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' });
    } else {
      box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
    }
  }, [index, filter]);

  // Tastiera nel lightbox
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false);
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightbox, go]);

  const changeFilter = (id: string) => {
    setFilter(id);
    setIndex(0);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  const progress = ((index + 1) / total) * 100;

  return (
    <div className="gc">
      <div className="gc-filters" role="group" aria-label="Filtra le foto">
        {GALLERY_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`filter-btn${filter === f.id ? ' active' : ''}`}
            aria-pressed={filter === f.id}
            onClick={() => changeFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div
        className="gc-stage"
        role="region"
        aria-roledescription="carosello"
        aria-label="Galleria dei nostri lavori"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(1);
          if (e.key === 'ArrowLeft') go(-1);
        }}
      >
        <div className="gc-slide">
          {/* Sfondo sfocato della stessa foto */}
          <div key={`bg-${current.src}`} className="gc-bg" style={{ backgroundImage: `url(${current.src})` }} aria-hidden />

          {/* Foto principale */}
          <button
            type="button"
            className="gc-photo"
            onClick={() => setLightbox(true)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            aria-label={`Apri a schermo intero: ${current.alt}`}
          >
            <Image
              key={current.src}
              src={current.src}
              alt={current.alt}
              fill
              sizes="(max-width: 900px) 100vw, 60vw"
              className="gc-photo-img"
              priority={index === 0}
            />
            <span className="gc-expand" aria-hidden>
              <Expand size={15} />
            </span>
          </button>

          {/* Testo */}
          <div key={`txt-${current.src}`} className="gc-text" aria-live="polite">
            <p className="gc-eyebrow">{copy.eyebrow}</p>
            <h2 className="gc-title">
              {copy.title}
              <br />
              <span>{copy.accent}</span>
            </h2>
            <p className="gc-desc">{copy.text}</p>
            <p className="gc-caption">{current.alt}</p>
            <Link href="/prenota" className="gc-cta">
              Prenota ora
              <ArrowRight size={14} aria-hidden />
            </Link>

            <div className="gc-counter">
              <span>
                {pad(index + 1)} / {pad(total)}
              </span>
              <span className="gc-bar" aria-hidden>
                <span style={{ width: `${progress}%` }} />
              </span>
            </div>
          </div>

          <button type="button" className="gc-nav gc-nav-prev" onClick={() => go(-1)} aria-label="Foto precedente">
            <ChevronLeft size={22} />
          </button>
          <button type="button" className="gc-nav gc-nav-next" onClick={() => go(1)} aria-label="Foto successiva">
            <ChevronRight size={22} />
          </button>
        </div>

        {/* Miniature */}
        <div className="gc-thumbs-col">
          <button type="button" className="gc-thumbs-arrow" onClick={() => go(-1)} aria-label="Foto precedente">
            <ChevronUp size={16} />
          </button>
          <div ref={thumbsRef} className="gc-thumbs">
            {images.map((img, i) => (
              <button
                key={img.src}
                type="button"
                data-idx={i}
                className={`gc-thumb${i === index ? ' is-active' : ''}`}
                onClick={() => setIndex(i)}
                aria-label={`Foto ${i + 1}: ${img.alt}`}
                aria-current={i === index}
              >
                <Image src={img.src} alt="" fill sizes="96px" className="object-cover" />
              </button>
            ))}
          </div>
          <button type="button" className="gc-thumbs-arrow" onClick={() => go(1)} aria-label="Foto successiva">
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {mounted &&
        lightbox &&
        createPortal(
          <div
            className="gc-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={current.alt}
            onClick={() => setLightbox(false)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div className="gc-lightbox-bg" style={{ backgroundImage: `url(${current.src})` }} aria-hidden />
            <div className="gc-lightbox-frame" onClick={(e) => e.stopPropagation()}>
              <Image key={current.src} src={current.src} alt={current.alt} fill sizes="92vw" className="object-contain" priority />
            </div>
            <button type="button" className="gc-lb-btn gc-lb-close" onClick={() => setLightbox(false)} aria-label="Chiudi">
              <X size={18} />
            </button>
            <button
              type="button"
              className="gc-lb-btn gc-lb-prev"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              aria-label="Foto precedente"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              className="gc-lb-btn gc-lb-next"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              aria-label="Foto successiva"
            >
              <ChevronRight size={22} />
            </button>
            <p className="gc-lb-caption">
              {pad(index + 1)} / {pad(total)} · {current.alt}
            </p>
          </div>,
          document.body
        )}
    </div>
  );
}
