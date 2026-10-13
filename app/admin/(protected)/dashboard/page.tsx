import { getAdminStats, getUpcomingAdminAppointments, getYesterdayAdminAppointments } from '@/lib/actions/admin';
import { getAnalyticsStats } from '@/lib/actions/analytics';
import { getProfile } from '@/lib/auth';
import { PremiumDashboard } from '@/components/admin/PremiumDashboard';
import { PresencePanel } from '@/components/admin/PresencePanel';
import { getPresenceAction } from '@/lib/actions/presence-admin';

export const metadata = { title: 'Admin Dashboard' };
// Rivalidazione ogni 60s: le statistiche non cambiano al millisecondo,
// cachare riduce drasticamente il carico sul DB e i tempi di risposta.
export const revalidate = 60;

const BACKGROUND = '/assets/gallery/1000313544.jpg';

export default async function AdminDashboardPage() {
  const [stats, analytics, upcoming, yesterdayAppointments, profile, presence] = await Promise.all([
    getAdminStats(),
    getAnalyticsStats(),
    getUpcomingAdminAppointments(5),
    getYesterdayAdminAppointments(5),
    getProfile(),
    getPresenceAction(),
  ]);

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'Admin';
  const today = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Rome',
  }).format(new Date());

  return (
    <div className="relative isolate">
      {/* Foto del salone, versione scura, dietro la parte alta (concept 04) */}
      <div className="pointer-events-none absolute -inset-x-6 -top-6 lg:-inset-x-8 lg:-top-8 h-[560px] -z-10 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 bg-cover"
          style={{
            backgroundImage: `url(${BACKGROUND})`,
            backgroundPosition: 'center 35%',
            filter: 'sepia(0.55) saturate(0.7) brightness(0.32) blur(2px)',
            transform: 'scale(1.04)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-black/60" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black to-transparent" />
      </div>

      <div className="pt-4 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold/80">Barberia Garofalo</p>
        <h1
          className="mt-3 text-4xl sm:text-5xl text-gold"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Ciao {firstName},
        </h1>
        <p className="mt-2 text-lg text-white/85">la tua barberia, sempre sotto controllo.</p>
        <p className="mt-2 text-xs uppercase tracking-[0.14em] text-white/45 first-letter:uppercase">{today}</p>
      </div>

      <div className="mt-8">
        <PremiumDashboard
          initialStats={analytics}
          adminStats={stats}
          upcomingAppointments={upcoming}
          yesterdayAppointments={yesterdayAppointments}
        />
      </div>

      <PresencePanel initial={presence} />
    </div>
  );
}
