import { CustomerSidebar } from '@/components/layout/CustomerSidebar';

export const dynamic = 'force-dynamic';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-black">
      <CustomerSidebar />
      <main className="flex-1 p-6 lg:p-8">{children}</main>
    </div>
  );
}