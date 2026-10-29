import type { Metadata } from 'next';
import { Montserrat, Rye } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import { SITE_CONFIG } from '@/lib/site-config';
import { SITE_URL } from '@/lib/seo';
import { LoadingScreen } from '@/components/layout/LoadingScreen';
import { ImageProtection } from '@/components/layout/ImageProtection';
import { ServiceWorkerRegister } from '@/components/layout/ServiceWorkerRegister';
import { PushSync } from '@/components/customer/PushSync';
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
  verification: { google: '4ezO--bP8Gm5YWvpCklo0AIUa4OORx8yFxQ7dgmVWbg' },
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
      { url: '/icon.png?v=8', type: 'image/png', sizes: '192x192' },
      { url: '/assets/sostituisci-immagini/icone/favicon-32.png?v=8', type: 'image/png', sizes: '32x32' },
      { url: '/assets/sostituisci-immagini/icone/favicon-16.png?v=8', type: 'image/png', sizes: '16x16' },
    ],
    apple: '/apple-icon.png?v=8',
    shortcut: '/assets/sostituisci-immagini/icone/favicon-32.png?v=8',
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
                "try{if(localStorage.getItem('gb-look')==='gold'){document.documentElement.setAttribute('data-look','gold');var tm=document.querySelector('meta[name=theme-color]');if(tm)tm.setAttribute('content','#e4c36a')}}catch(e){}" +
                "try{if(matchMedia('(display-mode: standalone)').matches||navigator.standalone===true)document.documentElement.classList.add('is-app')}catch(e){}" +
                // Nell'app installata niente zoom della pagina con due dita (solo foto e mappa si ingrandiscono)
                "try{if(document.documentElement.classList.contains('is-app')){var vc='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';var lv=function(){var ms=document.querySelectorAll('meta[name=viewport]');if(!ms.length){var m=document.createElement('meta');m.name='viewport';document.head.appendChild(m);ms=[m]}for(var i=0;i<ms.length;i++)ms[i].content=vc};lv();document.addEventListener('DOMContentLoaded',lv);window.addEventListener('load',lv);try{new MutationObserver(function(){var ms=document.querySelectorAll('meta[name=viewport]');for(var i=0;i<ms.length;i++)if(ms[i].content!==vc){lv();break}}).observe(document.head,{subtree:true,childList:true,attributes:true,attributeFilter:['content']})}catch(e){}document.addEventListener('gesturestart',function(e){if(!(e.target&&e.target.closest&&e.target.closest('[data-zoom]')))e.preventDefault()},{passive:false})}}catch(e){}" +
                "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__gbBIP=e;window.dispatchEvent(new Event('gb-bip'))});",
          }}
        />
      </head>
      <body>
        <LoadingScreen />
        <ImageProtection />
        <ServiceWorkerRegister />
        <PushSync />
        <PresencePing />
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          className="!z-[200]"
          toastOptions={{
            classNames: {
              toast: '!rounded-xl !border !border-[#c9a45c]/40 !bg-[#0c0c0c] !text-white/90 !shadow-[0_10px_40px_rgba(0,0,0,0.6)] !text-[13px] !font-medium',
              success: '!border-[#c9a45c]/60 [&_[data-icon]]:!text-[#c9a45c]',
              error: '!border-red-500/50 [&_[data-icon]]:!text-red-400',
              icon: '!text-[#c9a45c]',
            },
          }}
        />
      </body>
    </html>
  );
}