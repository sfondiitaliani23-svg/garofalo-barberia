'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Share2, Volume2, VolumeX, X } from 'lucide-react';
import { LocLink as Link } from '@/components/i18n/LocLink';
import { L, type Lang } from '@/lib/i18n';
import { storyAgo, storyAgoLabel, type StorySlide } from '@/lib/utils/stories';
import { buildWrappedCard, shareOrDownload } from './shareCard';
import './stories.css';

export type StoryGroup = { id: string; label: string; slides: StorySlide[] };

type Props = {
  groups: StoryGroup[];
  startGroup: number;
  lang: Lang;
  onClose: () => void;
  onSeen: (slideId: string) => void;
};

/** Visore a schermo intero: barrette in alto, tocco a destra avanti, a sinistra indietro, tieni premuto per fermare. */
export function StoriesViewer({ groups, startGroup, lang, onClose: onCloseProp, onSeen }: Props) {
  // Il tasto «Indietro» del telefono chiude le storie e lascia la pagina dov'era (come su Instagram).
  const closedRef = useRef(false);
  const closeProp = useRef(onCloseProp);
  closeProp.current = onCloseProp;
  useEffect(() => {
    history.pushState({ ...(history.state ?? {}), gbStory: true }, '');
    const onPop = () => {
      if (closedRef.current) return;
      closedRef.current = true;
      closeProp.current();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // Chiuso dal pulsante del link: togliamo la voce in più dalla cronologia senza tornare indietro.
      if (history.state?.gbStory) history.replaceState({ ...history.state, gbStory: false }, '');
    };
  }, []);
  const onClose = useCallback(() => {
    if (closedRef.current) return;
    if (history.state?.gbStory) history.back();
    else {
      closedRef.current = true;
      closeProp.current();
    }
  }, []);
  const [g, setG] = useState(startGroup);
  const [i, setI] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const press = useRef<{ t: number; x: number; y: number } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const group = groups[g];
  const slide = group?.slides[i];

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(clock);
  }, []);

  const next = useCallback(() => {
    if (!group) return;
    if (i < group.slides.length - 1) setI(i + 1);
    else if (g < groups.length - 1) {
      setG(g + 1);
      setI(0);
    } else onClose();
  }, [g, i, group, groups.length, onClose]);

  const prev = useCallback(() => {
    if (i > 0) setI(i - 1);
    else if (g > 0) {
      setG(g - 1);
      setI(groups[g - 1].slides.length - 1);
    } else setProgress(0);
  }, [g, i, groups]);

  // Nuova storia: azzera e segna come vista
  useEffect(() => {
    setProgress(0);
    if (slide) onSeen(slide.id);
  }, [slide, onSeen]);

  // Tempo per foto, testi e numeri
  useEffect(() => {
    if (!slide || slide.kind === 'video' || paused || sharing) return;
    let raf = 0;
    let fired = false;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setProgress((p) => {
        const np = p + dt / slide.duration;
        if (np >= 1) {
          if (!fired) {
            fired = true;
            queueMicrotask(next);
          }
          return 1;
        }
        return np;
      });
      if (!fired) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [slide, paused, sharing, next]);

  // Video: segue la sua durata
  useEffect(() => {
    const v = videoRef.current;
    if (!v || slide?.kind !== 'video') return;
    if (paused) v.pause();
    else v.play().catch(() => {});
  }, [paused, slide]);

  // Tastiera, scorrimento della pagina bloccato, focus sul pulsante di chiusura
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('story-open');
    closeRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      document.body.classList.remove('story-open');
    };
  }, [next, prev, onClose]);

  if (!group || !slide) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-story-ui]')) return;
    press.current = { t: Date.now(), x: e.clientX, y: e.clientY };
    holdTimer.current = setTimeout(() => setPaused(true), 220);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    const p = press.current;
    press.current = null;
    if (!p) return;
    const held = Date.now() - p.t > 220;
    setPaused(false);
    if (e.clientY - p.y > 90) return onClose(); // trascinato in giù
    if (held) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (e.clientX - rect.left < rect.width / 3) prev();
    else next();
  };

  const share = async () => {
    setSharing(true);
    try {
      const blob = await buildWrappedCard(group.slides, lang);
      if (blob) await shareOrDownload(blob, lang === 'en' ? 'my-year-garofalo.png' : 'il-mio-anno-garofalo.png');
    } finally {
      setSharing(false);
    }
  };

  const external = slide.ctaHref?.startsWith('https://');

  // Fuori dalla pagina (direttamente nel <body>): sopra header, barra dell'app e pulsanti fissi.
  return createPortal(
    <div className="story-overlay" role="dialog" aria-modal="true" aria-label={group.label}>
      <div className="story-frame" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => setPaused(false)}>
        {/* Barrette */}
        <div className="story-bars" aria-hidden>
          {group.slides.map((s, k) => (
            <span key={s.id}>
              <i style={{ width: `${k < i ? 100 : k === i ? Math.round(progress * 100) : 0}%` }} />
            </span>
          ))}
        </div>

        <div className="story-head" data-story-ui>
          <span className="story-head-who">
            <span className="story-head-label">{group.label}</span>
            {slide.publishedAt ? (
              <time className="story-head-ago" dateTime={new Date(slide.publishedAt).toISOString()} aria-label={storyAgoLabel(slide.publishedAt, now, lang === 'en')}>
                {storyAgo(slide.publishedAt, now, lang === 'en')}
              </time>
            ) : null}
          </span>
          <div className="story-head-actions">
            {slide.kind === 'video' && (
              <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? L(lang, 'Attiva l\'audio', 'Unmute') : L(lang, 'Togli l\'audio', 'Mute')}>
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            )}
            <button ref={closeRef} type="button" onClick={onClose} aria-label={L(lang, 'Chiudi', 'Close')}>
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Contenuto */}
        {slide.kind === 'foto' && slide.mediaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="story-media" src={slide.mediaUrl} alt={L(lang, 'Storia di Barberia Garofalo', 'Barberia Garofalo story')} draggable={false} />
        )}
        {slide.kind === 'video' && slide.mediaUrl && (
          <video
            key={slide.id}
            ref={videoRef}
            className="story-media"
            src={slide.mediaUrl}
            autoPlay
            playsInline
            muted={muted}
            preload="auto"
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.duration) setProgress(v.currentTime / v.duration);
            }}
            onEnded={next}
            onError={next}
          />
        )}
        {(slide.kind === 'foto' || slide.kind === 'video') && <div className="story-shade" aria-hidden />}

        {(slide.kind === 'numero' || slide.kind === 'testo') && (
          <div className={`story-text story-text--${slide.kind}`} key={slide.id}>
            {slide.kind === 'numero' ? (
              <>
                {slide.title && <p className="story-eyebrow">{slide.title}</p>}
                <p className="story-big font-display">{slide.bigNumber}</p>
                {slide.body && <p className="story-body">{slide.body}</p>}
              </>
            ) : (
              <>
                {slide.bigNumber && <p className="story-big story-big--small font-display">{slide.bigNumber}</p>}
                <p className="story-title font-display">{slide.title}</p>
                {slide.body && <p className="story-body">{slide.body}</p>}
              </>
            )}
          </div>
        )}

        <div className="story-foot" data-story-ui>
          {slide.id === 'wrapped-share' ? (
            <button type="button" className="story-cta" onClick={share} disabled={sharing}>
              <Share2 size={18} aria-hidden /> {sharing ? L(lang, 'Preparo l\'immagine…', 'Preparing the image…') : L(lang, 'Condividi nelle storie', 'Share to your stories')}
            </button>
          ) : slide.ctaHref && slide.ctaLabel ? (
            external ? (
              <a className="story-cta" href={slide.ctaHref} target="_blank" rel="noopener noreferrer">
                {slide.ctaLabel} <ChevronRight size={18} aria-hidden />
              </a>
            ) : (
              <Link className="story-cta" href={slide.ctaHref} onClick={() => { closedRef.current = true; onCloseProp(); }}>
                {slide.ctaLabel} <ChevronRight size={18} aria-hidden />
              </Link>
            )
          ) : null}
        </div>

        {paused && <span className="story-paused" aria-live="polite">{L(lang, 'In pausa', 'Paused')}</span>}
      </div>
    </div>,
    document.body
  );
}
