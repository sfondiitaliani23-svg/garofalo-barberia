import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { parseISO } from 'date-fns';
import { formatShopDateTimeShort } from '@/lib/utils/booking-datetime';
import { Calendar, Scissors, Clock, Star, ChevronRight, Sparkles } from 'lucide-react';

export const metadata = { title: 'La mia Dashboard | Barberia Garofalo' };

export default async function CustomerDashboardPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const upcoming = supabase
    ? (
        await supabase
          .from('appointments')
          .select('*, barber:barbers(name), service:services(name)')
          .eq('customer_id', profile?.id ?? '')
          .eq('status', 'confirmed')
          .gte('starts_at', new Date().toISOString())
          .order('starts_at')
          .limit(3)
      ).data ?? []
    : [];

  const totalCount = supabase
    ? (
        await supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', profile?.id ?? '')
          .eq('status', 'completed')
      ).count ?? 0
    : 0;

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Cliente';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';

  return (
    <div className="space-y-8">
      {/* Hero benvenuto */}
      <div className="relative rounded-2xl overflow-hidden border border-gold/15 bg-gradient-to-br from-[#0f0c08] via-[#111] to-[#0a0a0a] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
        {/* Decorazione geometrica gold */}
        <div className="absolute top-0 right-0 w-48 h-48 opacity-5 pointer-events-none">
          <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
            <circle cx="100" cy="100" r="80" stroke="#cd9a4f" strokeWidth="1" />
            <circle cx="100" cy="100" r="60" stroke="#cd9a4f" strokeWidth="0.5" />
            <line x1="100" y1="20" x2="100" y2="180" stroke="#cd9a4f" strokeWidth="0.5" />
            <line x1="20" y1="100" x2="180" y2="100" stroke="#cd9a4f" strokeWidth="0.5" />
          </svg>
        </div>

        <div className="relative z-10">
          <p className="text-xs font-semibold text-gold/70 uppercase tracking-[0.2em] mb-1">{greeting}</p>
          <h1 className="text-3xl font-bold text-white tracking-wide">
            {firstName} <span className="text-gold">✂</span>
          </h1>
          <p className="mt-1 text-white/40 text-sm">
            Benvenuto nel tuo spazio riservato — Barberia Garofalo, Foggia
          </p>

          {/* Stats compatte */}
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-4 py-2.5 border border-white/8">
              <Scissors size={15} className="text-gold" />
              <div>
                <p className="text-xs text-white/40 leading-none">Tagli effettuati</p>
                <p className="text-base font-bold text-white leading-tight">{totalCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-4 py-2.5 border border-white/8">
              <Star size={15} className="text-gold fill-gold" />
              <div>
                <p className="text-xs text-white/40 leading-none">Cliente fedele</p>
                <p className="text-base font-bold text-gold leading-tight">
                  {totalCount >= 10 ? 'Gold' : totalCount >= 5 ? 'Silver' : 'New'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-4 py-2.5 border border-white/8">
              <Sparkles size={15} className="text-gold" />
              <div>
                <p className="text-xs text-white/40 leading-none">Punti fedeltà</p>
                <p className="text-base font-bold text-white leading-tight">{totalCount * 10}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prossimi appuntamenti */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <Calendar size={15} className="text-gold" />
            Prossimi appuntamenti
          </h2>
          <Link
            href="/area-cliente/storico"
            className="text-xs text-white/40 hover:text-gold transition-colors flex items-center gap-1"
          >
            Vedi tutti <ChevronRight size={12} />
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
            <Clock size={28} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">Nessun appuntamento in programma.</p>
            <Link
              href="/prenota"
              className="mt-4 inline-flex items-center gap-2 bg-gold hover:bg-[#ffb949] text-black font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-full transition-all"
            >
              Prenota ora
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((apt) => {
              const barber = apt.barber as { name: string } | null;
              const service = apt.service as { name: string } | null;
              return (
                <div
                  key={apt.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#111] px-5 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.2)] hover:border-gold/20 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                      <Scissors size={16} className="text-gold" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{service?.name}</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {formatShopDateTimeShort(parseISO(apt.starts_at))} · con{' '}
                        <span className="text-gold">{barber?.name}</span>
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-gold border border-gold/20 bg-gold/5 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Confermato
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* CTA Prenota */}
      <div className="rounded-xl border border-gold/15 bg-gradient-to-r from-gold/5 to-transparent p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="font-bold text-white text-sm">Pronto per il prossimo taglio?</p>
          <p className="text-xs text-white/40 mt-0.5">Prenota in pochi secondi, scegli il tuo barbiere preferito</p>
        </div>
        <Link
          href="/prenota"
          className="shrink-0 bg-gold hover:bg-[#ffb949] text-black font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-full transition-all shadow-lg hover:-translate-y-0.5"
        >
          Prenota ora
        </Link>
      </div>

      {/* Accesso rapido sezioni */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { href: '/area-cliente/storico', label: 'Storico', sub: 'Le tue prenotazioni', icon: '📋' },
          { href: '/area-cliente/profilo', label: 'Profilo', sub: 'I tuoi dati', icon: '👤' },
          { href: '/area-cliente/galleria', label: 'Galleria', sub: 'I tuoi tagli', icon: '🖼️' },
          { href: '/area-cliente/assistenza', label: 'Assistenza', sub: 'Hai bisogno di aiuto?', icon: '💬' },
        ].map(({ href, label, sub, icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-xl border border-white/8 bg-[#111] p-4 hover:border-gold/20 hover:bg-[#141414] transition-all shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
          >
            <span className="text-2xl">{icon}</span>
            <p className="mt-2 font-bold text-white text-sm group-hover:text-gold transition-colors">{label}</p>
            <p className="text-[11px] text-white/40">{sub}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}