'use client';

import { useEffect, useRef, useState } from 'react';
import { LocLink as Link } from '@/components/i18n/LocLink';
import { usePathname } from 'next/navigation';
import { useLang } from '@/components/i18n/LangProvider';
import { stripLang } from '@/lib/i18n';
import { tabBarText } from '@/lib/i18n/content-widgets';
import { CalendarCheck, Home, MapPin } from 'lucide-react';
import { getWhatsAppLink } from '@/lib/site-config';

/** Simbolo di WhatsApp con lo stesso tratto delle altre icone (come su Maximize e Maurizio Barber Shop). */
function WhatsAppIcon({ size = 22, strokeWidth = 1.9 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a9 9 0 0 1-13.4 7.8L3 21l1.3-4.4A9 9 0 1 1 21 12z" />
      <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8c-1-.5-1.8-1.3-2.3-2.3l.8-1-1-2z" />
    </svg>
  );
}

/**
 * Barra in basso in stile app: un "dock" sospeso con pulsanti rotondi in rilievo.
 * La voce attiva è incassata con bagliore oro; al tocco compare il nome sopra il pulsante.
 * Visibile solo quando il sito è aperto dall'icona sulla schermata Home (html.is-app) e da telefono.
 */
export function AppTabBar() {
  const lang = useLang();
  const t = tabBarText(lang);
  const pathname = stripLang(usePathname() ?? '/');
  const [tip, setTip] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const tabs = [
    { href: '/', label: t.home, icon: Home, active: pathname === '/' },
    {
      href: '/prenota',
      label: t.book,
      icon: CalendarCheck,
      active: pathname.startsWith('/prenota'),
    },
    {
      href: '/contatti',
      label: t.contact,
      icon: MapPin,
      active: pathname.startsWith('/contatti'),
    },
  ];
  const wa = getWhatsAppLink(undefined, lang);

  const showTip = (label: string) => {
    setTip(label);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTip(null), 1200);
  };

  return (
    <nav className="app-tabbar" aria-label={t.nav}>
      <div className="app-dock">
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
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          data-tooltip="WhatsApp"
          aria-label="WhatsApp"
          className={`app-tab${tip === 'WhatsApp' ? ' show-tip' : ''}`}
          onClick={() => showTip('WhatsApp')}
        >
          <span className="app-tab-icon" aria-hidden>
            <WhatsAppIcon />
          </span>
          <span className="app-tab-dot" aria-hidden />
        </a>
      </div>
    </nav>
  );
}
