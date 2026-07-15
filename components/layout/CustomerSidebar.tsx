'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { signOut } from '@/lib/actions/auth';
import { LayoutDashboard, Calendar, History, Image, User, HelpCircle, LogOut } from 'lucide-react';

const links = [
  { href: '/area-cliente/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/area-cliente/appuntamenti', label: 'Appuntamenti', icon: Calendar },
  { href: '/area-cliente/storico', label: 'Storico', icon: History },
  { href: '/area-cliente/galleria', label: 'Galleria', icon: Image },
  { href: '/area-cliente/profilo', label: 'Profilo', icon: User },
  { href: '/area-cliente/assistenza', label: 'Assistenza', icon: HelpCircle },
];

export function CustomerSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* ── Sidebar Desktop (lg+) ── */}
      <aside className="hidden lg:flex w-56 flex-col border-r border-white/10 bg-[#0a0a0a] p-4 fixed left-0 top-0 bottom-0 h-screen z-30">
        <Link href="/area-cliente/dashboard" className="mb-8 font-display text-sm uppercase tracking-wider text-gold">
          Il mio account
        </Link>
        <nav className="flex-1 space-y-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
                pathname === href ? 'bg-gold/15 text-gold' : 'text-white/60 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/prenota" className="mb-2 rounded-lg bg-gold px-3 py-2 text-center text-sm font-semibold text-black">
          Prenota ora
        </Link>
        <form action={signOut}>
          <button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/50 hover:bg-white/5">
            Esci
          </button>
        </form>
      </aside>

      {/* ── Bottom Navigation Bar Mobile (< lg) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-[200] lg:hidden bg-[#0a0a0a] border-t border-white/10 flex items-stretch justify-around safe-b">
        {links.slice(0, 5).map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors',
                isActive ? 'text-gold' : 'text-white/40 hover:text-white/70'
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
              <span className="leading-none mt-0.5">{label === 'Appuntamenti' ? 'Prenota' : label}</span>
            </Link>
          );
        })}
        {/* Voce Assistenza — l'ultimo elemento del menù */}
        <Link
          href="/area-cliente/assistenza"
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors',
            pathname === '/area-cliente/assistenza' ? 'text-gold' : 'text-white/40 hover:text-white/70'
          )}
        >
          <HelpCircle size={20} strokeWidth={pathname === '/area-cliente/assistenza' ? 2.5 : 1.75} />
          <span className="leading-none mt-0.5">Aiuto</span>
        </Link>
      </nav>

      {/* Spacer per compensare la bottom nav su mobile */}
      <div className="h-16 lg:hidden fixed bottom-0 left-0 right-0 pointer-events-none" aria-hidden="true" />
    </>
  );
}