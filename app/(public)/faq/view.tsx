import { LocLink as Link } from '@/components/i18n/LocLink';
import { ContentHero } from '@/components/content/ContentHero';
import { JsonLd } from '@/components/seo/JsonLd';
import { faqJsonLd, breadcrumbJsonLd } from '@/lib/seo';
import { getWhatsAppLink } from '@/lib/site-config';
import { L, localHref, type Lang } from '@/lib/i18n';
import { allFaq, faqGroups } from '@/lib/i18n/content-info';
import '@/components/content/content.css';

export default function FaqView({ lang }: { lang: Lang }) {
  return (
    <div className="public-page">
      <JsonLd data={faqJsonLd(allFaq(lang))} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: localHref(lang, '/') },
          { name: L(lang, 'Domande frequenti', 'FAQ'), path: localHref(lang, '/faq') },
        ])}
      />
      <ContentHero
        eyebrow={L(lang, 'Domande frequenti', 'FAQ')}
        title={L(lang, 'Hai una domanda?', 'Have a question?')}
        sub={L(lang, 'Qui trovi le risposte più chieste. Se manca qualcosa, scrivici.', 'Here you will find the most common answers. If something is missing, write to us.')}
      />
      <section className="section pb-24">
        <div className="container-lux cp-wrap">
          {faqGroups(lang).map((g) => (
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
            <p>{L(lang, 'Non hai trovato la risposta?', 'Did not find your answer?')}</p>
            <div className="cp-cta-actions">
              <a
                href={getWhatsAppLink(L(lang, 'Ciao! Ho una domanda per Barberia Garofalo:', 'Hello! I have a question for Barberia Garofalo:'))}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                {L(lang, 'Scrivici su WhatsApp', 'Message us on WhatsApp')}
              </a>
              <Link href="/prenota" className="cp-ghost">{L(lang, 'Prenota online', 'Book online')}</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
