import Image from 'next/image';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { LocLink as Link } from '@/components/i18n/LocLink';
import { JsonLd } from '@/components/seo/JsonLd';
import { formatJournalDate } from '@/lib/data/journal';
import { getAllArticles, getArticleBySlug } from '@/lib/data/journal-store';
import { SITE_URL, breadcrumbJsonLd } from '@/lib/seo';
import { SITE_CONFIG } from '@/lib/site-config';
import { L, localHref, type Lang } from '@/lib/i18n';
import { localizeArticle } from '@/lib/i18n/content-info';
import { alternatesFor, pageUrl, OG_LOCALE } from '@/lib/i18n/seo';
import '@/components/content/content.css';

/** Metadati dell'articolo, uguali per italiano e inglese (cambia la lingua). */
export async function articleMetadata(slug: string, lang: Lang): Promise<Metadata> {
  const raw = await getArticleBySlug(slug);
  if (!raw) return {};
  const { article: a, translated } = localizeArticle(raw, lang);
  return {
    title: a.title,
    description: a.description,
    // In inglese, un articolo senza traduzione non va indicizzato: la pagina punta all'originale italiano.
    alternates:
      lang === 'en' && !translated
        ? { canonical: pageUrl(`/journal/${a.slug}`, 'it') }
        : alternatesFor(`/journal/${a.slug}`, lang),
    ...(lang === 'en' && !translated ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: 'article',
      title: a.title,
      description: a.description,
      images: a.image.startsWith('data:') ? undefined : [{ url: a.image }],
      publishedTime: a.date,
      ...(lang === 'en' ? { locale: OG_LOCALE.en } : {}),
    },
  };
}

export default async function ArticleView({ lang, params }: { lang: Lang; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const raw = await getArticleBySlug(slug);
  if (!raw) notFound();
  const { article: a, translated } = localizeArticle(raw, lang);
  const others = (await getAllArticles())
    .filter((x) => x.slug !== a.slug)
    .slice(0, 3)
    .map((x) => localizeArticle(x, lang).article);
  const inItalian = lang === 'en' && !translated;

  return (
    <div className="public-page">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: a.title,
          description: a.description,
          image: a.image.startsWith('data:') ? `${SITE_URL}/pwa/icon-512.png` : `${SITE_URL}${a.image}`,
          datePublished: a.date,
          dateModified: a.date,
          inLanguage: inItalian || lang === 'it' ? 'it-IT' : 'en-GB',
          mainEntityOfPage: pageUrl(`/journal/${a.slug}`, lang),
          author: { '@type': 'Organization', name: SITE_CONFIG.name, url: SITE_URL },
          publisher: { '@type': 'Organization', name: SITE_CONFIG.name, logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon.png` } },
        }}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: localHref(lang, '/') },
          { name: 'Journal', path: localHref(lang, '/journal') },
          { name: a.title, path: localHref(lang, `/journal/${a.slug}`) },
        ])}
      />
      <section className="section" style={{ paddingTop: '7rem' }}>
        <article className="container-lux jr-article">
          <Link href="/journal" className="jr-back">
            <ArrowLeft size={14} aria-hidden /> Journal
          </Link>
          <p className="jr-meta">
            {a.category} · {a.readMinutes} {L(lang, 'min di lettura', 'min read')} · {formatJournalDate(a.date, lang)}
          </p>
          {inItalian && (
            <p className="jr-tip" role="note">
              This article is available in Italian only.
            </p>
          )}
          <h1
            className="hero-heading"
            lang={inItalian ? 'it' : undefined}
            style={{ textAlign: 'left', fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', margin: '0.6rem 0 1.5rem' }}
          >
            {a.title}
          </h1>
          <div className="jr-cover">
            <Image src={a.image} alt={a.imageAlt} fill priority sizes="(max-width: 800px) 100vw, 704px" className="object-cover" />
          </div>
          <div className="jr-prose" lang={inItalian ? 'it' : undefined}>
            {a.blocks.map((b, i) => {
              if (b.type === 'h2') return <h2 key={i}>{b.text}</h2>;
              if (b.type === 'list')
                return (
                  <ul key={i}>
                    {b.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                );
              if (b.type === 'tip') return <p key={i} className="jr-tip">{b.text}</p>;
              return <p key={i}>{b.text}</p>;
            })}
          </div>
          <div className="cp-cta">
            <p>{L(lang, 'Ti è stato utile?', 'Was this helpful?')}</p>
            <div className="cp-cta-actions">
              <Link href={a.cta.href} className="btn-primary">{a.cta.label}</Link>
            </div>
          </div>
        </article>
      </section>
      <section className="section pb-24">
        <div className="container-lux">
          <h2 className="cp-h2 text-center">{L(lang, 'Leggi anche', 'Keep reading')}</h2>
          <div className="jr-grid">
            {others.map((o) => (
              <Link key={o.slug} href={`/journal/${o.slug}`} className="jr-card">
                <div className="jr-card-img">
                  <Image src={o.image} alt={o.imageAlt} fill sizes="(max-width: 720px) 100vw, 33vw" className="object-cover" />
                </div>
                <div className="jr-card-body">
                  <span className="jr-meta">{o.category}</span>
                  <h3 className="jr-card-title">{o.title}</h3>
                  <span className="jr-more">{L(lang, 'Leggi →', 'Read →')}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
