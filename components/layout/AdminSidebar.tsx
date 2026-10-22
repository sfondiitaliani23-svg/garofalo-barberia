'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { signOut } from '@/lib/actions/auth';
import { LogoutSubmit } from '@/components/layout/LogoutSubmit';
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Users,
  Scissors,
  UserCog,
  Tag,
  TrendingUp,
  Package,
  Menu,
  X,
  LogOut,
  MessageSquareWarning,
  Inbox,
  BookOpen,
  BellRing,
  Lightbulb,
} from 'lucide-react';

const links = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/prenotazioni', label: 'Prenotazioni', icon: Calendar, exact: true },
  { href: '/admin/prenotazioni/storico', label: 'Storico Prenotazioni', icon: ClipboardList },
  { href: '/admin/clienti', label: 'Clienti', icon: Users },
  { href: '/admin/servizi', label: 'Servizi', icon: Scissors },
  { href: '/admin/promozioni', label: 'Promozioni', icon: Tag },
  { href: '/admin/inventario', label: 'Inventario', icon: Package },
  { href: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/admin/staff', label: 'Gestione team', icon: UserCog },
  { href: '/admin/messaggi', label: 'Messaggi e QR', icon: Inbox },
  { href: '/admin/journal', label: 'Journal', icon: BookOpen },
  { href: '/admin/segnalazioni', label: 'Segnalaci il problema', icon: MessageSquareWarning },
  { href: '/admin/proposte', label: 'Proposte', icon: Lightbulb },
];

export function AdminSidebar({ areaLabel = 'Admin' }: { areaLabel?: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Blocca/sblocca lo scroll del body quando il menu è aperto.
  // Questo impedisce al browser di mostrare la scrollbar nativa del body
  // attraverso l'overlay, eliminando la barra grigia laterale.
  useEffect(() => {
    if (menuOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [menuOpen]);

  const toggleMenu = () => setMenuOpen(prev => !prev);
  const closeMenu = () => setMenuOpen(false);

  // 4 link principali visibili nella barra inferiore mobile
  const mobileNavItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/prenotazioni', label: 'Prenota', icon: Calendar },
    { href: '/admin/clienti', label: 'Clienti', icon: Users },
    { href: '/admin/staff', label: 'Staff', icon: UserCog },
  ];

  return (
    <>
      {/* ── 1. SIDEBAR DESKTOP (lg+) ── */}
      <aside className="adm-side hidden lg:flex fixed left-0 top-0 bottom-0 z-30 h-screen w-[198px] flex-col overflow-y-auto overflow-x-hidden p-3">
        <Link href="/admin/dashboard" className="adm-brand" aria-label="Barberia Garofalo · Admin">
          <Image
            src="/assets/sostituisci-immagini/icone/barberia_garofalo.png"
            alt="Barberia Garofalo"
            width={150}
            height={100}
            className="h-[44px] w-auto object-contain"
            style={{ mixBlendMode: 'screen' }}
            priority
          />
          <span className="adm-badge">
            <span className="adm-badge-dot" aria-hidden />
            <span className="adm-badge-text">
              <small>Area riservata</small>
              <strong>{areaLabel}</strong>
            </span>
          </span>
        </Link>
        <nav className="flex-1 space-y-0.5" aria-label="Menu amministrazione">
          {links.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                prefetch={true}
                aria-current={isActive ? 'page' : undefined}
                className={cn('adm-link', isActive && 'is-active')}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="adm-promo">
          <span className="adm-promo-icon" aria-hidden>
            <BellRing size={18} />
          </span>
          <p className="adm-promo-title">Avvisa i clienti</p>
                    <Link href="/admin/messaggi?tab=notifiche" className="adm-promo-btn">
            Scrivi ora
          </Link>
        </div>
        <form action={signOut}>
          <LogoutSubmit pendingLabel="Uscita in corso…" className="adm-link mt-3 w-full">
            <LogOut size={17} />
            Esci
          </LogoutSubmit>
        </form>
      </aside>

      {/* ── 2. BARRA DI NAVIGAZIONE INFERIORE MOBILE (< lg) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-[190] lg:hidden bg-[#0c0a08] border-t border-gold/35 flex items-stretch justify-around safe-b h-16">
        {mobileNavItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              onClick={closeMenu}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors',
                isActive ? 'text-gold' : 'text-white/60 hover:text-white/70'
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
              <span className="leading-none mt-0.5">{label}</span>
            </Link>
          );
        })}
        {/* Pulsante Menu per mostrare le altre voci */}
        <button
          type="button"
          onClick={toggleMenu}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors',
            menuOpen ? 'text-gold' : 'text-white/60 hover:text-white/70'
          )}
        >
          {menuOpen ? <X size={20} strokeWidth={2.5} /> : <Menu size={20} strokeWidth={1.75} />}
          <span className="leading-none mt-0.5">Menu</span>
        </button>
      </nav>

      {/* ── 3. OVERLAY MENU COMPLETO MOBILE (< lg) ── */}
      {menuOpen && (
        // L'overlay occupa tutto lo schermo senza scroll proprio.
        // Il body è bloccato (useEffect sopra), quindi nessuna scrollbar appare.
        // Il contenuto interno scorre separatamente tramite inner-scroll con scrollbar nascosta.
        <div
          className="fixed inset-0 z-[210] bg-black/95 backdrop-blur-md flex flex-col lg:hidden"
          style={{ overflow: 'hidden' }}
        >
          {/* Header Overlay */}
          <div className="flex-shrink-0 flex items-center justify-between border-b border-white/10 px-6 py-4">
            <span className="font-display text-sm uppercase tracking-wider text-gold">
              Menu Amministratore
            </span>
            <button
              type="button"
              onClick={closeMenu}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white transition hover:bg-white/10"
              aria-label="Chiudi menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Area scorrevole interna — scrollbar nascosta via CSS inline garantito */}
          <div
            className="flex-1 flex flex-col px-6 py-4"
            style={{
              overflowY: 'auto',
              overflowX: 'hidden',
              scrollbarWidth: 'none',       /* Firefox */
              msOverflowStyle: 'none',      /* IE/Edge */
            } as React.CSSProperties}
          >
            {/* Lista di tutti i link */}
            <nav className="space-y-2">
              {links.map(({ href, label, icon: Icon, exact }) => {
                const isActive = exact
                  ? pathname === href
                  : pathname === href || pathname.startsWith(`${href}/`);

                return (
                  <Link
                    key={href}
                    href={href}
                    prefetch={true}
                    onClick={closeMenu}
                    className={cn(
                      'flex items-center gap-3.5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] transition',
                      isActive ? 'bg-gold text-[#0a0807]' : 'text-[#bda980] hover:bg-gold/10 hover:text-gold'
                    )}
                  >
                    <Icon size={20} className={isActive ? 'text-[#0a0807]' : 'text-gold/70'} />
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* Footer Overlay - Pulsante Esci */}
            <div className="mt-8 border-t border-white/10 pt-4">
              {/* Il menu resta aperto finché l'uscita non finisce: così si vede "Uscita in corso…" e un solo tocco basta. */}
              <form action={signOut}>
                <LogoutSubmit
                  pendingLabel="Uscita in corso…"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600/10 border border-red-500/20 px-4 py-3.5 text-base font-bold text-red-500 hover:bg-red-600/20 transition"
                >
                  <LogOut size={20} />
                  Disconnetti Account
                </LogoutSubmit>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Stile per nascondere webkit scrollbar nell'inner scroll (Chrome/Safari) */}
      <style>{`
        .admin-menu-inner::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );
}