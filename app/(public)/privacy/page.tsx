import Link from 'next/link';
import { SITE_CONFIG } from '@/lib/site-config';

export const metadata = { title: 'Privacy e Cookie' };

export default function PrivacyPage() {
  return (
    <section className="py-16">
      <div className="container-lux max-w-3xl">
        <h1 className="font-display text-3xl uppercase sm:text-4xl">Privacy e cookie</h1>
        <p className="mt-3 text-sm text-white/60">
          Informativa sintetica sul trattamento dei dati e sull&apos;uso dei cookie su{' '}
          {SITE_CONFIG.name}.
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-white/75">
          <section>
            <h2 className="font-display text-lg uppercase text-gold">Titolare del trattamento</h2>
            <p className="mt-2">
              {SITE_CONFIG.name} — {SITE_CONFIG.address}. Contatti:{' '}
              <a href={`mailto:${SITE_CONFIG.email}`} className="text-gold hover:underline">
                {SITE_CONFIG.email}
              </a>
              , tel. {SITE_CONFIG.phoneDisplay}.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase text-gold">Cookie necessari</h2>
            <p className="mt-2">
              Sono indispensabili per il funzionamento del sito (es. autenticazione, sicurezza,
              gestione della sessione). Non richiedono consenso e non possono essere disattivati
              dall&apos;utente.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase text-gold">Cookie analitici</h2>
            <p className="mt-2">
              Utilizzati solo con il tuo consenso per raccogliere statistiche aggregate e anonime
              sulle visite (pagine visualizzate, sessioni, traffico in tempo reale). I dati servono
              a migliorare il sito e non vengono venduti a terzi.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase text-gold">Cookie di preferenza</h2>
            <p className="mt-2">
              Con il tuo consenso possiamo memorizzare scelte facoltative, come le risposte al
              sondaggio &quot;Aiutaci a conoscerti&quot;, per non ripeterle a ogni visita.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase text-gold">Diritti dell&apos;utente</h2>
            <p className="mt-2">
              Puoi in qualsiasi momento modificare le preferenze cookie dal banner del sito,
              richiedere accesso, rettifica o cancellazione dei dati scrivendo a{' '}
              <a href={`mailto:${SITE_CONFIG.email}`} className="text-gold hover:underline">
                {SITE_CONFIG.email}
              </a>
              .
            </p>
          </section>
        </div>

        <Link href="/" className="btn-outline mt-10 inline-flex">
          Torna alla home
        </Link>
      </div>
    </section>
  );
}