import { LocalLandingPage, localPageMetadata } from '@/components/seo/LocalLandingPage';

export const revalidate = 300;
export const metadata = localPageMetadata('barba-foggia');

export default function Page() {
  return <LocalLandingPage slug="barba-foggia" />;
}
