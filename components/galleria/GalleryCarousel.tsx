'use client';

import { PinchZoom } from '@/components/ui/PinchZoom';
import Image from 'next/image';
import { LocLink as Link } from '@/components/i18n/LocLink';
import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';
import { GALLERY_FILTERS_EN, galleryEn } from '@/lib/i18n/content-team';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Expand, X } from 'lucide-react';
import { GALLERY_FILTERS, GALLERY_IMAGES } from '@/lib/data/gallery';
import './gallery-carousel.css';


/** Sfondo sfocato: versione minuscola in WebP (il blur la rende identica, pesa 100 volte meno). */
const bgOf = (src: string) => src.replace(/^\/assets\/gallery\/([^/]+)\.(jpe?g|png)$/i, '/assets/gallery/bg/$1.webp');

const AUTOPLAY_MS = 6000;

const pad = (n: number) => String(n).padStart(2, '0');

export function GalleryCarousel() {
  const lang = useLang();
  const [filter, setFilter] = useState<string>('tutti');
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pressed, setPressed] = useState<'prev' | 'next' | null>(null);
  const [inView, setInView] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const pressTimer = useRef<number | null>(null);
  const touchX = useRef<number | null>(null);

  const allImages = lang === 'en' ? GALLERY_IMAGES.map((img) => ({ ...img, ...(galleryEn(img.src) ?? {}) })) : GALLERY_IMAGES;
  const images = filter === 'tutti' ? allImages : allImages.filter((img) => img.category === filter);
  const total = images.length;
  const current = images[Math.min(index, total - 1)];
  const copy = current;

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

  // Carosello visibile sullo schermo: solo allora le frecce della tastiera lo comandano
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /** Sposta la foto e accende il pulsante ‹ › corrispondente, come un click. */
  const step = useCallback(
    (dir: 'prev' | 'next') => {
      go(dir === 'next' ? 1 : -1);
      setPressed(dir);
      if (pressTimer.current) window.clearTimeout(pressTimer.current);
      pressTimer.current = window.setTimeout(() => setPressed(null), 180);
    },
    [go]
  );

  // Frecce ← → della tastiera, senza dover cliccare prima sulla galleria
  useEffect(() => {
    if (!inView && !lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        step('next');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        step('prev');
      } else if (e.key === 'Escape' && lightbox) {
        setLightbox(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [inView, lightbox, step]);

  // Pagina bloccata mentre il lightbox è aperto
  useEffect(() => {
    if (!lightbox) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [lightbox]);

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
    <div className="gc" ref={rootRef}>
      <div className="gc-filters" role="group" aria-label={L(lang, 'Filtra le foto', 'Filter photos')}>
        {GALLERY_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`filter-btn${filter === f.id ? ' active' : ''}`}
            aria-pressed={filter === f.id}
            onClick={() => changeFilter(f.id)}
          >
            {lang === 'en' ? GALLERY_FILTERS_EN[f.id] ?? f.label : f.label}
          </button>
        ))}
      </div>

      <div
        className="gc-stage"
        role="region"
        aria-roledescription={L(lang, 'carosello', 'carousel')}
        aria-label={L(lang, 'Galleria dei nostri lavori', 'Gallery of our work')}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className="gc-slide">
          {/* Sfondo sfocato della stessa foto */}
          <div key={`bg-${current.src}`} className="gc-bg" style={{ backgroundImage: `url(${bgOf(current.src)})` }} aria-hidden />

          {/* Foto principale */}
          <button
            type="button"
            className="gc-photo"
            onClick={() => setLightbox(true)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            aria-label={L(lang, `Apri a schermo intero: ${current.alt}`, `Open full screen: ${current.alt}`)}
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
              {L(lang, 'Prenota ora', 'Book now')}
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

          <button
            type="button"
            className={`gc-nav gc-nav-prev${pressed === 'prev' ? ' is-pressed' : ''}`}
            onClick={() => step('prev')}
            aria-label={L(lang, 'Foto precedente', 'Previous photo')}
            aria-keyshortcuts="ArrowLeft"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            className={`gc-nav gc-nav-next${pressed === 'next' ? ' is-pressed' : ''}`}
            onClick={() => step('next')}
            aria-label={L(lang, 'Foto successiva', 'Next photo')}
            aria-keyshortcuts="ArrowRight"
          >
            <ChevronRight size={22} />
          </button>
        </div>

        {/* Miniature */}
        <div className="gc-thumbs-col">
          <button type="button" className="gc-thumbs-arrow" onClick={() => go(-1)} aria-label={L(lang, 'Foto precedente', 'Previous photo')}>
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
                aria-label={L(lang, `Foto ${i + 1}: ${img.alt}`, `Photo ${i + 1}: ${img.alt}`)}
                aria-current={i === index}
              >
                <Image src={img.src} alt="" fill sizes="96px" className="object-cover" />
              </button>
            ))}
          </div>
          <button type="button" className="gc-thumbs-arrow" onClick={() => go(1)} aria-label={L(lang, 'Foto successiva', 'Next photo')}>
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
            <div className="gc-lightbox-bg" style={{ backgroundImage: `url(${bgOf(current.src)})` }} aria-hidden />
            <div className="gc-lightbox-frame" onClick={(e) => e.stopPropagation()}>
              <PinchZoom className="gc-lightbox-zoom" resetKey={current.src}>
                <Image key={current.src} src={current.src} alt={current.alt} fill sizes="92vw" className="object-contain" priority />
              </PinchZoom>
            </div>
            <button type="button" className="gc-lb-btn gc-lb-close" onClick={() => setLightbox(false)} aria-label={L(lang, 'Chiudi', 'Close')}>
              <X size={18} />
            </button>
            <button
              type="button"
              className="gc-lb-btn gc-lb-prev"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              aria-label={L(lang, 'Foto precedente', 'Previous photo')}
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
              aria-label={L(lang, 'Foto successiva', 'Next photo')}
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
