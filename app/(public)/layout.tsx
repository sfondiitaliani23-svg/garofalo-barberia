import { PublicShell } from '@/components/layout/PublicShell';
import './public-pages.css';

export const revalidate = 600; // 10 minuti: meno calcolo su Vercel (09/11/2026)

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell lang="it">{children}</PublicShell>;
}
