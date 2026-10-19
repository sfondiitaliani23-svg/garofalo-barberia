import NuovaRecensioneView, { ratingFromParam } from './view';
import { alternatesFor } from '@/lib/i18n/seo';

export const metadata = {
  title: 'Lascia una recensione · Garofalo Barberia',
  alternates: alternatesFor('/recensioni/nuova', 'it'),
};
export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<{ stelle?: string | string[] }> }) {
  const { stelle } = await searchParams;
  return <NuovaRecensioneView lang="it" rating={ratingFromParam(stelle)} />;
}
