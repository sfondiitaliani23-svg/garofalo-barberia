import { SITE_CONFIG } from '@/lib/site-config';

export type FaqItem = { q: string; a: string; link?: { href: string; label: string } };
export type FaqGroup = { title: string; items: FaqItem[] };

/** Domande frequenti. Solo informazioni vere e verificabili sul salone. */
export const FAQ_GROUPS: FaqGroup[] = [
  {
    title: 'Prenotare',
    items: [
      {
        q: 'Come prenoto un appuntamento?',
        a: 'Online, dal sito: scegli il servizio, il barbiere e un orario libero. La conferma è immediata. Se preferisci, puoi scriverci anche su WhatsApp.',
        link: { href: '/prenota', label: 'Prenota online' },
      },
      {
        q: 'Posso prenotare più servizi insieme?',
        a: 'Sì. Nella prenotazione puoi scegliere più servizi, ad esempio taglio e barba. Il sistema calcola da solo il tempo totale e ti mostra solo gli orari in cui c’è posto.',
      },
      {
        q: 'Posso venire senza prenotazione?',
        a: 'Ti consigliamo di prenotare: così l’orario è garantito e non aspetti. Per sapere se c’è posto subito, scrivici su WhatsApp.',
      },
      {
        q: 'Ricevo un promemoria?',
        a: 'Sì. Se lasci la tua email, ricevi la conferma subito e un promemoria la sera prima dell’appuntamento.',
      },
      {
        q: 'Come disdico o sposto un appuntamento?',
        a: `Dall’area clienti, fino a ${SITE_CONFIG.cancellationMinutes} minuti prima. Oppure scrivici su WhatsApp: così liberiamo il posto per un altro cliente.`,
        link: { href: '/area-cliente/appuntamenti', label: 'Vai ai tuoi appuntamenti' },
      },
    ],
  },
  {
    title: 'Servizi e prezzi',
    items: [
      {
        q: 'Lo shampoo è compreso nel taglio?',
        a: 'Sì, ogni taglio comprende lo shampoo. I prezzi del listino sono quelli che paghi, senza supplementi.',
        link: { href: '/servizi', label: 'Vedi il listino' },
      },
      {
        q: 'Che differenza c’è tra i servizi barba?',
        a: 'La lama serve per radere o definire i contorni. Le forbici per modellare una barba che vuoi tenere. Il panno caldo aggiunge preparazione della pelle e relax.',
        link: { href: '/barba-foggia', label: 'Approfondisci la barba' },
      },
      {
        q: 'Non so quale servizio scegliere. Come faccio?',
        a: 'Usa la guida alla scelta nella pagina Servizi: poche domande e ti consigliamo il servizio giusto.',
        link: { href: '/servizi#guida', label: 'Apri la guida' },
      },
      {
        q: 'Quando si paga?',
        a: 'In salone, dopo il servizio. Online non paghi nulla.',
      },
    ],
  },
  {
    title: 'Bambini',
    items: [
      {
        q: 'Tagliate i capelli anche ai bambini?',
        a: 'Sì, anche il primo taglio. Prendiamo tutto il tempo che serve. Scegli il servizio “Taglio baby” quando prenoti.',
        link: { href: '/taglio-bambino-foggia', label: 'Taglio bambino' },
      },
      {
        q: 'È il primo taglio. Cosa devo fare?',
        a: 'Scrivilo nelle note della prenotazione. Ci organizziamo per renderlo un momento tranquillo. Un genitore può restare sempre vicino.',
        link: { href: '/journal/primo-taglio-bambino', label: 'Leggi i consigli' },
      },
    ],
  },
  {
    title: 'Salone',
    items: [
      {
        q: 'Dove siete?',
        a: `In ${SITE_CONFIG.address}. Trovi la mappa nella pagina Contatti.`,
        link: { href: '/contatti', label: 'Contatti e mappa' },
      },
      {
        q: 'Quali sono gli orari?',
        a: 'Da martedì a sabato, mattina e pomeriggio. Lunedì e domenica siamo chiusi. Gli orari precisi sono nella pagina Contatti e in fondo a ogni pagina.',
      },
      {
        q: 'Come posso lasciare un parere?',
        a: 'Puoi lasciare una recensione sul sito oppure un feedback anonimo: lo leggiamo sempre.',
        link: { href: '/feedback', label: 'Lascia un feedback' },
      },
    ],
  },
];

export const ALL_FAQ: FaqItem[] = FAQ_GROUPS.flatMap((g) => g.items);
