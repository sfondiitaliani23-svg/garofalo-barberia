'use client';

import { LocLink as Link } from '@/components/i18n/LocLink';
import { LanguageSwitch } from '@/components/i18n/LanguageSwitch';
import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { CalendarDays, X } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/site-config';

import { createClient } from '@/lib/supabase/client';
import { InstallAppButton } from '@/components/layout/InstallAppPrompt';

function navLinks(lang: 'it' | 'en') {
  const home = { href: '/', label: 'Home' };
  const about = { href: '/chi-siamo', label: L(lang, 'Chi siamo', 'About us') };
  const services = { href: '/servizi', label: L(lang, 'Servizi', 'Services') };
  const gallery = { href: '/galleria', label: L(lang, 'Galleria', 'Gallery') };
  const reviews = { href: '/recensioni', label: L(lang, 'Recensioni', 'Reviews') };
  const contacts = { href: '/contatti', label: L(lang, 'Contatti', 'Contact') };
  const wrapped = { href: '/wrapped', label: 'Wrapped' };
  return {
    navLeft: [home, about, services, gallery],
    navRight: [reviews, contacts, wrapped],
    allNavLinks: [home, about, services, gallery, reviews, contacts, wrapped],
  };
}

interface SiteHeaderProps {
  isLoggedIn?: boolean;
  userLabel?: string | null;
}

