import { StoriesCta } from '@/components/stories/StoriesCta';
import { ContentHero } from '@/components/content/ContentHero';
import { StoriesBar } from '@/components/stories/StoriesBar';
import { getLiveStories } from '@/lib/stories-server';
import { baseSlides } from '@/lib/utils/stories';
import { L, type Lang } from '@/lib/i18n';
import '@/components/content/content.css';

export default async function StoriesView({ lang }: { lang: Lang }) {
  const stories = await getLiveStories(lang);
  return (
    <div className="public-page">
      <ContentHero
        eyebrow="Stories"
        title={L(lang, 'Le storie del giorno', 'Today\'s stories')}
        sub={L(
          lang,
          'Tocca un cerchio: novità del salone, tagli e promo di oggi.',
          'Tap a circle: today\'s shop news, cuts and offers.'
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
          <StoriesCta lang={lang} />
        </div>
      </section>
    </div>
  );
}
