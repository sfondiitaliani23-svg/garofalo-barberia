import Link from 'next/link';
import { ContentHero } from '@/components/content/ContentHero';
import { JsonLd } from '@/components/seo/JsonLd';
import { FAQ_GROUPS, ALL_FAQ } from '@/lib/data/faq';
import { faqJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { getWhatsAppLink } from '@/lib/site-config';
import '@/components/content/content.css';

export const metadata = {
  title: 'Domande frequenti',
  description: 'Risposte rapide su prenotazione, prezzi, disdette, bambini e orari della Barberia Garofalo a Foggia.',
  alternates: { canonical: '/faq' },
};

export default function FaqPage() {
  return (
    <div className="public-page">
      <JsonLd data={faqJsonLd(ALL_FAQ)} />
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Domande frequenti', path: '/faq' }])} />
      <ContentHero eyebrow="Domande frequenti" title="Hai una domanda?" sub="Qui trovi le risposte più chieste. Se manca qualcosa, scrivici." />
      <section className="section pb-24">
        <div className="container-lux cp-wrap">
          {FAQ_GROUPS.map((g) => (
            <div key={g.title} className="cp-faq-group">
              <h2 className="cp-h2">{g.title}</h2>
              <div className="cp-faq">
                {g.items.map((f) => (
                  <details key={f.q}>
                    <summary>{f.q}</summary>
                    <div className="cp-faq-a">
                      <p>{f.a}</p>
                      {f.link && <Link href={f.link.href}>{f.link.label}</Link>}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
          <div className="cp-cta">
            <p>Non hai trovato la risposta?</p>
            <div className="cp-cta-actions">
              <a href={getWhatsAppLink('Ciao! Ho una domanda per Barberia Garofalo:')} target="_blank" rel="noopener noreferrer" className="btn-primary">
                Scrivici su WhatsApp
              </a>
              <Link href="/prenota" className="cp-ghost">Prenota online</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
