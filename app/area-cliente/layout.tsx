import { CustomerSidebar } from '@/components/layout/CustomerSidebar';
import { CustomerFloatingWidgets } from '@/components/layout/ClientFloatingWidgets';
import { CookieLanguageSwitch } from '@/components/i18n/CookieLanguageSwitch';
import { LangProvider } from '@/components/i18n/LangProvider';
import { getProfile } from '@/lib/auth';
import { getCustomerLang } from './_lang';
import '@/components/layout/cust-skin.css';

export const dynamic = 'force-dynamic';

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  const lang = await getCustomerLang();

  return (
    <LangProvider lang={lang}>
      <div className="cust-skin flex min-h-screen">
        <CustomerSidebar profile={profile} />
        <main className="flex-1 lg:ml-56 p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="mx-auto w-full max-w-4xl">
            <div className="mb-4 flex justify-end lg:hidden">
              <CookieLanguageSwitch />
            </div>
            {children}
          </div>
        </main>
        <CustomerFloatingWidgets />
      </div>
    </LangProvider>
  );
}
