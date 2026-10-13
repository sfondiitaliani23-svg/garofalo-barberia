'use client';

import { usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminFloatingSaveButton } from '@/components/admin/AdminFloatingSaveButton';
import { AdminSaveProvider } from '@/components/admin/AdminSaveContext';

export function AdminProtectedShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const wide = pathname === '/admin/dashboard';
  return (
    <AdminSaveProvider>
      <div className="flex min-h-screen bg-black print:bg-white">
        <div className="contents print:hidden">
          <AdminSidebar />
        </div>
        <main className="relative min-w-0 flex-1 p-6 pb-24 lg:ml-60 lg:p-8 lg:pb-8 print:ml-0 print:p-0">
          <div className={`mx-auto w-full ${wide ? 'max-w-[1500px]' : 'max-w-5xl'}`}>{children}</div>
        </main>
        <div className="print:hidden">
          <AdminFloatingSaveButton />
        </div>
      </div>
    </AdminSaveProvider>
  );
}