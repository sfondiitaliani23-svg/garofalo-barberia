import { LocalLandingPage, localPageMetadata } from '@/components/seo/LocalLandingPage';

export const revalidate = 600; // 10 minuti: meno calcolo su Vercel (09/11/2026)
export const metadata = localPageMetadata('taglio-bambino-foggia', 'en');

export default function Page() {
  return <LocalLandingPage slug="taglio-bambino-foggia" lang="en" />;
}
