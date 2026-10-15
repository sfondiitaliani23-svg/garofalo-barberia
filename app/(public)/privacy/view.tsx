import { LocLink as Link } from '@/components/i18n/LocLink';
import { SITE_CONFIG } from '@/lib/site-config';
import { L, type Lang } from '@/lib/i18n';

export default function PrivacyView({ lang }: { lang: Lang }) {
  const email = (
    <a href={`mailto:${SITE_CONFIG.email}`} className="text-gold hover:underline">
      {SITE_CONFIG.email}
    </a>
  );
  return (
    <section className="py-16">
      <div className="container-lux max-w-3xl">
        {lang === 'en' && (
          <p className="mb-6 rounded border border-gold/40 px-4 py-3 text-sm text-white/80" lang="en">
            Courtesy translation. The Italian version prevails.
          </p>
        )}
        <h1 className="font-display text-3xl uppercase sm:text-4xl">{L(lang, 'Privacy e cookie', 'Privacy and cookies')}</h1>
        <p className="mt-3 text-sm text-white/60">
          {L(
            lang,
            "Informativa sintetica sul trattamento dei dati e sull'uso dei cookie su",
            'Short notice on how personal data is processed and how cookies are used on',
          )}{' '}
          {SITE_CONFIG.name}.
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-white/75">
          <section>
            <h2 className="font-display text-lg uppercase text-gold">{L(lang, 'Titolare del trattamento', 'Data controller')}</h2>
            <p className="mt-2">
              {SITE_CONFIG.name} — {SITE_CONFIG.address}. {L(lang, 'Contatti:', 'Contact:')} {email}
              , {L(lang, 'tel.', 'phone')} {SITE_CONFIG.phoneDisplay}.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase text-gold">{L(lang, 'Cookie necessari', 'Necessary cookies')}</h2>
            <p className="mt-2">
              {L(
                lang,
                "Sono indispensabili per il funzionamento del sito (es. autenticazione, sicurezza, gestione della sessione). Non richiedono consenso e non possono essere disattivati dall'utente.",
                'They are essential for the website to work (e.g. authentication, security, session management). They do not require consent and cannot be switched off by the user.',
              )}
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase text-gold">{L(lang, 'Cookie analitici', 'Analytics cookies')}</h2>
            <p className="mt-2">
              {L(
                lang,
                'Utilizzati solo con il tuo consenso per raccogliere statistiche aggregate e anonime sulle visite (pagine visualizzate, sessioni, traffico in tempo reale). I dati servono a migliorare il sito e non vengono venduti a terzi.',
                'Used only with your consent to collect aggregate, anonymous statistics about visits (pages viewed, sessions, real-time traffic). The data is used to improve the website and is not sold to third parties.',
              )}
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase text-gold">{L(lang, 'Cookie di preferenza', 'Preference cookies')}</h2>
            <p className="mt-2">
              {L(
                lang,
                'Con il tuo consenso possiamo memorizzare scelte facoltative, come le risposte al sondaggio "Aiutaci a conoscerti", per non ripeterle a ogni visita.',
                'With your consent we can remember optional choices, such as your answers to the “Help us get to know you” survey, so you do not have to repeat them at every visit.',
              )}
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase text-gold">{L(lang, 'Notifiche sul telefono', 'Phone notifications')}</h2>
            <p className="mt-2">
              {L(
                lang,
                "Solo se le attivi tu, salviamo l'indirizzo tecnico che il browser fornisce per inviarti notifiche (promemoria degli appuntamenti e novità del salone). Le disattivi in qualsiasi momento dal tuo profilo o dalle impostazioni del telefono.",
                'Only if you switch them on, we store the technical address that your browser provides so we can send you notifications (appointment reminders and news from the barbershop). You can switch them off at any time from your profile or from your phone settings.',
              )}
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase text-gold">{L(lang, 'Account: online e ultimo accesso', 'Account: online status and last access')}</h2>
            <p className="mt-2">
              {L(
                lang,
                "Se hai un account e sei collegato, mentre usi il sito registriamo solo l'ora dell'ultima attività, per mostrare al salone se sei online e quando hai visitato il sito l'ultima volta. Non registriamo le pagine che visiti né la tua posizione. Lo vedono solo gli amministratori del salone.",
                'If you have an account and you are logged in, while you use the website we only record the time of your last activity, to show the barbershop whether you are online and when you last visited the website. We do not record the pages you visit or your location. Only the barbershop’s administrators can see this.',
              )}
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase text-gold">{L(lang, 'Promemoria “è ora di tornare”', '“Time to come back” reminder')}</h2>
            <p className="mt-2">
              {L(
                lang,
                "Se hai prenotato lasciando la tua email, qualche settimana dopo la visita possiamo inviarti un solo promemoria per prenotare di nuovo, come cliente del salone. In fondo a ogni email c'è il link per non riceverli più: basta un clic. Le conferme e i promemoria degli appuntamenti restano attivi.",
                'If you booked and left your email, a few weeks after your visit we may send you a single reminder to book again, as a client of the barbershop. At the bottom of every email there is a link to stop receiving them: one click is enough. Appointment confirmations and reminders stay active.',
              )}
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase text-gold">{L(lang, 'Feedback e candidature', 'Feedback and applications')}</h2>
            <p className="mt-2">
              {L(
                lang,
                'Il feedback anonimo non raccoglie nome né contatti: salviamo solo voto e commento. Le candidature "Lavora con noi" (nome, telefono, email, link e messaggio) sono usate solo per valutare la candidatura, sono visibili solo al titolare e vengono cancellate a fine selezione. I QR del salone indicano da quale QR arriva una visita, solo se accetti i cookie analitici.',
                'Anonymous feedback does not collect your name or contact details: we only store the rating and the comment. “Work with us” applications (name, phone, email, link and message) are used only to assess the application, are visible only to the owner and are deleted at the end of the selection. The barbershop’s QR codes show which QR code a visit comes from, only if you accept analytics cookies.',
              )}
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase text-gold">{L(lang, 'Assistente della chat', 'Chat assistant')}</h2>
            <p className="mt-2">
              {L(
                lang,
                'L\'assistente "Eliseo" può usare servizi di intelligenza artificiale di terze parti (Google Gemini e Groq, piani gratuiti) per capire le domande e rispondere. Inviamo solo il testo della conversazione e le informazioni pubbliche del salone, senza nome, account o altri dati. Questi servizi possono conservare i messaggi e usarli per migliorare i loro sistemi: per questo ti chiediamo di non scrivere nella chat dati personali (telefono, email, informazioni sulla salute). Per le prenotazioni usa la pagina Prenota o WhatsApp.',
                'The “Eliseo” assistant may use third-party artificial intelligence services (Google Gemini and Groq, free plans) to understand questions and reply. We only send the text of the conversation and the barbershop’s public information, without your name, account or other data. These services may keep the messages and use them to improve their systems: for this reason we ask you not to write personal data (phone, email, health information) in the chat. For bookings, use the Book page or WhatsApp.',
              )}
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg uppercase text-gold">{L(lang, "Diritti dell'utente", 'User rights')}</h2>
            <p className="mt-2">
              {L(
                lang,
                'Puoi in qualsiasi momento modificare le preferenze cookie dal banner del sito, richiedere accesso, rettifica o cancellazione dei dati scrivendo a',
                'You can at any time change your cookie preferences from the website banner, and request access to, correction or deletion of your data by writing to',
              )}{' '}
              {email}
              .
            </p>
          </section>
        </div>

        <Link href="/" className="btn-outline mt-10 inline-flex">
          {L(lang, 'Torna alla home', 'Back to home')}
        </Link>
      </div>
    </section>
  );
}
