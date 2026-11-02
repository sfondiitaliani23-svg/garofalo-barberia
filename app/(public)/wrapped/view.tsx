import { WrappedCta } from '@/components/wrapped/WrappedCta';
import { ContentHero } from '@/components/content/ContentHero';
import { StoriesBar } from '@/components/stories/StoriesBar';
import { getLiveStories } from '@/lib/stories-server';
import { baseSlides } from '@/lib/utils/stories';
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
            slides={stories.length ? stories : baseSlides(lang)}
            lang={lang}
            size="lg"
            empty={<p className="text-white/60">{L(lang, 'Oggi non ci sono storie. Torna presto!', 'No stories today. Come back soon!')}</p>}
          />
          <WrappedCta lang={lang} />
        </div>
      </section>
    </div>
  );
}
