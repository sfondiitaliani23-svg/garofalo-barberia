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

interface CustomerSidebarProps {
  profile?: any;
}

export function CustomerSidebar({ profile }: CustomerSidebarProps) {
  const pathname = usePathname();

  const getInitials = () => {
    if (!profile?.full_name) return '?';
    const parts = profile.full_name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <>
      {/* ── Sidebar Desktop (lg+) ── */}
      <aside className="hidden lg:flex w-56 flex-col border-r border-white/10 bg-[#0a0a0a] p-4 fixed left-0 top-0 bottom-0 h-screen z-30">
        <Link href="/area-cliente/dashboard" className="font-display text-sm uppercase tracking-wider text-gold hover:opacity-90 transition-opacity">
          Il mio account
        </Link>

        {/* Widget Profilo Utente */}
        <div className="mb-6 flex flex-col items-center text-center border-b border-white/10 pb-6 mt-6">
          <div className="w-16 h-16 rounded-full border border-gold/30 overflow-hidden mb-3 bg-gradient-to-br from-[#1c140c] to-[#0c0a06] flex items-center justify-center text-gold font-display text-xl font-bold">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              getInitials()
            )}
          </div>
          <p className="text-[10px] font-bold text-gold/60 uppercase tracking-[0.2em] leading-none mb-1">Benvenuto</p>
          <p className="text-sm font-bold text-white max-w-[180px] truncate" title={profile?.full_name ?? ''}>
            {profile?.full_name ? profile.full_name : 'Cliente'}
          </p>
        </div>

        <nav className="flex-1 space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const isProfileLink = label === 'Profilo';
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
                  pathname === href ? 'bg-gold/15 text-gold' : 'text-white/60 hover:bg-white/5 hover:text-white'
                )}
              >
                {isProfileLink ? (
                  <div className="w-4 h-4 rounded-full border border-gold/30 overflow-hidden bg-gradient-to-br from-[#1c140c] to-[#0c0a06] flex items-center justify-center text-[8px] font-bold text-gold shrink-0">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      getInitials()
                    )}
                  </div>
                ) : (
                  <Icon size={16} />
                )}
                {label}
              </Link>
            );
          })}
        </nav>
        <Link href="/prenota" className="mb-2 rounded-lg bg-gold px-3 py-2 text-center text-sm font-semibold text-black hover:bg-gold-light transition-colors">
          Prenota ora
        </Link>
        <form action={signOut}>
          <button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/50 hover:bg-white/5 transition-colors cursor-pointer">
            Esci
          </button>
        </form>
      </aside>

      {/* ── Bottom Navigation Bar Mobile (< lg) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-[200] lg:hidden bg-[#0a0a0a] border-t border-white/10 flex items-stretch justify-around safe-b h-16">
        {links.slice(0, 5).map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          const isProfileLink = label === 'Profilo';
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors',
                isActive ? 'text-gold' : 'text-white/40 hover:text-white/70'
              )}
            >
              {isProfileLink ? (
                <div className={cn(
                  'w-5 h-5 rounded-full border overflow-hidden bg-gradient-to-br from-[#1c140c] to-[#0c0a06] flex items-center justify-center text-[9px] font-bold text-gold shrink-0 transition-all',
                  isActive ? 'border-gold scale-105' : 'border-white/30'
                )}>
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getInitials()
                  )}
                </div>
              ) : (
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
              )}
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