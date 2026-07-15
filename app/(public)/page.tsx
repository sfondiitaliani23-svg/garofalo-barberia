import Link from 'next/link';
import Image from 'next/image';
import { BtnArrow } from '@/components/home/BtnArrow';
import { AnimatedDivider } from '@/components/home/AnimatedDivider';
import { HomeClientEffects } from '@/components/home/HomeClientEffects';
import { PerfumeCardsGrid } from '@/components/home/PerfumeCardsGrid';
import { NewsletterForm } from '@/components/home/NewsletterForm';
import { PHOTO_STRIP, PRICE_LIST, REVIEWS } from '@/lib/data/homepage';
import './home.css';

export default function HomePage() {
  return (
    <div className="home-page">
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
              className="hero-mobile-logo drop-shadow-[0_0_18px_rgba(205,154,79,0.4)]"
              priority
            />
          </div>

          <h1 className="hero-heading">
            La migliore esperienza è solo da<br />Barberia Garofalo
          </h1>
          <p className="hero-sub">
            Taglio preciso, barba curata e ambiente accogliente per uomo, ragazzo e bimbo. Prenota oggi.
          </p>
          <div className="hero-actions">
            <Link href="/prenota" className="btn-primary">
              <span>Prenota ora</span>
              <BtnArrow />
            </Link>
          </div>
        </div>
      </section>


      <section className="section section-dark section-chi-siamo">
        <div className="container-lux">
          <div className="heading-center">
            <h2 className="heading-display">Chi siamo</h2>
            <AnimatedDivider />
          </div>
          <div className="split-section">
            <div className="split-image">
              <Image
                src="/assets/sostituisci-immagini/homepage/3.jpg"
                alt="Team Garofalo Barberia"
                width={600}
                height={520}
                style={{ width: '100%', height: 'auto', minHeight: 320, maxHeight: 520, objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
              />
            </div>
            <div>
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
              <p className="section-lead mb-6 text-gold/80 font-semibold tracking-wide uppercase text-xs">
                Viale Ignazio D&apos;Addedda, 236 - Foggia
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/prenota" className="btn-primary">
                  <span>Prenota</span>
                  <BtnArrow />
                </Link>
                <Link href="/chi-siamo" className="btn-outline"><span>Scopri di più</span></Link>
              </div>
            </div>
          </div>
        </div>
        <AnimatedDivider variant="wide" className="section-divider-chi-siamo" />
      </section>

      <section className="section photo-strip-section" aria-label="Galleria servizi barberia">
        <div className="photo-strip">
          {PHOTO_STRIP.map((photo) => (
            <div key={photo.src} className="photo-strip-item" tabIndex={0}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src} alt={photo.alt} loading="eager" decoding="async" />
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
                alt="Barbiere al lavoro in salone Garofalo"
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
              <h2 className="heading-display">Esperienza di qualità nella barberia di Foggia.</h2>
              <p className="section-lead mb-6">
                Da Garofalo Barberia trovi barbieri esperti, prodotti professionali e tecniche classiche. Che tu voglia un taglio pulito, una barba modellata o un servizio delicato per i più piccoli, uscirai dal salone con stile e sicurezza.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-cream section-profumi-mood">
        <div className="container-lux">
          <div className="heading-center mb-10">
            <h2 className="heading-display">Profumi Mood</h2>
            <AnimatedDivider />
            <p className="section-lead mx-auto text-center">Scopri la collezione di fragranze che stiamo portando in barberia.</p>
          </div>
          <PerfumeCardsGrid />
          <div className="text-center mt-10">
            <Link href="/contatti" className="btn-outline">Vieni a scoprirli in negozio</Link>
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
                  alt="Barbiere Garofalo al lavoro — cornice in legno"
                  className="framed-photo-img"
                  width={2771}
                  height={3464}
                  style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }}
                />
              </div>
            </div>
            <div className="price-framed-copy">
              <h2 className="heading-display">Quanto costa un taglio da Garofalo Barberia?</h2>
              <p className="section-lead mb-8">
                Il taglio e shampoo parte da <strong>€17</strong>. Prezzi chiari e trasparenti per uomo, ragazzo e bimbo: stessa cura, stesso mestiere, niente sorprese in cassa. Shampoo e consulenza styling inclusi con ogni servizio.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-white section-listino">
        <div className="container-lux heading-center">
          <div className="eyebrow justify-center">
            <div className="eyebrow-line" />
            <span className="eyebrow-text">Listino</span>
            <div className="eyebrow-line" />
          </div>
          <h2 className="heading-display">Quanto costa un taglio da Garofalo?</h2>
          <p className="section-lead mx-auto text-center mb-8">Prezzi chiari e trasparenti. Niente sorprese in cassa.</p>
          <div className="price-list">
            {PRICE_LIST.map((item) => (
              <div key={item.name} className="price-row">
                <span>{item.name}</span>
                <span>{item.price}</span>
              </div>
            ))}
          </div>
          <Link href="/prenota" className="btn-primary mt-8">Prenota ora</Link>
        </div>
      </section>

      <section className="section section-dark section-recensioni">
        <div className="container-lux">
          <div className="heading-center mb-10">
            <h2 className="heading-display">Cosa dicono di noi</h2>
            <AnimatedDivider />
          </div>
          <div className="reviews-grid">
            {REVIEWS.map((review) => (
              <div key={review.author} className="review-card-lux">
                <div className="review-stars">★★★★★</div>
                <p className="review-text">&ldquo;{review.text}&rdquo;</p>
                <p className="review-author">{review.author}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <a
              href="https://g.page/r/garofalobarberia/review"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline"
            >
              Lascia una recensione
            </a>
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
            <span className="newsletter-script">Ascolta!</span>
          </div>
          <AnimatedDivider />
          <h2 className="newsletter-heading">
            Iscriviti alla nostra lista email per offerte e novità in anteprima
          </h2>
          <NewsletterForm />
        </div>
      </section>
    </div>
  );
}