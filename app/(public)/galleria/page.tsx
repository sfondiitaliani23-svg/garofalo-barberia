import Link from 'next/link';
import { GalleryGrid } from '@/components/galleria/GalleryGrid';
import '../public-pages.css';

export const metadata = { title: 'Galleria' };

export default function GalleriaPage() {
  return (
    <div className="public-page">
      <section className="page-hero">
        <div className="container-lux">
          <h1 className="hero-heading">Galleria</h1>
          <p className="hero-sub max-w-xl">Il nostro lavoro reale — tagli per uomo, ragazzo e bimbo.</p>
        </div>
      </section>

      <section className="section section-white pb-24">
        <div className="container-lux">
          <GalleryGrid />
          <div className="mt-12 text-center">
            <Link href="/prenota" className="btn-primary">
              Prenota il tuo taglio
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}