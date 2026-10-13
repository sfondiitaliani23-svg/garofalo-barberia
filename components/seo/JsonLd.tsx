import { jsonLdString } from '@/lib/seo';

/** Dati strutturati per Google, invisibili al cliente. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />;
}
