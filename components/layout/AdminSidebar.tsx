'use client';

import { memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { signOut } from '@/lib/actions/auth';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Scissors,
  UserCog,
  BarChart3,
  Tag,
  TrendingUp,
  Package,
} from 'lucide-react';

const links = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/prenotazioni', label: 'Prenotazioni', icon: Calendar },
  { href: '/admin/clienti', label: 'Clienti', icon: Users },
  { href: '/admin/servizi', label: 'Servizi', icon: Scissors },
  { href: '/admin/promozioni', label: 'Promozioni', icon: Tag },
  { href: '/admin/inventario', label: 'Inventario', icon: Package },
  { href: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/admin/staff', label: 'Gestione team', icon: UserCog },
  { href: '/admin/report', label: 'Report', icon: BarChart3 },
];

export const AdminSidebar = memo(function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-[#0a0a0a] p-4">
      <Link href="/admin/dashboard" className="mb-8 font-display text-sm uppercase tracking-wider text-gold">
        Admin Garofalo
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
      <form action={signOut}>
        <button type="submit" className="mt-4 w-full rounded-lg px-3 py-2 text-left text-sm text-white/50 hover:bg-white/5">
          Esci
        </button>
      </form>
    </aside>
  );
});