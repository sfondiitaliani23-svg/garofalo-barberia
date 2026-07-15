'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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

  // Blocca lo scroll del body quando il drawer è aperto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <header className="sticky top-0 z-[100] border-b border-white/10 bg-black/95 backdrop-blur">
        <div className="container-lux flex h-16 items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="relative z-[151] flex shrink-0 items-center" onClick={close}>
            {/* Desktop */}
            <Image
              src="/assets/sostituisci-immagini/icone/barberia_garofalo.png"
              alt={SITE_CONFIG.name}
              width={180}
              height={58}
              className="hidden lg:block h-[58px] w-auto max-w-[180px] object-contain"
              style={{ mixBlendMode: 'screen' }}
              priority
            />
            {/* Mobile */}
            <Image
              src="/assets/sostituisci-immagini/icone/barberia_garofalo.png"
              alt={SITE_CONFIG.name}
              width={46}
              height={46}
              className="block lg:hidden h-[46px] w-auto max-w-[46px] object-contain"
              style={{ mixBlendMode: 'screen' }}
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
              <Link href="/area-cliente/dashboard" prefetch className="text-sm text-gold transition hover:text-gold-light">
                {accountLabel}
              </Link>
            ) : (
              <Link href="/login" prefetch className="text-sm text-white/70 transition hover:text-gold-light">
                Accedi
              </Link>
            )}
            <Link href="/prenota" className="btn-primary text-xs">Prenota</Link>
          </nav>

          {/* Bottone hamburger Mobile */}
          <button
            type="button"
            className="relative z-[151] lg:hidden flex flex-col items-center justify-center border border-white/20 hover:border-gold rounded-lg w-12 h-14 bg-black/50 text-white p-1 transition-all duration-200"
            onClick={() => setOpen(o => !o)}
            aria-label={open ? 'Chiudi menu' : 'Apri menu'}
            aria-expanded={open}
          >
            {open ? (
              <X size={20} className="text-gold" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full w-full">
                <span className="text-[8px] font-bold tracking-widest text-white/50 leading-none">ME</span>
                <div className="flex flex-col gap-[3px] my-1">
                  <span className="w-5 h-[1.5px] bg-white rounded-full" />
                  <span className="w-5 h-[1.5px] bg-white rounded-full" />
                  <span className="w-5 h-[1.5px] bg-white rounded-full" />
                </div>
                <span className="text-[8px] font-bold tracking-widest text-white/50 leading-none">NU</span>
              </div>
            )}
          </button>
        </div>
      </header>

      {/* ── DRAWER: scorre da destra verso sinistra ───────────────────────── */}

      {/* Backdrop semi-trasparente — chiude al click */}
      <div
        className={`fixed inset-0 z-[149] bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Pannello drawer */}
      <div
        className={`fixed top-0 right-0 h-full z-[150] w-[75vw] max-w-[300px] bg-[#0a0a0a] border-l border-white/10 flex flex-col lg:hidden shadow-[−8px_0_40px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Menu di navigazione"
      >
        {/* Header drawer con logo e chiusura */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <Image
            src="/assets/sostituisci-immagini/icone/barberia_garofalo.png"
            alt=""
            width={80}
            height={80}
            className="object-contain"
            style={{ mixBlendMode: 'screen' }}
          />
          <button
            onClick={close}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 hover:border-gold/40 text-white/40 hover:text-gold transition-all"
            aria-label="Chiudi menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Voci di menu */}
        <nav className="flex flex-col flex-1 overflow-y-auto py-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-6 py-4 text-sm font-semibold uppercase tracking-widest text-white/70 border-b border-white/5 hover:text-gold hover:bg-white/[0.03] transition-all"
              onClick={close}
            >
              {link.label}
            </Link>
          ))}

          {/* Area cliente */}
          {isLoggedIn ? (
            <Link
              href="/area-cliente/dashboard"
              className="flex items-center gap-3 px-6 py-4 text-sm font-semibold uppercase tracking-widest text-gold border-b border-white/5 hover:text-gold-light hover:bg-white/[0.03] transition-all"
              onClick={close}
            >
              {accountLabel}
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-3 px-6 py-4 text-sm font-semibold uppercase tracking-widest text-white/70 border-b border-white/5 hover:text-gold hover:bg-white/[0.03] transition-all"
              onClick={close}
            >
              Accedi
            </Link>
          )}
        </nav>

        {/* CTA Prenota in fondo */}
        <div className="px-5 py-6 border-t border-white/8">
          <Link
            href="/prenota"
            className="btn-primary w-full text-center uppercase tracking-widest text-xs py-4 font-bold block"
            onClick={close}
          >
            Prenota ora
          </Link>
          <p className="text-[10px] text-white/25 tracking-widest uppercase text-center mt-4">
            Viale Ignazio D&apos;Addedda, 236 – Foggia
          </p>
        </div>
      </div>
    </>
  );
}