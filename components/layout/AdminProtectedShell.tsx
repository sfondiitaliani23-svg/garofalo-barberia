'use client';

import { usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminFloatingSaveButton } from '@/components/admin/AdminFloatingSaveButton';
import { AdminSaveProvider } from '@/components/admin/AdminSaveContext';
import './admin-skin.css';

/** Etichetta della sezione mostrata sopra il titolo di ogni pagina (come "Dashboard" nella dashboard). */
const SECTIONS: [string, string][] = [
  ['/admin/prenotazioni/storico', 'Storico prenotazioni'],
  ['/admin/prenotazioni', 'Prenotazioni'],
  ['/admin/clienti', 'Clienti'],
  ['/admin/servizi', 'Servizi'],
  ['/admin/promozioni', 'Promozioni'],
  ['/admin/inventario', 'Inventario'],
  ['/admin/analytics', 'Analytics'],
  ['/admin/staff', 'Gestione team'],
  ['/admin/messaggi', 'Messaggi e QR'],
  ['/admin/journal', 'Journal'],
  ['/admin/segnalazioni', 'Assistenza'],
];

export function AdminProtectedShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const wide = pathname === '/admin/dashboard';
  const section = wide ? null : SECTIONS.find(([p]) => pathname === p || pathname.startsWith(`${p}/`))?.[1] ?? null;
  return (
    <AdminSaveProvider>
      <div className="flex min-h-screen bg-black print:bg-white">
        <div className="contents print:hidden">
          <AdminSidebar />
        </div>
        <main className="adm-skin relative min-w-0 flex-1 p-6 pb-24 lg:ml-60 lg:p-8 lg:pb-8 print:ml-0 print:p-0">
          <div className={`mx-auto w-full ${wide ? 'max-w-[1500px]' : 'max-w-5xl'}`}>
            {section && <p className="adm-eyebrow print:hidden">{section}</p>}
            {children}
          </div>
        </main>
        <div className="print:hidden">
          <AdminFloatingSaveButton />
        </div>
      </div>
    </AdminSaveProvider>
  );
}