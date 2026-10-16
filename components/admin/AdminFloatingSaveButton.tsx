'use client';

import { useState } from 'react';
import { Save, Plus } from 'lucide-react';
import { useAdminSaveState } from '@/components/admin/AdminSaveContext';
import { AdminInstantBookingModal } from '@/components/admin/AdminInstantBookingModal';
import { cn } from '@/lib/utils';

export function AdminFloatingSaveButton() {
  const { isDirty, isSaving, saveAll } = useAdminSaveState();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="pointer-events-none fixed bottom-[4.5rem] right-4 z-40 flex items-center gap-2 lg:bottom-6 lg:right-6 lg:gap-3">
        {/* Bottone Prenotazione Istantanea */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          title="Prenotazione istantanea"
          aria-label="Prenotazione istantanea"
          className="group pointer-events-auto inline-flex h-10 items-center bg-gold px-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0a0807] shadow-lg shadow-black/60 transition hover:bg-gold-light focus-visible:bg-gold-light"
        >
          <Plus size={20} />
          {/* Etichetta: compare solo al passaggio del mouse o con la tastiera, per non coprire i contenuti */}
          <span className="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 group-hover:ml-2 group-hover:max-w-[14rem] group-focus-visible:ml-2 group-focus-visible:max-w-[14rem]">
            Prenotazione istantanea
          </span>
        </button>

        {/* Bottone Salva: visibile solo quando ci sono modifiche */}
        {(isDirty || isSaving) && (
        <button
          type="button"
          onClick={() => void saveAll()}
          disabled={!isDirty || isSaving}
          className={cn(
            'pointer-events-auto inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] shadow-lg shadow-black/60 transition lg:gap-2 lg:px-4 lg:py-2.5',
            isDirty && !isSaving
              ? 'bg-white text-black hover:bg-white/90'
              : 'cursor-not-allowed border border-white/15 bg-[#1a1a1a] text-white/35'
          )}
          aria-label="Salva modifiche"
        >
          <Save size={18} />
          {isSaving ? 'Salvataggio...' : 'Salva'}
        </button>
        )}
      </div>

      <AdminInstantBookingModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}