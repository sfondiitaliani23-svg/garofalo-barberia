'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { signOut } from '@/lib/actions/auth';
import { LayoutDashboard, Calendar, History, Image, User } from 'lucide-react';

const links = [
  { href: '/area-cliente/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/area-cliente/appuntamenti', label: 'Appuntamenti', icon: Calendar },
  { href: '/area-cliente/storico', label: 'Storico', icon: History },
  { href: '/area-cliente/galleria', label: 'Galleria', icon: Image },
  { href: '/area-cliente/profilo', label: 'Profilo', icon: User },
];

export function CustomerSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 flex-col border-r border-white/10 bg-[#0a0a0a] p-4 min-h-screen">
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
  );
}