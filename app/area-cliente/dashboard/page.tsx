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

  const next = upcoming[0];
  const nextBarber = (next?.barber as { name: string } | null) ?? null;
  const nextService = (next?.service as { name: string } | null) ?? null;
  const progress = totalCount >= 10 ? 100 : Math.round((totalCount / (totalCount >= 5 ? 10 : 5)) * 100);
  const initial = (firstName[0] ?? 'G').toUpperCase();

  return (
    <div className="app-dash space-y-7">
      <PushManager variant="popup" />

      {/* Intestazione da app: avatar, saluto, ritorno al sito */}
      <header className="flex items-center gap-3.5">
        <span className="app-avatar" aria-hidden>{initial}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-[#bda980]">{greeting},</p>
          <h1 className="truncate text-2xl font-extrabold leading-tight text-[#f7ecd0]">{firstName}</h1>
        </div>
        <Link href={localHref(lang, '/')} className="app-round-btn" aria-label={L(lang, 'Vai al sito', 'Go to the website')}>
          <Home size={19} aria-hidden />
        </Link>
      </header>

      {/* Scheda principale: il prossimo appuntamento, oppure l'invito a prenotare */}
      <section className="app-hero">
        <div className="app-hero__bg" aria-hidden />
        <div className="relative z-[1] flex min-h-[200px] flex-col justify-end gap-3 p-6 sm:p-7">
          {next ? (
            <>
              <span className="app-chip">{statusLabel(lang, 'confirmed')}</span>
              <p className="text-[12px] uppercase tracking-[0.22em] text-[#f0d79f]">{L(lang, 'Il tuo prossimo appuntamento', 'Your next appointment')}</p>
              <h2 className="max-w-[16ch] text-[28px] font-extrabold leading-[1.08] text-white sm:text-[34px]">
                {nextService?.name ? displayServiceName(lang, nextService.name) : L(lang, 'Appuntamento', 'Appointment')}
              </h2>
              <p className="text-sm text-[#f3e6c8]">
                {fmtDateTimeShort(lang, parseISO(next.starts_at))}
                {nextBarber?.name && <> · {L(lang, 'con', 'with')} <strong className="text-gold">{nextBarber.name}</strong></>}
              </p>
            </>
          ) : (
            <>
              <p className="text-[12px] uppercase tracking-[0.22em] text-[#f0d79f]">{L(lang, 'Nessun appuntamento in programma', 'No upcoming appointments')}</p>
              <h2 className="max-w-[14ch] text-[28px] font-extrabold leading-[1.08] text-white sm:text-[34px]">{L(lang, 'È ora del prossimo taglio?', 'Time for your next cut?')}</h2>
              <Link href={localHref(lang, '/prenota')} className="app-pill self-start">
                {L(lang, 'Prenota ora', 'Book now')} <ChevronRight size={16} aria-hidden />
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Numeri in due schede */}
      <section className="grid grid-cols-2 gap-3">
        <div className="app-card flex flex-col gap-2 p-4">
          <span className="app-icon-tile"><Scissors size={18} aria-hidden /></span>
          <p className="text-[11px] text-[#bda980]">{L(lang, 'Tagli effettuati', 'Haircuts done')}</p>
          <p className="text-3xl font-extrabold leading-none text-[#f7ecd0]">{totalCount}</p>
        </div>
        <div className="app-card flex flex-col gap-2 p-4">
          <span className="app-icon-tile font-display text-sm">{tier[0]}</span>
          <p className="text-[11px] text-[#bda980]">{L(lang, 'Cliente fedele', 'Loyalty level')}</p>
          <p className="text-2xl font-extrabold leading-none text-gold">{tier}</p>
          <div className="app-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
          {toNext > 0 && (
            <p className="text-[11px] leading-snug text-[#bda980]">
              {lang === 'en'
                ? `${toNext} more ${toNext === 1 ? 'haircut' : 'haircuts'} to ${nextTier}`
                : `Ancora ${toNext} ${toNext === 1 ? 'taglio' : 'tagli'} per ${nextTier}`}
            </p>
          )}
        </div>
      </section>

      {/* Sezioni: riquadri con icona piena, come le categorie di un'app */}
      <section>
        <h2 className="app-title mb-3">{L(lang, 'Il tuo spazio', 'Your space')}</h2>
        <div className="grid grid-cols-4 gap-2.5">
          {quick.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="app-cat group">
              <span className="app-icon-tile app-icon-tile--lg"><Icon size={22} aria-hidden /></span>
              <span className="text-[12px] font-semibold text-[#f3e6c8] group-hover:text-gold">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Prossimi appuntamenti: schede che scorrono di lato */}
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="app-title">{L(lang, 'Prossimi appuntamenti', 'Upcoming appointments')}</h2>
          <Link href="/area-cliente/storico" className="flex items-center gap-1 text-[12px] font-semibold text-gold">
            {L(lang, 'Vedi tutti', 'View all')} <ChevronRight size={14} />
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="app-card flex items-center gap-4 p-5">
            <span className="app-icon-tile app-icon-tile--soft"><Clock size={20} aria-hidden /></span>
            <p className="flex-1 text-sm text-[#bda980]">{L(lang, 'Nessun appuntamento in programma.', 'No upcoming appointments.')}</p>
            <Link href={localHref(lang, '/prenota')} className="app-pill app-pill--sm">{L(lang, 'Prenota', 'Book')}</Link>
          </div>
        ) : (
          <div className="app-scroller">
            {upcoming.map((apt) => {
              const barber = apt.barber as { name: string } | null;
              const service = apt.service as { name: string } | null;
              return (
                <div key={apt.id} className="app-card app-appt">
                  <div className="overflow-hidden rounded-2xl"><DateTear startsAt={apt.starts_at} lang={lang} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold text-white">{service?.name ? displayServiceName(lang, service.name) : service?.name}</p>
                    <p className="mt-1 text-[13px] text-[#bda980]">{fmtDateTimeShort(lang, parseISO(apt.starts_at))}</p>
                    <p className="mt-2 flex items-center justify-between gap-2 text-[13px]">
                      <span>{L(lang, 'con', 'with')} <strong className="text-gold">{barber?.name}</strong></span>
                      <span className="app-chip app-chip--sm">{statusLabel(lang, 'confirmed')}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Logout */}
      <LogoutCard />
    </div>
  );
}
