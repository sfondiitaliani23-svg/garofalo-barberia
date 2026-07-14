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
      <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex items-center gap-3">
        {/* Bottone Prenotazione Istantanea */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-bold text-black shadow-lg shadow-black/40 transition hover:bg-gold-light"
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
            'pointer-events-auto inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-lg shadow-black/40 transition',
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