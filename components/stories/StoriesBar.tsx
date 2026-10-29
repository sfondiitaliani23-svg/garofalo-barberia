'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { L, type Lang } from '@/lib/i18n';
import type { StorySlide } from '@/lib/utils/stories';
import { getMyWrappedAction } from '@/lib/actions/stories';
import { storageGet, storageSet } from '@/lib/utils/safe-storage';
import type { StoryGroup } from './StoriesViewer';
import './stories.css';

const StoriesViewer = dynamic(() => import('./StoriesViewer').then((m) => m.StoriesViewer), { ssr: false });

const SEEN_KEY = 'gb_storie_viste';

function readSeen(): Set<string> {
  try {
    const raw = storageGet(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/** Cerchi dorati in home: "Novità" (storie del salone) e "Il tuo anno" (Wrapped del cliente con accesso). */
export function StoriesBar({ slides, lang, size, empty = null }: { slides: StorySlide[]; lang: Lang; size?: 'lg'; empty?: React.ReactNode }) {
  const [wrapped, setWrapped] = useState<StorySlide[]>([]);
  const [live, setLive] = useState<StorySlide[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const hashOpened = useRef(false);

  useEffect(() => {
    setSeen(readSeen());
    let alive = true;
    // Senza accesso non c'è nessun Wrapped: niente richiesta al server.
    let loggedIn = true;
    try {
      loggedIn = /sb-[^=]+-auth-token/.test(document.cookie);
    } catch {
      /* cookie non leggibili: proviamo comunque */
    }
    if (!loggedIn) return;
    getMyWrappedAction(lang)
      .then((w) => {
        if (alive) setWrapped(w);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [lang]);

  useEffect(() => {
    let alive = true;
    fetch(`/api/storie?lang=${lang === 'en' ? 'en' : 'it'}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive && data && Array.isArray(data.slides) && data.slides.length) setLive(data.slides);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [lang]);

  const salonSlides = live && live.length ? live : slides;

  const groups: StoryGroup[] = useMemo(() => {
    const out: StoryGroup[] = [];
    if (salonSlides.length) out.push({ id: 'novita', label: L(lang, 'Novità', 'News'), slides: salonSlides });
    if (wrapped.length) out.push({ id: 'wrapped', label: wrapped[0]?.bigNumber ? L(lang, `Il tuo ${wrapped[0].bigNumber}`, `Your ${wrapped[0].bigNumber}`) : L(lang, 'Il tuo anno', 'Your year'), slides: wrapped });
    return out;
  }, [salonSlides, wrapped, lang]);

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash !== '#storie') {
        hashOpened.current = false;
        return;
      }
      if (hashOpened.current) return;
      const index = groups.findIndex((group) => group.id === 'novita');
      if (index < 0) return;
      hashOpened.current = true;
      setOpen(index);
    };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, [groups]);

  const markSeen = useCallback((id: string) => {
    setSeen((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      try {
        storageSet(SEEN_KEY, JSON.stringify([...next].slice(-200)));
      } catch {
        /* memoria del browser non disponibile */
      }
      return next;
    });
  }, []);

  if (!groups.length) return <>{empty}</>;

  return (
    <>
      <div className={`story-bar${size === 'lg' ? ' story-bar--lg' : ''}`} aria-label={L(lang, 'Storie', 'Stories')}>
        {groups.map((gr, k) => {
          const allSeen = gr.slides.every((s) => seen.has(s.id));
          return (
            <button key={gr.id} type="button" className={`story-bubble${allSeen ? ' is-seen' : ''}`} onClick={() => setOpen(k)}>
              <span className="story-ring">
                <span className="story-ring-inner">
                  {gr.id === 'wrapped' ? (
                    <span className="story-ring-year font-display">{wrapped[0]?.bigNumber ?? ''}</span>
                  ) : (
                    <Image src="/assets/sostituisci-immagini/icone/barberia_garofalo.png" alt="" width={56} height={56} style={{ mixBlendMode: 'screen' }} />
                  )}
                </span>
              </span>
              <span className="story-bubble-label">{gr.label}</span>
            </button>
          );
        })}
      </div>
      {open !== null && <StoriesViewer groups={groups} startGroup={open} lang={lang} onClose={() => setOpen(null)} onSeen={markSeen} />}
    </>
  );
}
