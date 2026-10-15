import { LocalLandingPage, localPageMetadata } from '@/components/seo/LocalLandingPage';

export const revalidate = 300;
export const metadata = localPageMetadata('taglio-bambino-foggia', 'it');

export default function Page() {
  return <LocalLandingPage slug="taglio-bambino-foggia" lang="it" />;
}
