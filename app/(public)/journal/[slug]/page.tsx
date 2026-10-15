import { JOURNAL } from '@/lib/data/journal';
import ArticleView, { articleMetadata } from './view';

export const dynamicParams = true;
export const revalidate = 300;

export function generateStaticParams() {
  return JOURNAL.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return articleMetadata(slug, 'it');
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <ArticleView lang="it" params={params} />;
}
