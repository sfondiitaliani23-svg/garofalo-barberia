import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { parseISO } from 'date-fns';
import { displayServiceName, fmtDateTimeShort, statusLabel } from '@/lib/i18n/content-customer';
import { Scissors, Clock, ChevronRight, History, User, Image as ImageIcon, HelpCircle, Home } from 'lucide-react';
import { DateTear } from '@/components/customer/DateTear';
import { LogoutCard } from '@/components/customer/LogoutCard';
import { groupComboAppointments } from '@/lib/utils/group-appointments';
import { PushManager } from '@/components/customer/PushManager';
import { getCustomerLang } from '../_lang';
import { L, localHref } from '@/lib/i18n';

export async function generateMetadata() {
  const lang = await getCustomerLang();
  return { title: L(lang, 'La mia Dashboard | Barberia Garofalo', 'My Dashboard | Barberia Garofalo') };
}

export default async function CustomerDashboardPage() {
  const lang = await getCustomerLang();
  const profile = await getProfile();
  const supabase = await createClient();
  const customerId = profile?.id ?? '';

  // Parallelizziamo le due query per dimezzare il tempo di attesa
  const [upcomingResult, countResult] = supabase
    ? await Promise.all([
        supabase
          .from('appointments')
          .select('*, barber:barbers(name), service:services(name)')
          .eq('customer_id', customerId)
          .eq('status', 'confirmed')
          .gte('starts_at', new Date().toISOString())
          .order('starts_at')
          .limit(6), // Aumentato a 6 per coprire eventuali combo multiple che verranno raggruppate
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customerId)
          .eq('status', 'completed'),
      ])
    : [{ data: null }, { count: null }];

  const rawUpcoming = upcomingResult.data ?? [];
  const upcoming = groupComboAppointments(rawUpcoming).slice(0, 3);
  const totalCount = countResult.count ?? 0;

  const firstName = profile?.full_name?.split(' ')[0] ?? L(lang, 'Cliente', 'Customer');
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? L(lang, 'Buongiorno', 'Good morning')
      : hour < 18
        ? L(lang, 'Buon pomeriggio', 'Good afternoon')
        : L(lang, 'Buonasera', 'Good evening');

  const tier = totalCount >= 10 ? 'Gold' : totalCount >= 5 ? 'Silver' : 'New';
  const toNext = totalCount >= 10 ? 0 : totalCount >= 5 ? 10 - totalCount : 5 - totalCount;
  const nextTier = totalCount >= 5 ? 'Gold' : 'Silver';
  const quick = [
    { href: '/area-cliente/storico', label: L(lang, 'Storico', 'History'), sub: L(lang, 'Le tue prenotazioni', 'Your bookings'), icon: History },
    { href: '/area-cliente/profilo', label: L(lang, 'Profilo', 'Profile'), sub: L(lang, 'I tuoi dati', 'Your details'), icon: User },
    { href: '/area-cliente/galleria', label: L(lang, 'Galleria', 'Gallery'), sub: L(lang, 'I tuoi tagli', 'Your haircuts'), icon: ImageIcon },
    { href: '/area-cliente/assistenza', label: L(lang, 'Assistenza', 'Support'), sub: L(lang, 'Hai bisogno di aiuto?', 'Need help?'), icon: HelpCircle },
  ];

  return (
    <div className="space-y-8">
      <PushManager variant="popup" />

      {/* Benvenuto: cornice doppia a insegna */}
      <section className="border border-gold/55 bg-black/35 p-1.5">
        <div className="border border-gold/30 bg-gradient-to-b from-[#1a140e]/95 to-[#0c0a08]/95 px-6 py-7 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.4em] text-gold">{greeting}</p>
            <Link href={localHref(lang, '/')} className="inline-flex min-h-10 items-center gap-2 border border-dashed border-gold/60 px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-gold transition-colors hover:bg-gold/10">
              <Home size={15} aria-hidden /> {L(lang, 'Vai al sito', 'Go to the website')}
            </Link>
          </div>
          <h1 className="mt-1.5 font-display text-4xl leading-tight text-[#f7ecd0] sm:text-5xl">{firstName}</h1>
          <p className="mt-1 text-sm text-[#bda980]">
            {L(lang, 'Benvenuto nel tuo spazio riservato, Barberia Garofalo, Foggia', 'Welcome to your private area, Barberia Garofalo, Foggia')}
          </p>

          <div className="mt-6 flex flex-wrap gap-3.5">
            <div className="flex items-center gap-3.5 border border-dashed border-gold/50 px-4 py-3">
              <Scissors size={22} className="text-gold" aria-hidden />
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#bda980]">{L(lang, 'Tagli effettuati', 'Haircuts done')}</p>
                <p className="font-display text-3xl leading-tight text-[#f7ecd0]">{totalCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-3.5 border border-dashed border-gold/50 px-4 py-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-double border-gold font-display text-sm text-gold">{tier[0]}</span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#bda980]">{L(lang, 'Cliente fedele', 'Loyalty level')}</p>
                <p className="font-display text-2xl leading-tight text-gold">{tier}</p>
              </div>
              {toNext > 0 && (
                <p className="max-w-[130px] text-[11px] leading-snug text-[#bda980]">
                  {lang === 'en'
                    ? `${toNext} more ${toNext === 1 ? 'haircut' : 'haircuts'} to reach ${nextTier}`
                    : `Ancora ${toNext} ${toNext === 1 ? 'taglio' : 'tagli'} per il livello ${nextTier}`}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Prossimi appuntamenti: tagliandi */}
      <section>
        <div className="mb-3.5 flex items-baseline justify-between">
          <h2 className="font-display text-2xl text-gold">{L(lang, 'Prossimi appuntamenti', 'Upcoming appointments')}</h2>
          <Link href="/area-cliente/storico" className="flex items-center gap-1 text-[11px] uppercase tracking-[0.25em] text-[#bda980] transition-colors hover:text-gold">
            {L(lang, 'Vedi tutti', 'View all')} <ChevronRight size={12} />
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="border border-dashed border-gold/40 bg-black/25 p-8 text-center">
            <Clock size={28} className="mx-auto mb-3 text-gold/50" />
            <p className="text-sm text-[#bda980]">{L(lang, 'Nessun appuntamento in programma.', 'No upcoming appointments.')}</p>
            <Link
              href={localHref(lang, '/prenota')}
              className="mt-4 inline-flex items-center gap-2 bg-gold px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[#0a0807] transition-colors hover:bg-gold-light"
            >
              {L(lang, 'Prenota ora', 'Book now')}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((apt) => {
              const barber = apt.barber as { name: string } | null;
              const service = apt.service as { name: string } | null;
              return (
                <div key={apt.id} className="flex items-stretch border border-gold/45 bg-black/30 transition-colors hover:border-gold/70">
                  <DateTear startsAt={apt.starts_at} lang={lang} />
                  <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 border-l-2 border-dashed border-[#0a0807] px-5 py-4">
                    <div className="min-w-0">
                      <p className="text-lg font-semibold tracking-wide text-white">{service?.name ? displayServiceName(lang, service.name) : service?.name}</p>
                      <p className="mt-1 text-sm text-[#bda980]">
                        {fmtDateTimeShort(lang, parseISO(apt.starts_at))} · {L(lang, 'con', 'with')}{' '}
                        <span className="font-semibold text-gold">{barber?.name}</span>
                      </p>
                    </div>
                    <span className="shrink-0 border border-gold px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
                      {statusLabel(lang, 'confirmed')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Accesso rapido sezioni */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {quick.map(({ href, label, sub, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-2.5 border border-gold/35 bg-black/25 p-4 transition-colors hover:border-gold hover:bg-gold/5"
          >
            <Icon size={26} className="text-gold" aria-hidden />
            <span className="text-[13px] font-bold uppercase tracking-[0.16em] text-[#f3e6c8] group-hover:text-gold">{label}</span>
            <span className="text-[11px] text-[#bda980]">{sub}</span>
          </Link>
        ))}
      </section>

      {/* Logout */}
      <LogoutCard />
    </div>
  );
}
