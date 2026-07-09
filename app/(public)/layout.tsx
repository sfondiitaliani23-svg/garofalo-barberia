import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteBanners } from '@/components/layout/SiteBanners';
import { WhatsAppFloat } from '@/components/layout/WhatsAppFloat';
import { VisitorTracker } from '@/components/analytics/VisitorTracker';
import { getActiveSiteBanners } from '@/lib/actions/content';
import './public-pages.css';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const banners = await getActiveSiteBanners();

  return (
    <>
      <SiteHeader />
      <SiteBanners banners={banners} />
      <main>{children}</main>
      <SiteFooter />
      <WhatsAppFloat />
      <VisitorTracker />
    </>
  );
}