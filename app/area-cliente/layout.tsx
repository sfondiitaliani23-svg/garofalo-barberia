import { CustomerSidebar } from '@/components/layout/CustomerSidebar';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { EliseoChat } from '@/components/layout/EliseoChat';
import { getProfile } from '@/lib/auth';

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