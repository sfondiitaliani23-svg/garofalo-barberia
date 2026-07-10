'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/site-config';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/chi-siamo', label: 'Chi siamo' },
  { href: '/servizi', label: 'Servizi' },
  { href: '/galleria', label: 'Galleria' },
  { href: '/contatti', label: 'Contatti' },
];

interface SiteHeaderProps {
  isLoggedIn?: boolean;
  userLabel?: string | null;
}

export function SiteHeader({ isLoggedIn = false, userLabel }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const accountLabel = userLabel ? `Ciao, ${userLabel}` : 'Area cliente';

  return (
    <header className="sticky top-0 z-[100] border-b border-white/10 bg-black/95 backdrop-blur">
      <div className="container-lux flex h-16 items-center justify-between gap-4">
        <Link href="/" className="relative z-[101] flex shrink-0 items-center">
          <Image
            src="/assets/sostituisci-immagini/icone/barberia_garofalo.png"
            alt={SITE_CONFIG.name}
            width={180}
            height={58}
            className="site-logo h-[58px] w-auto max-w-[180px] object-contain"
            priority
          />
        </Link>

        <nav className="relative z-[101] hidden items-center gap-6 lg:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-white/70 transition hover:text-gold-light">
              {link.label}
            </Link>
          ))}
          {isLoggedIn ? (
            <Link
              href="/area-cliente/dashboard"
              prefetch
              className="text-sm text-gold transition hover:text-gold-light"
            >
              {accountLabel}
            </Link>
          ) : (
            <Link href="/login" prefetch className="text-sm text-white/70 transition hover:text-gold-light">
              Accedi
            </Link>
          )}
          <Link href="/prenota" className="btn-primary text-xs">Prenota</Link>
        </nav>

        <button
          type="button"
          className="relative z-[101] lg:hidden text-white"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-black px-5 py-4 lg:hidden">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="block py-2 text-white/80" onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          {isLoggedIn ? (
            <Link
              href="/area-cliente/dashboard"
              className="block py-2 text-gold"
              onClick={() => setOpen(false)}
            >
              {accountLabel}
            </Link>
          ) : (
            <Link href="/login" className="block py-2 text-white/80" onClick={() => setOpen(false)}>
              Accedi
            </Link>
          )}
          <Link href="/prenota" className="btn-primary mt-3 w-full text-center" onClick={() => setOpen(false)}>Prenota</Link>
        </div>
      )}
    </header>
  );
}