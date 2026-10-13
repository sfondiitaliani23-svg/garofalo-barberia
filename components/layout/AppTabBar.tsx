'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarCheck, Home, MapPin } from 'lucide-react';

/**
 * Barra in basso in stile app: un "dock" sospeso con pulsanti rotondi in rilievo.
 * La voce attiva è incassata con bagliore oro; al tocco compare il nome sopra il pulsante.
 * Visibile solo quando il sito è aperto dall'icona sulla schermata Home (html.is-app) e da telefono.
 */
export function AppTabBar() {
  const pathname = usePathname() ?? '/';
  const [tip, setTip] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const tabs = [
    { href: '/', label: 'Home', icon: Home, active: pathname === '/' },
    { href: '/prenota', label: 'Prenota', icon: CalendarCheck, active: pathname.startsWith('/prenota') },
    { href: '/contatti', label: 'Contatti', icon: MapPin, active: pathname.startsWith('/contatti') },
  ];

  const showTip = (label: string) => {
    setTip(label);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTip(null), 1200);
  };

  return (
    <nav className="app-tabbar" aria-label="Navigazione app">
      {tabs.map(({ href, label, icon: Icon, active }) => (
        <Link
          key={label}
          href={href}
          data-tooltip={label}
          aria-label={label}
          className={`app-tab${active ? ' is-active' : ''}${tip === label ? ' show-tip' : ''}`}
          aria-current={active ? 'page' : undefined}
          onClick={() => {
            showTip(label);
            try {
              navigator.vibrate?.(8);
            } catch {
              /* vibrazione non disponibile */
            }
          }}
        >
          <span className="app-tab-icon" aria-hidden>
            <Icon size={22} strokeWidth={active ? 2.2 : 1.9} />
          </span>
          <span className="app-tab-dot" aria-hidden />
        </Link>
      ))}
    </nav>
  );
}
