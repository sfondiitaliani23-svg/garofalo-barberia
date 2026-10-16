'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { signOut } from '@/lib/actions/auth';
import { useLang } from '@/components/i18n/LangProvider';
import { CookieLanguageSwitch } from '@/components/i18n/CookieLanguageSwitch';
import { L, localHref } from '@/lib/i18n';
import { LayoutDashboard, Calendar, History, Image, User, HelpCircle, LogOut, Home as HomeIcon } from 'lucide-react';

const links = [
  { href: '/area-cliente/dashboard', label: 'Dashboard', labelEn: 'Dashboard', icon: LayoutDashboard },
  { href: '/area-cliente/appuntamenti', label: 'Appuntamenti', labelEn: 'Appointments', icon: Calendar },
  { href: '/area-cliente/storico', label: 'Storico', labelEn: 'History', icon: History },
  { href: '/area-cliente/galleria', label: 'Galleria', labelEn: 'Gallery', icon: Image },
  { href: '/area-cliente/profilo', label: 'Profilo', labelEn: 'Profile', icon: User },
  { href: '/area-cliente/assistenza', label: 'Assistenza', labelEn: 'Support', icon: HelpCircle },
];

interface CustomerSidebarProps {
  profile?: any;
}

export function CustomerSidebar({ profile }: CustomerSidebarProps) {
  const pathname = usePathname();
  const lang = useLang();

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
      <aside className="hidden lg:flex w-56 flex-col border-r border-gold/35 bg-[#0c0a08] py-6 fixed left-0 top-0 bottom-0 h-screen z-30">
        <Link href="/area-cliente/dashboard" className="block px-5 pb-4 border-b border-gold/25 hover:opacity-90 transition-opacity">
          <span className="block font-display text-xl tracking-[0.15em] text-gold">GAROFALO</span>
          <span className="block text-[10px] uppercase tracking-[0.3em] text-[#bda980] mt-0.5">{L(lang, 'Area riservata', 'Private area')}</span>
        </Link>

        {/* Widget Profilo Utente */}
        <div className="mx-5 mb-4 flex flex-col items-center text-center border-b border-dashed border-gold/25 pb-5 mt-5">
          <div className="w-16 h-16 rounded-full border-[3px] border-double border-gold overflow-hidden mb-3 bg-gradient-to-br from-[#1c140c] to-[#0c0a06] flex items-center justify-center text-gold font-display text-xl font-bold">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              getInitials()
            )}
          </div>
          <p className="text-[10px] font-bold text-gold/60 uppercase tracking-[0.2em] leading-none mb-1">{L(lang, 'Benvenuto', 'Welcome')}</p>
          <p className="text-sm font-bold text-white max-w-[180px] truncate" title={profile?.full_name ?? ''}>
            {profile?.full_name ? profile.full_name : L(lang, 'Cliente', 'Customer')}
          </p>
        </div>

        <nav className="flex-1 space-y-0.5 px-3">
          {links.map(({ href, label, labelEn, icon: Icon }) => {
            const isProfileLink = label === 'Profilo';
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 text-xs uppercase tracking-[0.12em] transition',
                  pathname === href ? 'bg-gold font-bold text-[#0a0807]' : 'font-medium text-[#bda980] hover:bg-gold/10 hover:text-gold'
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
                  <Icon size={17} />
                )}
                {L(lang, label, labelEn)}
              </Link>
            );
          })}
        </nav>
        <Link href={localHref(lang, '/prenota')} className="mx-4 mb-2 border border-gold px-3 py-2.5 text-center text-xs font-bold uppercase tracking-[0.2em] text-gold hover:bg-gold hover:text-[#0a0807] transition-colors">
          {L(lang, 'Prenota ora', 'Book now')}
        </Link>
        <div className="mb-2 px-3 py-2">
          <CookieLanguageSwitch />
        </div>
        <form action={signOut}>
          <button type="submit" className="w-full px-5 py-2 text-left text-xs uppercase tracking-[0.2em] text-[#bda980] hover:text-gold transition-colors cursor-pointer">
            {L(lang, 'Esci', 'Log out')}
          </button>
        </form>
      </aside>

      {/* ── Bottom Navigation Bar Mobile (< lg) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-[200] lg:hidden bg-[#0c0a08] border-t border-gold/35 flex items-stretch justify-around safe-b h-16">
        {/* Solo nell'app installata: torna al sito (non c'è la barra del browser) */}
        <Link
          href={localHref(lang, '/')}
          className="app-only flex-col items-center justify-center gap-0.5 flex-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/60"
        >
          <HomeIcon size={20} strokeWidth={1.75} aria-hidden />
          <span className="leading-none mt-0.5">Home</span>
        </Link>
        {links.slice(0, 5).map(({ href, label, labelEn, icon: Icon }) => {
          const isActive = pathname === href;
          const isProfileLink = label === 'Profilo';
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors',
                isActive ? 'text-gold' : 'text-white/60 hover:text-white/70'
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
              <span className="leading-none mt-0.5">{label === 'Appuntamenti' ? L(lang, 'Prenota', 'Book') : L(lang, label, labelEn)}</span>
            </Link>
          );
        })}
        {/* Voce Assistenza — l'ultimo elemento del menù */}
        <Link
          href="/area-cliente/assistenza"
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors',
            pathname === '/area-cliente/assistenza' ? 'text-gold' : 'text-white/60 hover:text-white/70'
          )}
        >
          <HelpCircle size={20} strokeWidth={pathname === '/area-cliente/assistenza' ? 2.5 : 1.75} />
          <span className="leading-none mt-0.5">{L(lang, 'Aiuto', 'Help')}</span>
        </Link>
      </nav>

      {/* Spacer per compensare la bottom nav su mobile */}
      <div className="h-16 lg:hidden fixed bottom-0 left-0 right-0 pointer-events-none" aria-hidden="true" />
    </>
  );
}