export function SiteHeader({ isLoggedIn: initialLoggedIn = false, userLabel: initialUserLabel }: SiteHeaderProps) {
  const lang = useLang();
  const { navLeft, navRight, allNavLinks } = navLinks(lang);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(initialLoggedIn);
  const [userLabel, setUserLabel] = useState<string | null>(initialUserLabel ?? null);

  useEffect(() => {
    if (initialLoggedIn) return;
    const supabase = createClient();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsLoggedIn(true);
        const name = session.user.user_metadata?.full_name?.split(' ')[0];
        if (name) setUserLabel(name);
      }
    });
  }, [initialLoggedIn]);

  const accountLabel = userLabel ? L(lang, `Ciao, ${userLabel}`, `Hi, ${userLabel}`) : L(lang, 'Area cliente', 'My account');

  // Sticky scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Blocca lo scroll del body quando il drawer è aperto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    document.body.classList.toggle('menu-open', open);
    return () => { document.body.style.overflow = ''; document.body.classList.remove('menu-open'); };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <header
        className={`sticky top-0 z-[100] transition-all duration-300 ${
          scrolled
            ? 'bg-black/98 backdrop-blur-md border-b border-white/10 shadow-[0_4px_32px_rgba(0,0,0,0.6)]'
            : 'bg-black/80 backdrop-blur-sm border-b border-white/5'
        }`}
      >
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-5 lg:grid lg:max-w-none lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:px-6 xl:px-10">

          {/* ── Navigazione sinistra (Desktop - 4 elementi) ───────────────── */}
          <nav
            aria-label={L(lang, 'Navigazione principale sinistra', 'Main navigation, left')}
            className="hidden lg:flex items-center justify-end gap-3 xl:gap-7 pr-4 xl:pr-8"
          >
            {navLeft.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 transition-colors hover:text-gold-light whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* ── Logo Centrato (Desktop) / Sinistra (Mobile) ───────────────── */}
          <div className="flex items-center justify-start lg:justify-center px-2">
            <Link
              href="/"
              className="relative z-[151] flex shrink-0 items-center"
              onClick={close}
              aria-label={SITE_CONFIG.name}
            >
              {/* Desktop */}
              <Image
                src="/assets/sostituisci-immagini/icone/barberia_garofalo.png"
                alt={SITE_CONFIG.name}
                width={180}
                height={58}
                className="hidden lg:block h-[50px] w-auto max-w-[165px] object-contain"
                style={{ mixBlendMode: 'screen' }}
                priority
              />
              {/* Mobile */}
              <Image
                src="/assets/sostituisci-immagini/icone/barberia_garofalo.png"
                alt={SITE_CONFIG.name}
                width={46}
                height={46}
                className="block lg:hidden h-[44px] w-auto max-w-[44px] object-contain"
                style={{ mixBlendMode: 'screen' }}
                priority
              />
            </Link>
          </div>

          {/* ── Navigazione destra (Desktop - 4 elementi) ─────────────────── */}
          <nav
            aria-label={L(lang, 'Navigazione principale destra', 'Main navigation, right')}
            className="hidden lg:flex items-center justify-between gap-3 xl:gap-7 pl-4 xl:pl-8"
          >
            <span className="flex items-center gap-3 xl:gap-7">
            {navRight.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 transition-colors hover:text-gold-light whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
            </span>
            {/* Accesso, lingua e Prenota: in fondo a destra, staccati dal menu da un filo */}
            <span className="flex items-center gap-3 xl:gap-5 border-l border-white/15 pl-4 xl:pl-6">
            {isLoggedIn ? (
              <Link
                href="/area-cliente/dashboard"
                prefetch
                className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold transition-colors hover:text-gold-light whitespace-nowrap"
              >
                {accountLabel}
              </Link>
            ) : (
              <Link
                href="/login"
                prefetch
                className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 transition-colors hover:text-gold-light whitespace-nowrap"
              >
                {L(lang, 'Accedi', 'Sign in')}
              </Link>
            )}
            <LanguageSwitch className="ml-1" />
            <Link href="/prenota" className="btn-book-outline shrink-0 ml-1">
              <CalendarDays size={15} strokeWidth={1.75} aria-hidden />
              {L(lang, 'Prenota', 'Book')}
            </Link>
            </span>
          </nav>

          {/* ── Bottone hamburger Mobile ─────────────────────────────────────── */}
          <button
            type="button"
            className="relative z-[151] lg:hidden flex flex-col items-center justify-center border border-white/20 hover:border-gold rounded-lg w-12 h-14 bg-black/50 text-white p-1 transition-all duration-200"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? L(lang, 'Chiudi menu', 'Close menu') : L(lang, 'Apri menu', 'Open menu')}
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

      {/* ── DRAWER mobile ──────────────────────────────────────────────────── */}

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[149] bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Pannello drawer */}
      <nav
        className={`fixed top-0 right-0 h-full z-[150] w-[75vw] max-w-[300px] bg-[#0a0a0a] border-l border-white/10 flex flex-col lg:hidden shadow-[-8px_0_40px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label={L(lang, 'Menu di navigazione', 'Navigation menu')}
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
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 hover:border-gold/40 text-white/60 hover:text-gold transition-all"
            aria-label={L(lang, 'Chiudi menu', 'Close menu')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Voci di menu */}
        <nav className="flex flex-col flex-1 overflow-y-auto py-4">
          {allNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-6 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white/70 border-b border-white/5 hover:text-gold hover:bg-white/[0.03] transition-all"
              onClick={close}
            >
              {link.label}
            </Link>
          ))}

          {/* Installa l'app (nascosta se il sito è già aperto come app) */}
          <InstallAppButton
            always
            onAction={close}
            label={L(lang, 'Installa App', 'Install app')}
            className="flex w-full items-center gap-3 px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-white/70 border-b border-white/5 hover:text-gold hover:bg-white/[0.03] transition-all"
          />

          {/* Area cliente */}
          {isLoggedIn ? (
            <Link
              href="/area-cliente/dashboard"
              className="flex items-center gap-3 px-6 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-gold border-b border-white/5 hover:text-gold-light hover:bg-white/[0.03] transition-all"
              onClick={close}
            >
              {accountLabel}
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-3 px-6 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white/70 border-b border-white/5 hover:text-gold hover:bg-white/[0.03] transition-all"
              onClick={close}
            >
              {L(lang, 'Accedi', 'Sign in')}
            </Link>
          )}
          <div className="px-6 py-4 border-b border-white/5">
            <LanguageSwitch onNavigate={close} />
          </div>
        </nav>

        {/* CTA Prenota in fondo */}
        <div className="px-5 py-6 border-t border-white/8">
          <Link
            href="/prenota"
            className="btn-primary w-full text-center uppercase tracking-[0.15em] text-[10px] py-4 font-bold block"
            onClick={close}
          >
            {L(lang, 'Prenota ora', 'Book now')}
          </Link>
          <p className="text-[10px] text-white/60 tracking-widest uppercase text-center mt-4">
            Viale Ignazio D&apos;Addedda, 236 – Foggia
          </p>
        </div>
      </nav>
    </>
  );
}