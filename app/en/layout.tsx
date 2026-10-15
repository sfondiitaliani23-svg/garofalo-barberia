import type { Metadata } from 'next';
import { PublicShell } from '@/components/layout/PublicShell';
import { OG_EN } from '@/lib/i18n/seo';
import '../(public)/public-pages.css';

export const revalidate = 60;

export const metadata: Metadata = {
  openGraph: OG_EN,
  other: { 'content-language': 'en' },
};

export default async function EnglishLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Il tag <html> è nel layout principale (italiano): qui si imposta la lingua della pagina prima del disegno. */}
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.lang='en'" }} />
      <PublicShell lang="en">{children}</PublicShell>
    </>
  );
}
