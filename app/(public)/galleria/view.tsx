import { LocLink as Link } from '@/components/i18n/LocLink';
import { L, type Lang } from '@/lib/i18n';
import { GalleryCarousel } from '@/components/galleria/GalleryCarousel';
import '../public-pages.css';

export default function GalleriaView({ lang }: { lang: Lang }) {
  return (
    <div className="public-page">
      <section className="page-hero">
        <div className="container-lux">
          <h1 className="hero-heading">{L(lang, 'Galleria', 'Gallery')}</h1>
          <p className="hero-sub max-w-xl">{L(lang, 'Il nostro lavoro reale — tagli per uomo, ragazzo e bimbo.', 'Our real work — cuts for men, teens and kids.')}</p>
        </div>
      </section>

      <section className="section section-white pb-24">
        <div className="container-lux">
          <GalleryCarousel />
          <div className="mt-12 text-center">
            <Link href="/prenota" className="btn-primary">
              {L(lang, 'Prenota il tuo taglio', 'Book your haircut')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}