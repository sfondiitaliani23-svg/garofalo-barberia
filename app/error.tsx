'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4">
      <div className="rounded-full bg-red-500/10 p-4 border border-red-500/20 mb-4 text-red-400">
        <AlertCircle size={32} />
      </div>
      <h2 className="font-display text-2xl uppercase tracking-wider text-white">
        Qualcosa è andato storto
      </h2>
      <p className="mt-2 max-w-md text-sm text-white/50">
        Si è verificato un problema temporaneo durante il caricamento della pagina.
      </p>
      {error.digest && (
        <p className="mt-1 text-xs text-white/30 font-mono">
          Riferimento: {error.digest}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        <Button onClick={() => reset()} variant="default" className="gap-2">
          <RefreshCw size={16} />
          Ricarica
        </Button>
        <Button
          onClick={() => { window.location.href = '/'; }}
          variant="outline"
        >
          Torna alla Home
        </Button>
      </div>
    </div>
  );
}
