'use client';

import { LogOut } from 'lucide-react';
import { signOut } from '@/lib/actions/auth';

export function LogoutCard() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="w-full group rounded-xl border border-red-500/15 bg-[#111] hover:bg-red-500/5 hover:border-red-500/30 p-4 transition-all shadow-[0_8px_24px_rgba(0,0,0,0.2)] flex items-center gap-3"
      >
        <span className="text-2xl">🚪</span>
        <div className="text-left">
          <p className="font-bold text-white/70 group-hover:text-red-400 text-sm transition-colors">Esci dall&apos;account</p>
          <p className="text-[11px] text-white/30">Disconnetti la sessione</p>
        </div>
        <LogOut size={16} className="ml-auto text-white/20 group-hover:text-red-400 transition-colors shrink-0" />
      </button>
    </form>
  );
}
