import NuovaRecensioneView, { ratingFromParam } from '@/app/(public)/recensioni/nuova/view';
import { alternatesFor, OG_EN } from '@/lib/i18n/seo';

export const metadata = {
  title: 'Leave a review',
  description: 'Tell us about your visit to Barberia Garofalo in Foggia. Your review helps other clients choose us.',
  alternates: alternatesFor('/recensioni/nuova', 'en'),
  openGraph: OG_EN,
};
export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<{ stelle?: string | string[] }> }) {
  const { stelle } = await searchParams;
  return <NuovaRecensioneView lang="en" rating={ratingFromParam(stelle)} />;
}
