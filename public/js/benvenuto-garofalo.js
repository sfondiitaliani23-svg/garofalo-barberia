// Schermata d'ingresso dell'app Barberia Garofalo (03/11/2026): nell'app installata l'accesso è obbligatorio.
// Dopo 2 mesi senza aprire l'app si rifà l'accesso. Il resto è in benvenuto.js (uguale nei quattro siti).
import { benvenuto, TESTI_BASE } from './benvenuto.js?v=20261103h';

const EN = /(?:^|;\s*)gb_lang=en/.test(document.cookie) || location.pathname.startsWith('/en');
// Sessione Supabase nei cookie (non httpOnly): sb-<progetto>-auth-token, a volte in pezzi .0 .1
const dentro = () => /(?:^|;\s*)sb-[^=]+-auth-token(?:\.0)?=/.test(document.cookie);
const esci = () => {
  document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => /^sb-.+-auth-token/.test(n)).forEach((n) => { document.cookie = `${n}=; Max-Age=0; path=/`; });
};

benvenuto({
  chiave: 'garofalo',
  classe: 'bv-garofalo',
  css: '/css/benvenuto.css?v=20261103h',
  nome: 'Barberia Garofalo',
  logo: null, // con il video il logo non serve: si vede già sull'insegna (richiesta di Eliseo, 03/11/2026)
  sfondo: '/assets/sostituisci-immagini/homepage/legno-oro.jpg',
  // Video del negozio (03/11/2026): liberatorie confermate da Eliseo, anche quella dei genitori per il bambino.
  poster: '/assets/app/ingresso-poster.jpg?v=3',
  // Video in alta qualità (25 fotogrammi al secondo). Se il telefono blocca l'avvio automatico,
  // dopo 1,2 secondi parte la stessa scena in WebP animato, sempre a 25 fotogrammi.
  video: '/assets/app/ingresso.mp4?v=3',
  videoRiserva: '/assets/app/ingresso.webp?v=3',
  tema: '#000000',
  obbligo: true,
  lingua: () => (EN ? 'en' : 'it'),
  lingue: true,
  cambiaLingua: (l) => { document.cookie = `gb_lang=${l}; Max-Age=31536000; path=/; SameSite=Lax`; location.href = `${l === 'en' ? '/en' : '/'}?benvenuto=1`; },
  accedi: EN ? '/en/login' : '/login',
  iscriviti: EN ? '/en/register' : '/register',
  escludi: ['/login', '/register', '/reimposta-password', '/auth', '/admin', '/area-cliente', '/privacy', '/en/login', '/en/register', '/en/reimposta-password', '/en/privacy', '/qr', '/link'],
  privacy: EN ? '/en/privacy' : '/privacy',
  notifiche: EN ? '/en/impostazioni' : '/impostazioni',
  assistenza: 'https://wa.me/393201886277',
  versione: '',
  loggato: dentro,
  // Pagina d'avvio dell'app (/app.html): se la schermata non serve si va subito alla home
  dopo: () => { if (location.pathname === '/app.html' || new URLSearchParams(location.search).get('app') === '1') location.replace('/'); },
  esci,
  testi: {
    it: { ...TESTI_BASE.it, accedi: 'Accedi', iscriviti: 'Crea un nuovo account', vantaggiTitolo: 'Vantaggi per i clienti', vantaggi: 'Nell\'app prenoti con Luigi, Francesco e Vittorio in pochi secondi, entri in lista d\'attesa quando il giorno è pieno e ricevi le notifiche dei tuoi appuntamenti.', iscrivitiTitolo: 'Iscriviti gratis', iscrivitiTesto: 'Crea l\'account con la tua email: ti serve un minuto. Dopo ritrovi le tue visite e il riepilogo del tuo anno.', gia: 'Hai già un account? Accedi con i tuoi dati.' },
    en: { ...TESTI_BASE.en, accedi: 'Sign in', iscriviti: 'Create a new account', vantaggiTitolo: 'Client benefits', vantaggi: 'Book with Luigi, Francesco and Vittorio in seconds, join the waiting list when the day is full and get reminders for your appointments.', iscrivitiTitolo: 'Join for free', iscrivitiTesto: 'Create your account with your email in a minute. Then you will find your visits and your year in review.', gia: 'Already have an account? Sign in with your details.' },
  },
});
