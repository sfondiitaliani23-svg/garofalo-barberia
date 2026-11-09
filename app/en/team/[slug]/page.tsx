import BarberView, { barberMetadata } from '@/app/(public)/team/[slug]/view';

export const revalidate = 600; // 10 minuti: meno calcolo su Vercel (09/11/2026)

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return barberMetadata('en', params);
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <BarberView lang="en" params={params} />;
}
