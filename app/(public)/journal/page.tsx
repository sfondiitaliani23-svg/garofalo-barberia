import Link from 'next/link';
import Image from 'next/image';
import { ContentHero } from '@/components/content/ContentHero';
import { formatJournalDate } from '@/lib/data/journal';
import { getAllArticles } from '@/lib/data/journal-store';
import '@/components/content/content.css';

export const metadata = {
  title: 'Journal: consigli su capelli e barba',
  description: 'Consigli pratici dalla Barberia Garofalo di Foggia: ogni quanto tagliare i capelli, sfumature, barba e primo taglio dei bambini.',
  alternates: { canonical: '/journal' },
};

export const revalidate = 300;

export default async function JournalPage() {
  const articles = await getAllArticles();
  return (
    <div className="public-page">
      <ContentHero eyebrow="Journal" title="Consigli dalla poltrona" sub="Brevi letture su capelli, barba e cura. Scritte da chi taglia ogni giorno." />
      <section className="section pb-24">
        <div className="container-lux">
          <div className="jr-grid">
            {articles.map((a, i) => (
              <Link key={a.slug} href={`/journal/${a.slug}`} className="jr-card">
                <div className="jr-card-img">
                  <Image src={a.image} alt={a.imageAlt} fill priority={i === 0} sizes="(max-width: 720px) 100vw, 33vw" className="object-cover" />
                </div>
                <div className="jr-card-body">
                  <span className="jr-meta">
                    {a.category} · {a.readMinutes} min
                  </span>
                  <h2 className="jr-card-title">{a.title}</h2>
                  <p className="jr-card-text">{a.description}</p>
                  <span className="jr-more">Leggi →</span>
                </div>
              </Link>
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-white/60">Ultimo aggiornamento: {formatJournalDate(articles[0].date)}</p>
        </div>
      </section>
    </div>
  );
}
