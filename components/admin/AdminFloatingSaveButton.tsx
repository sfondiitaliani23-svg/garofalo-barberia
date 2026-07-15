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
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-2 text-xs font-bold text-black shadow-lg shadow-black/40 transition hover:bg-gold-light lg:gap-2 lg:px-6 lg:py-3 lg:text-sm"
        >
          <Plus size={18} />
          Prenotazione Istantanea
        </button>

        {/* Bottone Salva */}
        <button
          type="button"
          onClick={() => void saveAll()}
          disabled={!isDirty || isSaving}
          className={cn(
            'pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold shadow-lg shadow-black/40 transition lg:gap-2 lg:px-6 lg:py-3 lg:text-sm',
            isDirty && !isSaving
              ? 'bg-white text-black hover:bg-white/90'
              : 'cursor-not-allowed border border-white/15 bg-[#1a1a1a] text-white/35'
          )}
          aria-label="Salva modifiche"
        >
          <Save size={18} />
          {isSaving ? 'Salvataggio...' : 'Salva'}
        </button>
      </div>

      <AdminInstantBookingModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}