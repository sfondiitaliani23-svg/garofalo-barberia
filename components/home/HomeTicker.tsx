'use client';

import Link from 'next/link';

export function HomeTicker() {
  const items = [
    { label: 'Barberia Garofalo', href: '/' },
    { label: 'Chi Siamo', href: '/chi-siamo' },
    { label: 'Gallery', href: '/galleria' },
    { label: 'Contatti', href: '/contatti' },
    { label: 'Dove siamo', href: '/contatti' },
    { label: 'Accedi', href: '/login' },
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
