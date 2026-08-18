import dynamicImport from 'next/dynamic';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteBanners } from '@/components/layout/SiteBanners';
import { getActiveSiteBanners } from '@/lib/actions/content';
import { getProfile, getSession } from '@/lib/auth';
import './public-pages.css';

const CookieConsent = dynamicImport(() => import('@/components/layout/CookieConsent').then((m) => m.CookieConsent), { ssr: false });
const WhatsAppFloat = dynamicImport(() => import('@/components/layout/WhatsAppFloat').then((m) => m.WhatsAppFloat), { ssr: false });
const ScrollToTop = dynamicImport(() => import('@/components/layout/ScrollToTop').then((m) => m.ScrollToTop), { ssr: false });
const EliseoChat = dynamicImport(() => import('@/components/layout/EliseoChat').then((m) => m.EliseoChat), { ssr: false });
const VisitorTracker = dynamicImport(() => import('@/components/analytics/VisitorTracker').then((m) => m.VisitorTracker), { ssr: false });

export const dynamic = 'force-dynamic';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [banners, session] = await Promise.all([getActiveSiteBanners(), getSession()]);
  const profile = session ? await getProfile() : null;

  return (
    <>
      <SiteHeader
        isLoggedIn={!!session}
        userLabel={profile?.full_name?.split(' ')[0] ?? null}
      />
      <SiteBanners banners={banners} />
      <main>{children}</main>
      <SiteFooter />
      <CookieConsent />
      <WhatsAppFloat />
      <ScrollToTop />
      <EliseoChat />
      <VisitorTracker />
    </>
  );
}