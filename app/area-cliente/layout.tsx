import dynamicImport from 'next/dynamic';
import { CustomerSidebar } from '@/components/layout/CustomerSidebar';
import { getProfile } from '@/lib/auth';

const ScrollToTop = dynamicImport(() => import('@/components/layout/ScrollToTop').then((m) => m.ScrollToTop), { ssr: false });
const EliseoChat = dynamicImport(() => import('@/components/layout/EliseoChat').then((m) => m.EliseoChat), { ssr: false });

export const dynamic = 'force-dynamic';

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  return (
    <div className="flex min-h-screen bg-black">
      <CustomerSidebar profile={profile} />
      <main className="flex-1 lg:ml-56 p-6 lg:p-8 pb-24 lg:pb-8">
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </main>
      <ScrollToTop />
      <EliseoChat />
    </div>
  );
}