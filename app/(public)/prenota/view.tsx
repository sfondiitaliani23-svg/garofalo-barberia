import { BookingWizard } from '@/components/booking/BookingWizard';
import { getServices, getBarbers } from '@/lib/actions/bookings';
import { getProfile } from '@/lib/auth';
import { barberSlug } from '@/lib/utils/barber-slug';
import { L, type Lang } from '@/lib/i18n';

function pickServiceIds(services: { id: string; name: string }[], raw: string | string[] | undefined) {
  const wanted = (Array.isArray(raw) ? raw.join(',') : raw ?? '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const ids: string[] = [];
  for (const w of wanted) {
    const hit = services.find((s) => s.id === w || s.name.toLowerCase() === w);
    if (hit && !ids.includes(hit.id)) ids.push(hit.id);
  }
  return ids;
}

export default async function PrenotaView({
  lang,
  searchParams,
}: {
  lang: Lang;
  searchParams: Promise<{ service?: string | string[]; barber?: string }>;
}) {
  const { service, barber } = await searchParams;
  const [services, barbers, profile] = await Promise.all([
    getServices(),
    getBarbers(),
    getProfile(),
  ]);

  return (
    <section className="py-16">
      <div className="container-lux min-w-0 overflow-x-hidden">
        <div className="mb-10 text-center">
          <h1 className="font-display text-4xl uppercase">{L(lang, 'Prenota il tuo appuntamento', 'Book your appointment')}</h1>
          <p className="mt-2 text-white/60">{L(lang, 'Scegli servizio, barbiere e orario disponibile', 'Choose your service, barber and an available time')}</p>
        </div>
        <BookingWizard
          services={services}
          barbers={barbers}
          defaultName={profile?.full_name ?? ''}
          defaultPhone={profile?.phone ?? ''}
          defaultEmail={profile?.email ?? ''}
          initialServiceIds={pickServiceIds(services, service)}
          initialBarberId={barbers.find((b) => b.id === barber || barberSlug(b.name) === barber)?.id ?? null}
        />
      </div>
    </section>
  );
}