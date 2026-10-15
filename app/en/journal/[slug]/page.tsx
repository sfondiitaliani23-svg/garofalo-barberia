import { JOURNAL } from '@/lib/data/journal';
import ArticleView, { articleMetadata } from '@/app/(public)/journal/[slug]/view';

export const dynamicParams = true;
export const revalidate = 300;

export function generateStaticParams() {
  return JOURNAL.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return articleMetadata(slug, 'en');
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <ArticleView lang="en" params={params} />;
}
