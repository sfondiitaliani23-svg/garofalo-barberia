import { LocLink as Link } from '@/components/i18n/LocLink';
import Image from 'next/image';
import { BtnArrow } from '@/components/home/BtnArrow';
import { AnimatedDivider } from '@/components/home/AnimatedDivider';
import { HomeClientEffects } from '@/components/home/HomeClientEffects';
import { PerfumeCardsGrid } from '@/components/home/PerfumeCardsGrid';
import { NewsletterForm } from '@/components/home/NewsletterForm';
import { HomeTicker } from '@/components/home/HomeTicker';
import { JsonLd } from '@/components/seo/JsonLd';
import { localBusinessJsonLd } from '@/lib/seo';
import { getServices } from '@/lib/actions/bookings';
import { L, type Lang } from '@/lib/i18n';
import { perfumes as perfumesFor, photoStrip, priceList } from '@/lib/i18n/content-home';
import { getApprovedReviews } from '@/lib/actions/reviews';
import { unstable_cache } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/server';
import { getLiveStories } from '@/lib/stories-server';
import { StoriesBar } from '@/components/stories/StoriesBar';
import { preload } from 'react-dom';
import './home.css';

const getCachedHomepageProducts = unstable_cache(
  async () => {
    try {
      const client = (await createServiceClient()) ?? (
        process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          ? (await import('@supabase/supabase-js')).createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            )
          : null
      );
      if (!client) return [];
      const { data } = await client
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
        .limit(4);
      return data ?? [];
    } catch {
      return [];
    }
  },
  ['homepage-products-list'],
  { revalidate: 300, tags: ['products'] }
);

