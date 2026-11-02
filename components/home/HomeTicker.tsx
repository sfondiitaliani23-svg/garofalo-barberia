'use client';

import { useEffect, useState } from 'react';
import { LocLink as Link } from '@/components/i18n/LocLink';
import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';

export function HomeTicker() {
  const lang = useLang();
  // Chi ha già fatto l'accesso non vede «Accedi»: vede la sua area.
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    try {
      setLoggedIn(/sb-[^=]+-auth-token/.test(document.cookie));
    } catch {
      setLoggedIn(false);
    }
  }, []);
  const items = [
    { label: 'Barberia Garofalo', href: '/' },
    { label: L(lang, 'Chi Siamo', 'About Us'), href: '/chi-siamo' },
    { label: 'Gallery', href: '/galleria' },
    { label: L(lang, 'Contatti', 'Contact'), href: '/contatti' },
    { label: L(lang, 'Dove siamo', 'Find Us'), href: '/contatti' },
    loggedIn
      ? { label: L(lang, 'La tua area', 'Your area'), href: '/area-cliente/dashboard' }
      : { label: L(lang, 'Accedi', 'Sign In'), href: '/login' },
  ];

  // Duplichiamo la lista 4 volte per evitare spazi vuoti su schermi molto grandi (2K/4K)
  const duplicatedItems = [...items, ...items, ...items, ...items];

  return (
    <div className="home-ticker-wrapper">
      <div className="home-ticker-track">
        {duplicatedItems.map((item, index) => (
          <div key={index} className="home-ticker-item">
            <Link href={item.href} className="home-ticker-link">
              {item.label}
            </Link>
            <span className="home-ticker-sep">✦</span>
          </div>
        ))}
      </div>
    </div>
  );
}
