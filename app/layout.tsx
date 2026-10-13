import type { Metadata } from 'next';
import { Montserrat, Rye } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { SITE_CONFIG } from '@/lib/site-config';
import { SITE_URL } from '@/lib/seo';
import { LoadingScreen } from '@/components/layout/LoadingScreen';
import { ImageProtection } from '@/components/layout/ImageProtection';
import { ServiceWorkerRegister } from '@/components/layout/ServiceWorkerRegister';
import { PresencePing } from '@/components/layout/PresencePing';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const rye = Rye({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_CONFIG.name,
  keywords: ['barbiere Foggia', 'barberia Foggia', 'taglio uomo Foggia', 'barba Foggia', 'taglio bambino Foggia', 'Barberia Garofalo'],
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    siteName: SITE_CONFIG.name,
    url: SITE_URL,
    title: `${SITE_CONFIG.name} | Barbiere a Foggia`,
    description: 'Taglio uomo, ragazzo e bimbo, barba con rasoio o panno caldo. Prenota online in pochi secondi.',
    images: [{ url: '/assets/sostituisci-immagini/homepage/1.jpg', width: 1200, height: 630, alt: SITE_CONFIG.name }],
  },
  twitter: { card: 'summary_large_image' },
  formatDetection: { telephone: false },
  appleWebApp: { capable: true, title: 'Garofalo', statusBarStyle: 'black-translucent' },
  title: {
    default: `${SITE_CONFIG.name} | Foggia`,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description: SITE_CONFIG.tagline,
  icons: {
    icon: [
      { url: '/icon.png?v=7', type: 'image/png', sizes: '192x192' },
      { url: '/assets/sostituisci-immagini/icone/favicon-32.png?v=7', type: 'image/png', sizes: '32x32' },
      { url: '/assets/sostituisci-immagini/icone/favicon-16.png?v=7', type: 'image/png', sizes: '16x16' },
    ],
    apple: '/apple-icon.png?v=7',
    shortcut: '/assets/sostituisci-immagini/icone/favicon-32.png?v=7',
  },
};

export const viewport = { themeColor: '#000000' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="it"
      className={`${montserrat.variable} ${rye.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('garofalo_cookie_consent'))document.documentElement.classList.add('has-consent')}catch(e){}" +
                "try{if(matchMedia('(display-mode: standalone)').matches||navigator.standalone===true)document.documentElement.classList.add('is-app')}catch(e){}" +
                "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__gbBIP=e;window.dispatchEvent(new Event('gb-bip'))});",
          }}
        />
      </head>
      <body>
        <LoadingScreen />
        <ImageProtection />
        <ServiceWorkerRegister />
        <PresencePing />
        {children}
        <Toaster theme="dark" position="top-center" richColors className="!z-[200]" />
      </body>
    </html>
  );
}