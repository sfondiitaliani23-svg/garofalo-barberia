import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { JsonLd } from '@/components/seo/JsonLd';
import { JOURNAL, formatJournalDate } from '@/lib/data/journal';
import { getAllArticles, getArticleBySlug } from '@/lib/data/journal-store';
import { SITE_URL, breadcrumbJsonLd } from '@/lib/seo';
import { SITE_CONFIG } from '@/lib/site-config';
import '@/components/content/content.css';

export const dynamicParams = true;
export const revalidate = 300;

export function generateStaticParams() {
  return JOURNAL.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getArticleBySlug(slug);
  if (!a) return {};
  return {
    title: a.title,
    description: a.description,
    alternates: { canonical: `/journal/${a.slug}` },
    openGraph: { type: 'article', title: a.title, description: a.description, images: a.image.startsWith('data:') ? undefined : [{ url: a.image }], publishedTime: a.date },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getArticleBySlug(slug);
  if (!a) notFound();
  const others = (await getAllArticles()).filter((x) => x.slug !== a.slug).slice(0, 3);

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
          inLanguage: 'it-IT',
          mainEntityOfPage: `${SITE_URL}/journal/${a.slug}`,
          author: { '@type': 'Organization', name: SITE_CONFIG.name, url: SITE_URL },
          publisher: { '@type': 'Organization', name: SITE_CONFIG.name, logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon.png` } },
        }}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Journal', path: '/journal' },
          { name: a.title, path: `/journal/${a.slug}` },
        ])}
      />
      <section className="section" style={{ paddingTop: '7rem' }}>
        <article className="container-lux jr-article">
          <Link href="/journal" className="jr-back">
            <ArrowLeft size={14} aria-hidden /> Journal
          </Link>
          <p className="jr-meta">
            {a.category} · {a.readMinutes} min di lettura · {formatJournalDate(a.date)}
          </p>
          <h1 className="hero-heading" style={{ textAlign: 'left', fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', margin: '0.6rem 0 1.5rem' }}>
            {a.title}
          </h1>
          <div className="jr-cover">
            <Image src={a.image} alt={a.imageAlt} fill priority sizes="(max-width: 800px) 100vw, 704px" className="object-cover" />
          </div>
          <div className="jr-prose">
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
            <p>Ti è stato utile?</p>
            <div className="cp-cta-actions">
              <Link href={a.cta.href} className="btn-primary">{a.cta.label}</Link>
            </div>
          </div>
        </article>
      </section>
      <section className="section pb-24">
        <div className="container-lux">
          <h2 className="cp-h2 text-center">Leggi anche</h2>
          <div className="jr-grid">
            {others.map((o) => (
              <Link key={o.slug} href={`/journal/${o.slug}`} className="jr-card">
                <div className="jr-card-img">
                  <Image src={o.image} alt={o.imageAlt} fill sizes="(max-width: 720px) 100vw, 33vw" className="object-cover" />
                </div>
                <div className="jr-card-body">
                  <span className="jr-meta">{o.category}</span>
                  <h3 className="jr-card-title">{o.title}</h3>
                  <span className="jr-more">Leggi →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
