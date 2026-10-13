'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarCheck, CalendarDays, Home, Scissors, User } from 'lucide-react';

/**
 * Barra in basso in stile app. Visibile solo quando il sito è aperto
 * dall'icona sulla schermata Home (html.is-app) e solo da telefono.
 */
export function AppTabBar() {
  const pathname = usePathname() ?? '/';
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(/sb-[^=]+-auth-token/.test(document.cookie));
  }, [pathname]);

  const tabs = [
    { href: '/', label: 'Home', icon: Home, active: pathname === '/' },
    { href: '/servizi', label: 'Servizi', icon: Scissors, active: pathname.startsWith('/servizi') },
    { href: '/prenota', label: 'Prenota', icon: CalendarCheck, active: pathname.startsWith('/prenota'), main: true },
    {
      href: loggedIn ? '/area-cliente/appuntamenti' : '/login',
      label: 'Appuntamenti',
      icon: CalendarDays,
      active: pathname.startsWith('/area-cliente/appuntamenti'),
    },
    {
      href: loggedIn ? '/area-cliente/dashboard' : '/login',
      label: loggedIn ? 'Account' : 'Accedi',
      icon: User,
      active: pathname.startsWith('/login') || pathname.startsWith('/area-cliente/dashboard'),
    },
  ];

  return (
    <nav className="app-tabbar" aria-label="Navigazione app">
      {tabs.map(({ href, label, icon: Icon, active, main }) => (
        <Link
          key={label}
          href={href}
          className={`app-tab${active ? ' is-active' : ''}${main ? ' app-tab--main' : ''}`}
          aria-current={active ? 'page' : undefined}
          onClick={() => {
            try {
              navigator.vibrate?.(8);
            } catch {
              /* vibrazione non disponibile */
            }
          }}
        >
          <span className="app-tab-icon">
            <Icon size={main ? 22 : 20} strokeWidth={active || main ? 2.2 : 1.8} aria-hidden />
          </span>
          <span className="app-tab-label">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
