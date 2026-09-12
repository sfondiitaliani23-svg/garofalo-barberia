'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin route error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center px-4">
      <div className="rounded-full bg-red-500/10 p-4 border border-red-500/20 mb-4 text-red-400">
        <AlertCircle size={32} />
      </div>
      <h2 className="font-display text-2xl uppercase tracking-wider text-white">
        Si è verificato un errore
      </h2>
      <p className="mt-2 max-w-md text-sm text-white/50">
        Non è stato possibile caricare questa sezione del pannello admin. Riprova o torna al login.
      </p>
      {error.digest && (
        <p className="mt-1 text-xs text-white/30 font-mono">
          Codice errore: {error.digest}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        <Button onClick={() => reset()} variant="default" className="gap-2">
          <RefreshCw size={16} />
          Ricarica pagina
        </Button>
        <Button
          onClick={() => { window.location.href = '/admin/login'; }}
          variant="outline"
        >
          Accedi di nuovo
        </Button>
      </div>
    </div>
  );
}
