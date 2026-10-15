import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { AppTabBar } from '@/components/layout/AppTabBar';
import { SiteBanners } from '@/components/layout/SiteBanners';
import { ClientFloatingWidgets } from '@/components/layout/ClientFloatingWidgets';
import { LangProvider } from '@/components/i18n/LangProvider';
import { getActiveSiteBanners } from '@/lib/actions/content';
import type { Lang } from '@/lib/i18n';

/** Cornice delle pagine pubbliche (intestazione, avvisi, piè di pagina, widget), uguale per italiano e inglese. */
export async function PublicShell({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const banners = await getActiveSiteBanners();

  return (
    <LangProvider lang={lang}>
      <SiteHeader />
      <SiteBanners banners={banners} />
      <main>{children}</main>
      <SiteFooter lang={lang} />
      <ClientFloatingWidgets />
      <AppTabBar />
    </LangProvider>
  );
}
