'use client';

import { Save } from 'lucide-react';
import { useAdminSaveState } from '@/components/admin/AdminSaveContext';
import { cn } from '@/lib/utils';

export function AdminFloatingSaveButton() {
  const { isDirty, isSaving, saveAll } = useAdminSaveState();

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-40">
      <button
        type="button"
        onClick={() => void saveAll()}
        disabled={!isDirty || isSaving}
        className={cn(
          'pointer-events-auto inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-lg shadow-black/40 transition',
          isDirty && !isSaving
            ? 'bg-gold text-black hover:bg-gold-light'
            : 'cursor-not-allowed border border-white/15 bg-[#1a1a1a] text-white/35'
        )}
        aria-label="Salva modifiche"
      >
        <Save size={18} />
        {isSaving ? 'Salvataggio...' : 'Salva'}
      </button>
    </div>
  );
}