import type { Metadata } from 'next';
import { Montserrat, Rye, Oswald, Bitter } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { SITE_CONFIG } from '@/lib/site-config';
import { LoadingScreen } from '@/components/layout/LoadingScreen';
import { ImageProtection } from '@/components/layout/ImageProtection';

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

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-oswald',
  display: 'swap',
});

const bitter = Bitter({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-bitter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_CONFIG.name} | Foggia`,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description: SITE_CONFIG.tagline,
  icons: {
    icon: [
      { url: '/icon.png?v=6', type: 'image/png', sizes: '192x192' },
      { url: '/assets/sostituisci-immagini/icone/favicon-32.png?v=6', type: 'image/png', sizes: '32x32' },
      { url: '/assets/sostituisci-immagini/icone/favicon-16.png?v=6', type: 'image/png', sizes: '16x16' },
    ],
    apple: '/apple-icon.png?v=6',
    shortcut: '/assets/sostituisci-immagini/icone/favicon-32.png?v=6',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="it"
      className={`${montserrat.variable} ${rye.variable} ${oswald.variable} ${bitter.variable}`}
    >
      <body>
        <LoadingScreen />
        <ImageProtection />
        {children}
        <Toaster theme="dark" position="top-center" richColors className="!z-[200]" />
      </body>
    </html>
  );
}