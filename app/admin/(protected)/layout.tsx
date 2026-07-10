import { AdminProtectedShell } from '@/components/layout/AdminProtectedShell';

export const dynamic = 'force-dynamic';

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  return <AdminProtectedShell>{children}</AdminProtectedShell>;
}