import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';
import { SITE_CONFIG } from '@/lib/site-config';

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
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bitter:ital,wght@0,400;0,700;1,400&family=Montserrat:wght@400;500;600;700&family=Oswald:wght@400;500;600&family=Rye&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Toaster theme="dark" position="top-center" richColors className="!z-[200]" />
      </body>
    </html>
  );
}