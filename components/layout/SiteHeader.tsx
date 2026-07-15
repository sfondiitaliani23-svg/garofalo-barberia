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
    <header className={`sticky top-0 z-[100] border-b border-white/10 bg-black/95 ${open ? '' : 'backdrop-blur'}`}>
      <div className="container-lux flex h-16 items-center justify-between gap-4">
        {/* Logo Link con versioni differenti per Mobile e Desktop */}
        <Link href="/" className="relative z-[151] flex shrink-0 items-center">
          {/* Logo esteso per Desktop */}
          <Image
            src="/assets/sostituisci-immagini/icone/barberia_garofalo.png"
            alt={SITE_CONFIG.name}
            width={180}
            height={58}
            className="hidden lg:block h-[58px] w-auto max-w-[180px] object-contain"
            priority
          />
          {/* Logo PNG senza sfondo per Mobile */}
          <Image
            src="/assets/sostituisci-immagini/icone/barberia_garofalo.png"
            alt={SITE_CONFIG.name}
            width={44}
            height={44}
            className="block lg:hidden h-[44px] w-auto max-w-[44px] object-contain drop-shadow-[0_0_8px_rgba(205,154,79,0.3)]"
            priority
          />
        </Link>

        {/* Navigazione Desktop */}
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

        {/* Bottone Menu Mobile Custom in stile Treatwell (ME/NU con bordo) */}
        <button
          type="button"
          className="relative z-[151] lg:hidden flex flex-col items-center justify-center border border-white/20 hover:border-gold rounded-lg w-12 h-14 bg-black/50 text-white p-1 transition-all duration-200"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? (
            <X size={20} className="text-white hover:text-gold transition-colors" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full w-full">
              <span className="text-[8px] font-bold tracking-widest text-white/50 leading-none">ME</span>
              <div className="flex flex-col gap-[3px] my-1">
                <span className="w-5 h-[1.5px] bg-white rounded-full transition-all"></span>
                <span className="w-5 h-[1.5px] bg-white rounded-full transition-all"></span>
                <span className="w-5 h-[1.5px] bg-white rounded-full transition-all"></span>
              </div>
              <span className="text-[8px] font-bold tracking-widest text-white/50 leading-none">NU</span>
            </div>
          )}
        </button>
      </div>

      {/* Menu Overlay Mobile a Schermo Intero in stile Treatwell */}
      {open && (
        <div className="fixed inset-0 z-[150] bg-black flex flex-col justify-start px-6 pt-24 pb-8 overflow-y-auto animate-in fade-in slide-in-from-top duration-300 lg:hidden">
          {/* Logo centratissimo decorativo in alto del menu */}
          <div className="flex justify-center mb-6">
            <Image
              src="/assets/sostituisci-immagini/icone/barberia_garofalo.png"
              alt=""
              width={120}
              height={120}
              className="object-contain drop-shadow-[0_0_12px_rgba(205,154,79,0.3)]"
            />
          </div>

          <nav className="flex flex-col space-y-0 w-full">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-4 text-center text-base font-semibold uppercase tracking-widest text-white border-b border-white/5 hover:text-gold transition-colors"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {isLoggedIn ? (
              <Link
                href="/area-cliente/dashboard"
                className="block py-4 text-center text-base font-semibold uppercase tracking-widest text-gold border-b border-white/5 hover:text-gold-light transition-colors"
                onClick={() => setOpen(false)}
              >
                {accountLabel}
              </Link>
            ) : (
              <Link
                href="/login"
                className="block py-4 text-center text-base font-semibold uppercase tracking-widest text-white border-b border-white/5 hover:text-gold transition-colors"
                onClick={() => setOpen(false)}
              >
                Accedi
              </Link>
            )}
          </nav>

          <div className="mt-10 flex flex-col gap-4 items-center">
            <Link
              href="/prenota"
              className="btn-primary w-full max-w-xs text-center uppercase tracking-widest text-xs py-4 font-bold"
              onClick={() => setOpen(false)}
            >
              Prenota ora
            </Link>
            <p className="text-[10px] text-white/30 tracking-widest uppercase mt-4">
              Viale Ignazio D&apos;Addedda, 236 - Foggia
            </p>
          </div>
        </div>
      )}
    </header>
  );
}