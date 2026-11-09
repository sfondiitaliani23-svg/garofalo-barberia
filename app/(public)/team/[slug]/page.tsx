import BarberView, { barberMetadata } from './view';

export const revalidate = 600; // 10 minuti: meno calcolo su Vercel (09/11/2026)

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return barberMetadata('it', params);
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <BarberView lang="it" params={params} />;
}
