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
      { url: '/assets/sostituisci-immagini/icone/favicon.png', type: 'image/png' },
      { url: '/assets/sostituisci-immagini/icone/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/assets/sostituisci-immagini/icone/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/assets/sostituisci-immagini/icone/apple-touch-icon.png',
    shortcut: '/assets/sostituisci-immagini/icone/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        {children}
        <Toaster theme="dark" position="top-center" richColors className="!z-[200]" />
      </body>
    </html>
  );
}