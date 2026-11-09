import { LocalLandingPage, localPageMetadata } from '@/components/seo/LocalLandingPage';

export const revalidate = 600; // 10 minuti: meno calcolo su Vercel (09/11/2026)
export const metadata = localPageMetadata('barba-foggia', 'it');

export default function Page() {
  return <LocalLandingPage slug="barba-foggia" lang="it" />;
}
