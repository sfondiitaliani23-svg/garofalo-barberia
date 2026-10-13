import { BookingWizard } from '@/components/booking/BookingWizard';
import { getServices, getBarbers } from '@/lib/actions/bookings';
import { getProfile } from '@/lib/auth';

export const metadata = {
  title: 'Prenota Online',
  description: 'Prenota online taglio, barba e taglio baby da Barberia Garofalo a Foggia: scegli servizio, barbiere e orario libero.',
  alternates: { canonical: '/prenota' },
};
export const dynamic = 'force-dynamic';

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

export default async function PrenotaPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string | string[] }>;
}) {
  const { service } = await searchParams;
  const [services, barbers, profile] = await Promise.all([
    getServices(),
    getBarbers(),
    getProfile(),
  ]);

  return (
    <section className="py-16">
      <div className="container-lux min-w-0 overflow-x-hidden">
        <div className="mb-10 text-center">
          <h1 className="font-display text-4xl uppercase">Prenota il tuo appuntamento</h1>
          <p className="mt-2 text-white/60">Scegli servizio, barbiere e orario disponibile</p>
        </div>
        <BookingWizard
          services={services}
          barbers={barbers}
          defaultName={profile?.full_name ?? ''}
          defaultPhone={profile?.phone ?? ''}
          defaultEmail={profile?.email ?? ''}
          initialServiceIds={pickServiceIds(services, service)}
        />
      </div>
    </section>
  );
}