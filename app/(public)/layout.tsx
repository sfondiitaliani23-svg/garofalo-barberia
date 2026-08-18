import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteBanners } from '@/components/layout/SiteBanners';
import { ClientFloatingWidgets } from '@/components/layout/ClientFloatingWidgets';
import { getActiveSiteBanners } from '@/lib/actions/content';
import { getProfile, getSession } from '@/lib/auth';
import './public-pages.css';

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
      <ClientFloatingWidgets />
    </>
  );
}