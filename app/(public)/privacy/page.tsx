import Link from 'next/link';
import { SITE_CONFIG } from '@/lib/site-config';

export const metadata = {
  title: 'Privacy e Cookie',
  description: "Informativa privacy e cookie della Barberia Garofalo.",
  alternates: { canonical: '/privacy' },
};

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
            <h2 className="font-display text-lg uppercase text-gold">Notifiche sul telefono</h2>
            <p className="mt-2">
              Solo se le attivi tu, salviamo l&apos;indirizzo tecnico che il browser fornisce per inviarti notifiche
              (promemoria degli appuntamenti e novità del salone). Le disattivi in qualsiasi momento dal tuo profilo
              o dalle impostazioni del telefono.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase text-gold">Account: online e ultimo accesso</h2>
            <p className="mt-2">
              Se hai un account e sei collegato, mentre usi il sito registriamo solo l&apos;ora dell&apos;ultima attività,
              per mostrare al salone se sei online e quando hai visitato il sito l&apos;ultima volta. Non registriamo le
              pagine che visiti né la tua posizione. Lo vedono solo gli amministratori del salone.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase text-gold">Promemoria “è ora di tornare”</h2>
            <p className="mt-2">
              Se hai prenotato lasciando la tua email, qualche settimana dopo la visita possiamo inviarti un solo
              promemoria per prenotare di nuovo, come cliente del salone. In fondo a ogni email c&apos;è il link per non
              riceverli più: basta un clic. Le conferme e i promemoria degli appuntamenti restano attivi.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase text-gold">Feedback e candidature</h2>
            <p className="mt-2">
              Il feedback anonimo non raccoglie nome né contatti: salviamo solo voto e commento.
              Le candidature &quot;Lavora con noi&quot; (nome, telefono, email, link e messaggio) sono usate
              solo per valutare la candidatura, sono visibili solo al titolare e vengono cancellate a fine selezione.
              I QR del salone indicano da quale QR arriva una visita, solo se accetti i cookie analitici.
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