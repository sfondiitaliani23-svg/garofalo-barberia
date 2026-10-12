'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, MessageSquare, MessagesSquare, ShieldCheck, Star } from 'lucide-react';
import './reviews-carousel.css';

export interface CarouselReview {
  text: string;
  author: string;
  rating: number;
  date: string | null;
}

export interface CarouselStats {
  total: number;
  average: number;
  satisfiedPercent: number;
}

const AUTOPLAY_MS = 7000;
const SIDE_IMAGE = '/assets/gallery/1000313544.jpg';

/** Prima frase come titolo in evidenza, il resto come testo. */
function splitReview(text: string): { headline: string; body: string } {
  const clean = text.trim();
  if (clean.length <= 90) return { headline: clean, body: '' };
  const match = clean.match(/^([\s\S]{20,140}?[.!?])\s+([\s\S]+)$/);
  if (match) return { headline: match[1], body: match[2] };
  return { headline: clean, body: '' };
}

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span className="rc-stars" aria-label={`${rating} stelle su 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={size} className={i < rating ? 'is-on' : 'is-off'} aria-hidden />
      ))}
    </span>
  );
}

export function ReviewsCarousel({ reviews, stats }: { reviews: CarouselReview[]; stats: CarouselStats }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [inView, setInView] = useState(false);
  const [pressed, setPressed] = useState<'prev' | 'next' | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const pressTimer = useRef<number | null>(null);

  const total = reviews.length;
  const go = useCallback((delta: number) => setIndex((i) => (i + delta + total) % total), [total]);

  const step = useCallback(
    (dir: 'prev' | 'next') => {
      go(dir === 'next' ? 1 : -1);
      setPressed(dir);
      if (pressTimer.current) window.clearTimeout(pressTimer.current);
      pressTimer.current = window.setTimeout(() => setPressed(null), 180);
    },
    [go]
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Autoplay: fermo su hover/focus o con movimento ridotto
  useEffect(() => {
    if (paused || reducedMotion || total < 2) return;
    const id = window.setTimeout(() => go(1), AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [index, paused, reducedMotion, total, go]);

  // Frecce ← → della tastiera, come nella Galleria
  useEffect(() => {
    if (!inView || total < 2) return;
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
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [inView, total, step]);

  const current = total > 0 ? reviews[Math.min(index, total - 1)] : null;
  const parts = current ? splitReview(current.text) : null;

  return (
    <div className="rc" ref={rootRef}>
      <div
        className="rc-stage"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) step(dx < 0 ? 'next' : 'prev');
          touchX.current = null;
        }}
      >
        <div className="rc-photo" style={{ backgroundImage: `url(${SIDE_IMAGE})` }} aria-hidden />

        <div className="rc-content">
          {current && parts ? (
            <article
              key={`${current.author}-${index}`}
              className="rc-card"
              aria-roledescription="recensione"
              aria-label={`Recensione ${index + 1} di ${total}`}
            >
              <Stars rating={current.rating || 5} />
              <blockquote className="rc-quote">&ldquo;{parts.headline}&rdquo;</blockquote>
              {parts.body && <p className="rc-body">{parts.body}</p>}
              <div className="rc-foot">
                <div>
                  <p className="rc-author">{current.author}</p>
                  {current.date && <p className="rc-date">{current.date}</p>}
                </div>
                <Link href="/recensioni/nuova" className="rc-cta">
                  <MessageSquare size={15} strokeWidth={1.75} aria-hidden />
                  Lascia una recensione
                </Link>
              </div>
            </article>
          ) : (
            <article className="rc-card">
              <p className="rc-eyebrow">Le voci dei clienti</p>
              <blockquote className="rc-quote">Ancora nessuna recensione pubblicata.</blockquote>
              <p className="rc-body">Sei stato da noi? Raccontaci com&apos;è andata: la tua sarà la prima.</p>
              <div className="rc-foot">
                <span />
                <Link href="/recensioni/nuova" className="rc-cta">
                  <MessageSquare size={15} strokeWidth={1.75} aria-hidden />
                  Lascia una recensione
                </Link>
              </div>
            </article>
          )}

          {total > 1 && (
            <>
              <button
                type="button"
                className={`rc-nav rc-nav-prev${pressed === 'prev' ? ' is-pressed' : ''}`}
                onClick={() => step('prev')}
                aria-label="Recensione precedente"
                aria-keyshortcuts="ArrowLeft"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className={`rc-nav rc-nav-next${pressed === 'next' ? ' is-pressed' : ''}`}
                onClick={() => step('next')}
                aria-label="Recensione successiva"
                aria-keyshortcuts="ArrowRight"
              >
                <ChevronRight size={18} />
              </button>
              <div className="rc-dots" role="tablist" aria-label="Scegli recensione">
                {reviews.map((r, i) => (
                  <button
                    key={`${r.author}-${i}`}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`Recensione ${i + 1}`}
                    className={`rc-dot${i === index ? ' is-active' : ''}`}
                    onClick={() => setIndex(i)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {stats.total > 0 && (
        <div className="rc-stats">
          <div className="rc-stat">
            <Star size={20} strokeWidth={1.5} aria-hidden />
            <div>
              <p className="rc-stat-value">{stats.average.toFixed(1).replace('.', ',')}</p>
              <p className="rc-stat-label">Media recensioni</p>
            </div>
          </div>
          <div className="rc-stat">
            <MessagesSquare size={20} strokeWidth={1.5} aria-hidden />
            <div>
              <p className="rc-stat-value">{stats.total}</p>
              <p className="rc-stat-label">{stats.total === 1 ? 'Recensione totale' : 'Recensioni totali'}</p>
            </div>
          </div>
          <div className="rc-stat">
            <ShieldCheck size={20} strokeWidth={1.5} aria-hidden />
            <div>
              <p className="rc-stat-value">{stats.satisfiedPercent}%</p>
              <p className="rc-stat-label">Clienti soddisfatti (4-5 stelle)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
