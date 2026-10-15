import BarberView, { barberMetadata } from '@/app/(public)/team/[slug]/view';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return barberMetadata('en', params);
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <BarberView lang="en" params={params} />;
}
