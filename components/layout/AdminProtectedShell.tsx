'use client';

import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminFloatingSaveButton } from '@/components/admin/AdminFloatingSaveButton';
import { AdminSaveProvider } from '@/components/admin/AdminSaveContext';

export function AdminProtectedShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminSaveProvider>
      <div className="flex min-h-screen bg-black">
        <AdminSidebar />
        <main className="relative min-w-0 flex-1 p-6 pb-28 lg:p-8 lg:pb-28">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
        <AdminFloatingSaveButton />
      </div>
    </AdminSaveProvider>
  );
}