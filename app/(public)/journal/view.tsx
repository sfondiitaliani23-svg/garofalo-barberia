import Image from 'next/image';
import { LocLink as Link } from '@/components/i18n/LocLink';
import { ContentHero } from '@/components/content/ContentHero';
import { formatJournalDate } from '@/lib/data/journal';
import { getAllArticles } from '@/lib/data/journal-store';
import { L, type Lang } from '@/lib/i18n';
import { localizeArticle } from '@/lib/i18n/content-info';
import '@/components/content/content.css';

export default async function JournalView({ lang }: { lang: Lang }) {
  const articles = await getAllArticles();
  return (
    <div className="public-page">
      <ContentHero
        eyebrow="Journal"
        title={L(lang, 'Consigli dalla poltrona', 'Tips from the chair')}
        sub={L(lang, 'Brevi letture su capelli, barba e cura. Scritte da chi taglia ogni giorno.', 'Short reads on hair, beard and grooming. Written by people who cut hair every day.')}
      />
      <section className="section pb-24">
        <div className="container-lux">
          <div className="jr-grid">
            {articles.map((raw, i) => {
              const { article: a, translated } = localizeArticle(raw, lang);
              return (
                <Link key={a.slug} href={`/journal/${a.slug}`} className="jr-card">
                  <div className="jr-card-img">
                    <Image src={a.image} alt={a.imageAlt} fill priority={i === 0} sizes="(max-width: 720px) 100vw, 33vw" className="object-cover" />
                  </div>
                  <div className="jr-card-body">
                    <span className="jr-meta">
                      {a.category} · {a.readMinutes} min
                    </span>
                    <h2 className="jr-card-title" lang={translated ? undefined : 'it'}>{a.title}</h2>
                    <p className="jr-card-text" lang={translated ? undefined : 'it'}>{a.description}</p>
                    {!translated && <span className="jr-meta">Available in Italian only</span>}
                    <span className="jr-more">{L(lang, 'Leggi →', 'Read →')}</span>
                  </div>
                </Link>
              );
            })}
          </div>
          <p className="mt-8 text-center text-xs text-white/60">
            {L(lang, 'Ultimo aggiornamento:', 'Last updated:')} {formatJournalDate(articles[0].date, lang)}
          </p>
        </div>
      </section>
    </div>
  );
}
