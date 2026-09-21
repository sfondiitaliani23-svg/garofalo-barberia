import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteBanners } from '@/components/layout/SiteBanners';
import { ClientFloatingWidgets } from '@/components/layout/ClientFloatingWidgets';
import { getActiveSiteBanners } from '@/lib/actions/content';
import './public-pages.css';

export const revalidate = 60;

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const banners = await getActiveSiteBanners();

  return (
    <>
      <SiteHeader />
      <SiteBanners banners={banners} />
      <main>{children}</main>
      <SiteFooter />
      <ClientFloatingWidgets />
    </>
  );
}