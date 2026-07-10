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
      { url: '/icon.png?v=4', type: 'image/png', sizes: '192x192' },
      { url: '/assets/sostituisci-immagini/icone/favicon-32.png?v=4', type: 'image/png', sizes: '32x32' },
      { url: '/assets/sostituisci-immagini/icone/favicon-16.png?v=4', type: 'image/png', sizes: '16x16' },
    ],
    apple: '/apple-icon.png?v=4',
    shortcut: '/assets/sostituisci-immagini/icone/favicon-32.png?v=4',
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