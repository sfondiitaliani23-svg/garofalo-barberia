import { LocLink as Link } from '@/components/i18n/LocLink';
import { ContentHero } from '@/components/content/ContentHero';
import { StoriesBar } from '@/components/stories/StoriesBar';
import { getLiveStories } from '@/lib/stories-server';
import { L, type Lang } from '@/lib/i18n';
import '@/components/content/content.css';

export default async function WrappedView({ lang }: { lang: Lang }) {
  const stories = await getLiveStories(lang);
  return (
    <div className="public-page">
      <ContentHero
        eyebrow="Wrapped"
        title={L(lang, 'Le nostre storie, il tuo anno', 'Our stories, your year')}
        sub={L(
          lang,
          'Tocca un cerchio: novità del salone, tagli, promo. Se hai un account, trovi anche il tuo anno da Garofalo.',
          'Tap a circle: shop news, cuts and offers. If you have an account, you will also find your year at Garofalo.'
        )}
      />
      <section className="section pb-24">
        <div className="container-lux cp-wrap" style={{ textAlign: 'center' }}>
          <StoriesBar
            slides={stories}
            lang={lang}
            size="lg"
            empty={<p className="text-white/60">{L(lang, 'Oggi non ci sono storie. Torna presto!', 'No stories today. Come back soon!')}</p>}
          />
          <div className="cp-cta" style={{ marginTop: '3rem' }}>
            <p>{L(lang, 'Vuoi il tuo Wrapped? Accedi: contiamo visite, tempo in poltrona e il tuo servizio preferito.', 'Want your Wrapped? Sign in: we count your visits, time in the chair and your favourite service.')}</p>
            <div className="cp-cta-actions">
              <Link href="/login" className="btn-primary">{L(lang, 'Accedi', 'Sign in')}</Link>
              <Link href="/prenota" className="cp-ghost">{L(lang, 'Prenota', 'Book')}</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
