'use client';

import { useEffect, useRef, useState } from 'react';
import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';

type InstagramEmbedFallbackProps = {
  username: string;
};

/**
 * Il riquadro di Instagram è pesante: lo carichiamo solo quando
 * il cliente ci arriva vicino scorrendo, non appena apre Contatti.
 */
export function InstagramEmbedFallback({ username }: InstagramEmbedFallbackProps) {
  const lang = useLang();
  const boxRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShow(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: '250px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={boxRef} className="contatti-instagram-embed">
      {show && (
        <iframe
          src={`https://www.instagram.com/${username}/embed`}
          title={L(lang, `Ultimi post Instagram @${username}`, `Latest Instagram posts @${username}`)}
          loading="lazy"
          allowFullScreen
          className="contatti-instagram-embed-frame"
        />
      )}
    </div>
  );
}
