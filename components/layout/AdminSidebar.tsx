'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { signOut } from '@/lib/actions/auth';
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Users,
  Scissors,
  UserCog,
  BarChart3,
  Tag,
  TrendingUp,
  Package,
  Menu,
  X,
  LogOut
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
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen(!menuOpen);
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
      <aside className="hidden lg:flex w-56 flex-col border-r border-white/10 bg-[#0a0a0a] p-4 fixed left-0 top-0 bottom-0 h-screen z-30 overflow-y-auto">
        <Link href="/admin/dashboard" className="mb-8 font-display text-sm uppercase tracking-wider text-gold">
          Admin Garofalo
        </Link>
        <nav className="flex-1 space-y-1">
          {links.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
                  isActive ? 'bg-gold/15 text-gold' : 'text-white/60 hover:bg-white/5 hover:text-white'
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>
        <form action={signOut}>
          <button type="submit" className="mt-4 w-full rounded-lg px-3 py-2 text-left text-sm text-white/50 hover:bg-white/5 flex items-center gap-2">
            <LogOut size={16} />
            Esci
          </button>
        </form>
      </aside>

      {/* ── 2. BARRA DI NAVIGAZIONE INFERIORE MOBILE (< lg) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-[190] lg:hidden bg-[#0a0a0a] border-t border-white/10 flex items-stretch justify-around safe-b h-16">
        {mobileNavItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={closeMenu}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors',
                isActive ? 'text-gold' : 'text-white/40 hover:text-white/70'
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
            menuOpen ? 'text-gold' : 'text-white/40 hover:text-white/70'
          )}
        >
          {menuOpen ? <X size={20} strokeWidth={2.5} /> : <Menu size={20} strokeWidth={1.75} />}
          <span className="leading-none mt-0.5">Menu</span>
        </button>
      </nav>

      {/* ── 3. OVERLAY MENU COMPLETO MOBILE (< lg) ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-[210] bg-black/95 backdrop-blur-md p-6 overflow-y-auto flex flex-col lg:hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Header Overlay */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
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

          {/* Lista di tutti i link */}
          <nav className="flex-1 space-y-2">
            {links.map(({ href, label, icon: Icon, exact }) => {
              const isActive = exact
                ? pathname === href
                : pathname === href || pathname.startsWith(`${href}/`);

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMenu}
                  className={cn(
                    'flex items-center gap-3.5 rounded-xl px-4 py-3 text-base font-semibold transition',
                    isActive ? 'bg-gold/15 text-gold' : 'text-white/70 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <Icon size={20} className={isActive ? 'text-gold' : 'text-white/40'} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Footer Overlay - Pulsante Esci */}
          <div className="mt-8 border-t border-white/10 pt-4">
            <form action={signOut} onSubmit={closeMenu}>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600/10 border border-red-500/20 px-4 py-3.5 text-base font-bold text-red-500 hover:bg-red-600/20 transition"
              >
                <LogOut size={20} />
                Disconnetti Account
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}