import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { WhatsAppFloat } from '@/components/layout/WhatsAppFloat';
import { VisitorTracker } from '@/components/analytics/VisitorTracker';
import './public-pages.css';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <WhatsAppFloat />
      <VisitorTracker />
    </>
  );
}