export default async function HomeView({ lang }: { lang: Lang }) {
  // Foto del primo schermo: il browser la scarica subito, senza aspettare il CSS.
  preload('/assets/sostituisci-immagini/homepage/1.jpg', { as: 'image', fetchPriority: 'high' });
  const [dbReviews, dbProducts, services, stories] = await Promise.all([
    getApprovedReviews(),
    getCachedHomepageProducts(),
    getServices(),
    getLiveStories(lang),
  ]);

  const perfumeDefaults = perfumesFor(lang);
  const perfumesForGrid = dbProducts.length > 0 ? dbProducts.map((p, idx) => {
    const defaultFallback = perfumeDefaults[idx] || perfumeDefaults[0];
    return {
      name: p.name,
      image: p.image_url || defaultFallback.image,
      lead: p.description || defaultFallback.lead,
      body: p.brand ? L(lang, `Profumo ${p.brand} - ${p.price_cents ? (p.price_cents / 100).toFixed(2) + '€' : 'Disponibile in salone'}`, `${p.brand} perfume - ${p.price_cents ? (p.price_cents / 100).toFixed(2) + '€' : 'Available at the barbershop'}`) : defaultFallback.body,
      notes: defaultFallback.notes ? Array.from(defaultFallback.notes) : [],
      footer: p.name ? L(lang, `Profumo ${p.name}`, `${p.name} perfume`) : null,
    };
  }) : undefined;
  
  const formattedDbReviews = dbReviews.map((r: { comment: string; customer_name: string; rating: number }) => ({
    text: r.comment,
    author: r.customer_name,
    rating: r.rating,
  }));

  const allReviews = formattedDbReviews.slice(0, 3);

  return (
    <div className="home-page">
      <JsonLd data={localBusinessJsonLd(services, lang)} />
      <HomeClientEffects />

      <section
        className="hero-section"
        style={{ backgroundImage: "url('/assets/sostituisci-immagini/homepage/1.jpg')" }}
      >

        <div className="hero-content">
          {/* Logo centrale gigante visibile solo su Mobile */}
          <div className="hero-mobile-logo-wrap md:hidden mb-6 flex justify-center">
            <Image
              src="/assets/sostituisci-immagini/icone/barberia_garofalo.png"
              alt="Barberia Garofalo"
              width={200}
              height={200}
              className="hero-mobile-logo"
              style={{ mixBlendMode: 'screen' }}
              priority
            />
          </div>

          <h1 className="hero-heading">
            {L(lang, 'La migliore esperienza è solo da', 'The best experience starts at')}<br />Barberia Garofalo
          </h1>
          <p className="hero-sub">
            {L(lang, 'Taglio preciso, barba curata e ambiente accogliente per uomo, ragazzo e bimbo. Prenota oggi.', 'Precise cuts, well-kept beards and a welcoming atmosphere for men, boys and kids. Book today.')}
          </p>
          <div className="hero-actions">
            <Link href="/prenota" className="btn-primary">
              <span>{L(lang, 'Prenota ora', 'Book now')}</span>
              <BtnArrow />
            </Link>
          </div>
          <StoriesBar slides={stories} lang={lang} />
        </div>
      </section>


      <section className="section section-dark section-chi-siamo">
        <div className="container-lux">
          <div className="heading-center">
            <h2 className="heading-display">{L(lang, 'Chi siamo', 'About us')}</h2>
            <AnimatedDivider />
          </div>
          <div className="split-section">
            <div className="split-image">
              <Image
                src="/assets/sostituisci-immagini/homepage/3.jpg"
                alt={L(lang, 'Team Garofalo Barberia', 'The Garofalo Barberia team')}
                width={600}
                height={520}
                style={{ width: '100%', height: 'auto', minHeight: 320, maxHeight: 520, objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
              />
            </div>
            <div>
              {lang === 'en' ? (
                <>
                  <p className="section-lead mb-4 text-white/90">
                    <strong className="text-white font-bold">Barberia Garofalo</strong> is a barbershop in the heart of <strong className="text-white font-bold">Foggia</strong>, a point of reference for men of every age… and for the little ones too!
                  </p>
                  <p className="section-lead mb-4 text-white/70">
                    From dad to grandpa, from teenager to child: here every guy finds his place and enjoys a genuine experience of relaxation and care.
                  </p>
                  <p className="section-lead mb-4 text-white/70">
                    We offer <strong className="text-gold font-semibold">precise cuts</strong>, perfect shaves, well-kept beards and special first haircuts for little heroes, done with dedication, skill and maximum comfort.
                  </p>
                  <p className="section-lead mb-4 text-white/70 font-medium">
                    Because taking care of yourself has no age. It is simply what real men do.
                  </p>
                </>
              ) : (
                <>
                  <p className="section-lead mb-4 text-white/90">
                La <strong className="text-white font-bold">Barberia Garofalo</strong> è un salone situato nel cuore della città di <strong className="text-white font-bold">Foggia</strong>. Nato come punto di riferimento per l&apos;uomo di ogni età… e anche per i più piccoli!
                  </p>
                  <p className="section-lead mb-4 text-white/70">
                Dal papà al nonno, dal ragazzo al bambino: qui ogni maschio trova il suo posto, vivendo un&apos;esperienza autentica di relax e cura.
                  </p>
                  <p className="section-lead mb-4 text-white/70">
                Offriamo <strong className="text-gold font-semibold">tagli precisi</strong>, rasature perfette, barbe curate e primi tagli speciali per i piccoli eroi, eseguiti con dedizione, tecnica e il massimo comfort.
                  </p>
                  <p className="section-lead mb-4 text-white/70 font-medium">
                Perché prendersi cura di sé non ha età. È semplicemente da veri uomini.
                  </p>
                </>
              )}
              <p className="section-lead mb-6 text-gold/80 font-semibold tracking-wide uppercase text-xs">
                Viale Ignazio D&apos;Addedda, 236 - Foggia
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/prenota" className="btn-primary">
                  <span>{L(lang, 'Prenota', 'Book')}</span>
                  <BtnArrow />
                </Link>
                <Link href="/chi-siamo" className="btn-outline"><span>{L(lang, 'Scopri di più', 'Learn more')}</span></Link>
              </div>
            </div>
          </div>
        </div>
        <AnimatedDivider variant="wide" className="section-divider-chi-siamo" />
      </section>

      <section className="section photo-strip-section" aria-label={L(lang, 'Galleria servizi barberia', 'Barbershop services gallery')}>
        <div className="photo-strip">
          {photoStrip(lang).map((photo) => (
            <div key={photo.src} className="photo-strip-item" tabIndex={0}>
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 300px"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </section>

      <AnimatedDivider variant="wide" className="section-divider-esperienza" />

      <section className="section section-white section-esperienza">
        <div className="container-lux">
          <div className="split-section">
            <div className="split-image rounded">
              <Image
                src="/assets/sostituisci-immagini/homepage/2.jpg"
                alt={L(lang, 'Barbiere al lavoro in salone Garofalo', 'Barber at work at Garofalo Barberia')}
                width={600}
                height={520}
                style={{ width: '100%', height: 'auto', minHeight: 320, maxHeight: 520, objectFit: 'cover', objectPosition: 'center top', display: 'block', borderRadius: 4 }}
              />
            </div>
            <div>
              <div className="eyebrow">
                <AnimatedDivider variant="eyebrow" />
                <span className="eyebrow-text">Premium</span>
              </div>
              <h2 className="heading-display">{L(lang, 'Esperienza di qualità nella barberia di Foggia.', 'A quality experience at the barbershop in Foggia.')}</h2>
              <p className="section-lead mb-6">
                {L(lang, 'Da Garofalo Barberia trovi barbieri esperti, prodotti professionali e tecniche classiche. Che tu voglia un taglio pulito, una barba modellata o un servizio delicato per i più piccoli, uscirai dal salone con stile e sicurezza.', 'At Garofalo Barberia you will find expert barbers, professional products and classic techniques. Whether you want a clean cut, a shaped beard or a gentle service for the little ones, you will leave the barbershop with style and confidence.')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-cream section-profumi-mood">
        <div className="container-lux">
          <div className="heading-center mb-10">
            <h2 className="heading-display">{L(lang, 'Profumi Mood', 'Mood Fragrances')}</h2>
            <AnimatedDivider />
            <p className="section-lead mx-auto text-center">{L(lang, 'Scopri la collezione di fragranze che stiamo portando in barberia.', 'Discover the collection of fragrances we are bringing to the barbershop.')}</p>
          </div>
          <PerfumeCardsGrid items={perfumesForGrid} />
          <div className="text-center mt-10">
            <Link href="/contatti" className="btn-outline">{L(lang, 'Vieni a scoprirli in negozio', 'Come and discover them at the barbershop')}</Link>
          </div>
        </div>
      </section>

      <section className="section section-dark price-framed-section">
        <div className="container-lux">
          <div className="split-section">
            <div className="split-image">
              <div className="framed-photo-wrap">
                <Image
                  src="/assets/sostituisci-immagini/homepage/quadro-cornice.png"
                  alt={L(lang, 'Barbiere Garofalo al lavoro — cornice in legno', 'Garofalo barber at work — wooden frame')}
                  className="framed-photo-img"
                  width={2771}
                  height={3464}
                  style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }}
                />
              </div>
            </div>
            <div className="price-framed-copy">
              <h2 className="heading-display">{L(lang, 'Quanto costa un taglio da Garofalo Barberia?', 'How much does a haircut cost at Garofalo Barberia?')}</h2>
              <p className="section-lead mb-8">
                {lang === 'en' ? (
                  <>A haircut with shampoo starts from <strong>€17</strong>. Clear, transparent prices for men, boys and kids: same care, same craft, no surprises at the till. Shampoo and styling advice included with every service.</>
                ) : (
                  <>Il taglio e shampoo parte da <strong>€17</strong>. Prezzi chiari e trasparenti per uomo, ragazzo e bimbo: stessa cura, stesso mestiere, niente sorprese in cassa. Shampoo e consulenza styling inclusi con ogni servizio.</>
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-white section-listino">
        <div className="container-lux heading-center">
          <div className="eyebrow justify-center">
            <div className="eyebrow-line" />
            <span className="eyebrow-text">{L(lang, 'Listino', 'Price list')}</span>
            <div className="eyebrow-line" />
          </div>
          <h2 className="heading-display">{L(lang, 'Quanto costa un taglio da Garofalo?', 'How much does a haircut cost at Garofalo?')}</h2>
          <p className="section-lead mx-auto text-center mb-8">{L(lang, 'Prezzi chiari e trasparenti. Niente sorprese in cassa.', 'Clear, transparent prices. No surprises at the till.')}</p>
          <div className="price-list">
            {priceList(lang).map((item) => (
              <div key={item.name} className="price-row">
                <span>{item.name}</span>
                <span>{item.price}</span>
              </div>
            ))}
          </div>
          <Link href="/prenota" className="btn-primary mt-8">{L(lang, 'Prenota ora', 'Book now')}</Link>
        </div>
      </section>

      <section className="section section-dark section-recensioni">
        <div className="container-lux">
          <div className="heading-center mb-10">
            <h2 className="heading-display">{L(lang, 'Cosa dicono di noi', 'What people say about us')}</h2>
            <AnimatedDivider />
          </div>
          <div className="reviews-grid">
            {allReviews.map((review) => (
              <div key={`${review.author}-${review.text.substring(0, 10)}`} className="review-card-lux">
                <div className="review-stars">
                  {'★'.repeat(review.rating || 5)}{'☆'.repeat(5 - (review.rating || 5))}
                </div>
                <p className="review-text">&ldquo;{review.text}&rdquo;</p>
                <p className="review-author">{review.author}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <Link
              href="/recensioni"
              className="btn-primary inline-block"
            >
              {L(lang, 'Tutte le recensioni', 'All reviews')}
            </Link>
            <Link
              href="/recensioni/nuova"
              className="btn-outline inline-block"
            >
              {L(lang, 'Lascia una recensione', 'Leave a review')}
            </Link>
          </div>
        </div>
      </section>

      <section className="section newsletter-section section-newsletter">
        <div className="container-lux newsletter-inner">
          <div className="newsletter-brand">
            <Image
              src="/assets/sostituisci-immagini/icone/barberia_garofalo-yellow.png"
              alt="Barberia Garofalo"
              className="newsletter-logo"
              width={240}
              height={104}
              style={{ width: 'auto', height: 'clamp(78px, 13vw, 104px)', maxWidth: 'clamp(170px, 30vw, 240px)', objectFit: 'contain' }}
            />
            <span className="newsletter-script">{L(lang, 'Ascolta!', 'Stay in the loop!')}</span>
          </div>
          <AnimatedDivider />
          <h2 className="newsletter-heading">
            {L(lang, 'Iscriviti alla nostra lista email per offerte e novità in anteprima', 'Join our email list for early access to offers and news')}
          </h2>
          <NewsletterForm />
        </div>
      </section>

      <HomeTicker />
    </div>
  );
}