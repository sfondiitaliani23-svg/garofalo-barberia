import Image from 'next/image';
import Link from 'next/link';
import { ContentHero } from '@/components/content/ContentHero';
import { getBarbers } from '@/lib/actions/bookings';
import { barberSlug } from '@/lib/utils/barber-slug';
import { formatBarberRole } from '@/lib/utils';
import '@/components/content/content.css';

export const revalidate = 300;
export const metadata = {
  title: 'Il team',
  description: 'Conosci i barbieri della Barberia Garofalo a Foggia e prenota con chi preferisci.',
  alternates: { canonical: '/team' },
};

export default async function TeamPage() {
  const barbers = await getBarbers();
  return (
    <div className="public-page">
      <ContentHero eyebrow="Il team" title="Chi ti taglia i capelli" sub="Tre professionisti, la stessa cura. Scegli con chi prenotare." />
      <section className="section pb-24">
        <div className="container-lux">
          <div className="tm-grid">
            {barbers.map((b) => (
              <Link key={b.id} href={`/team/${barberSlug(b.name)}`} className="tm-card">
                <div className="tm-photo">
                  <Image src={b.image_url ?? '/assets/sostituisci-immagini/team/luigi-garofalo.png'} alt={b.name} fill sizes="(max-width: 720px) 100vw, 33vw" className="object-cover object-top" />
                </div>
                <div className="tm-body">
                  <h2 className="tm-name">{b.name}</h2>
                  <p className="tm-role">{formatBarberRole(b.role)}</p>
                  <span className="jr-more">Scopri e prenota →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
