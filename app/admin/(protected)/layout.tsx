import { AdminProtectedShell } from '@/components/layout/AdminProtectedShell';

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  return <AdminProtectedShell>{children}</AdminProtectedShell>;
}