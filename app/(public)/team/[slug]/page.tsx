import BarberView, { barberMetadata } from './view';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return barberMetadata('it', params);
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <BarberView lang="it" params={params} />;
}
