import Link from 'next/link';
import Image from 'next/image';
import { BtnArrow } from '@/components/home/BtnArrow';
import { HomeClientEffects } from '@/components/home/HomeClientEffects';
import { NewsletterForm } from '@/components/home/NewsletterForm';
import { PERFUMES, PHOTO_STRIP, PRICE_LIST, REVIEWS } from '@/lib/data/homepage';
import './home.css';

function DiamondDivider() {
  return (
    <div className="diamond-divider">
      <div className="diamond-line" />
      <div className="diamond-block" />
      <div className="diamond-line" />
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="home-page">
      <HomeClientEffects />

      <section
        className="hero-section"
        style={{ backgroundImage: "url('/assets/sostituisci-immagini/homepage/1.jpg')" }}
      >
        <div className="hero-content">
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
            <DiamondDivider />
          </div>
          <div className="split-section split-reverse">
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
              <h3 className="heading-display" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.2rem)' }}>
                𝑮𝑨𝑹𝑶𝑭𝑨𝑳𝑶 𝑩𝑨𝑹𝑩𝑬𝑹𝑰𝑨
              </h3>
              <p className="section-lead mb-4">Per l&apos;uomo di ogni età… e anche per i più piccoli!</p>
              <p className="section-lead mb-4">Dal papà al nonno, dal ragazzo al bambino: qui ogni maschio trova il suo posto.</p>
              <p className="section-lead mb-4">
                Tagli precisi, rasature perfette, barbe curate e primi tagli speciali per i piccoli eroi, fatti con tanta pazienza e un grande sorriso.
              </p>
              <p className="section-lead mb-4">
                Perché prendersi cura di sé non ha età.<br />È semplicemente da veri uomini.
              </p>
              <p className="section-lead mb-6">Viale Ignazio D&apos;Addedda, 236 - Foggia</p>
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
                <div className="eyebrow-line" />
                <span className="eyebrow-text">Premium</span>
              </div>
              <h2 className="heading-display">Esperienza di qualità nella barberia di Foggia.</h2>
              <p className="section-lead mb-6">
                Da Garofalo Barberia trovi barbieri esperti, prodotti professionali e tecniche classiche. Che tu voglia un taglio pulito, una barba modellata o un servizio delicato per i più piccoli, uscirai dal salone con stile e sicurezza.
              </p>
              <Link href="/chi-siamo" className="btn-primary">
                <span>Chi siamo</span>
                <BtnArrow />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-cream section-profumi-mood">
        <div className="container-lux">
          <div className="heading-center mb-10">
            <h2 className="heading-display">Profumi Mood</h2>
            <DiamondDivider />
            <p className="section-lead mx-auto text-center">Scopri la collezione di fragranze che stiamo portando in barberia.</p>
          </div>
          <div className="services-grid perfumes-grid">
            {PERFUMES.map((perfume) => (
              <div key={perfume.name} className="perfume-card-flip" tabIndex={0}>
                <div className="perfume-card-inner">
                  <div className="perfume-card-front service-card-luxury">
                    <Image src={perfume.image} alt={perfume.name} width={400} height={500} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div className="service-card-body">
                      <h3>{perfume.name}</h3>
                      <span>Scopri di più</span>
                    </div>
                  </div>
                  <div className="perfume-card-back">
                    <h3>{perfume.name}</h3>
                    <p className="perfume-card-lead">{perfume.lead}</p>
                    <p>{perfume.body}</p>
                    {perfume.notes.map((note) => (
                      <p key={note.label} className="perfume-card-notes">
                        <strong>{note.label}:</strong> {note.value}
                      </p>
                    ))}
                    {perfume.footer && <p className="perfume-card-footer">{perfume.footer}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
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
              <Link href="/prenota" className="btn-primary">
                <span>Prenota ora</span>
                <BtnArrow />
              </Link>
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
            <DiamondDivider />
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
              Recensioni su Google
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
          <DiamondDivider />
          <h2 className="newsletter-heading">
            Iscriviti alla nostra lista email per offerte e novità in anteprima
          </h2>
          <NewsletterForm />
        </div>
      </section>
    </div>
  );
}