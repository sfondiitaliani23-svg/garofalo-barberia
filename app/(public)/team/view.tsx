import Image from 'next/image';
import { LocLink as Link } from '@/components/i18n/LocLink';
import { ContentHero } from '@/components/content/ContentHero';
import { getBarbers } from '@/lib/actions/bookings';
import { barberSlug } from '@/lib/utils/barber-slug';
import { L, type Lang } from '@/lib/i18n';
import { barberRole } from '@/lib/i18n/content-team';
import '@/components/content/content.css';

export default async function TeamView({ lang }: { lang: Lang }) {
  const barbers = await getBarbers();
  return (
    <div className="public-page">
      <ContentHero
        eyebrow={L(lang, 'Il team', 'The team')}
        title={L(lang, 'Chi ti taglia i capelli', 'Who cuts your hair')}
        sub={L(lang, 'Tre professionisti, la stessa cura. Scegli con chi prenotare.', 'Three professionals, the same care. Choose who to book with.')}
      />
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
                  <p className="tm-role">{barberRole(lang, b.role)}</p>
                  <span className="jr-more">{L(lang, 'Scopri e prenota →', 'Discover and book →')}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
