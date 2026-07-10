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
    icon: [{ url: '/icon.png', type: 'image/png' }],
    apple: '/apple-icon.png',
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