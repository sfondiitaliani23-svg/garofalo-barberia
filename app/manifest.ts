import type { MetadataRoute } from 'next';

/** App installabile: "Aggiungi a schermata Home" dal telefono. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Barberia Garofalo',
    short_name: 'Garofalo',
    description: 'Prenota il tuo taglio da Barberia Garofalo, Foggia.',
    lang: 'it',
    start_url: '/?app=1',
    scope: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Prenota', url: '/prenota', icons: [{ src: '/pwa/icon-192.png', sizes: '192x192' }] },
      { name: 'I miei appuntamenti', url: '/area-cliente/appuntamenti', icons: [{ src: '/pwa/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
