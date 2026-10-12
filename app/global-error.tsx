'use client';

import { useEffect } from 'react';
import { reloadOnce } from '@/lib/utils/stale-reload';

/**
 * Ultima rete di sicurezza: copre anche gli errori nel layout principale.
 * Prova a ricaricare una volta (versione nuova del sito); se non basta,
 * mostra un messaggio semplice invece della pagina bianca.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error('Errore globale:', error);
    reloadOnce();
  }, [error]);

  return (
    <html lang="it">
      <body style={{ margin: 0, background: '#000', color: '#fff', fontFamily: 'Helvetica, Arial, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, margin: 0, letterSpacing: 2, textTransform: 'uppercase' }}>Barberia Garofalo</h1>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', maxWidth: 360, fontSize: 14 }}>
            La pagina non si è caricata bene. Ricaricala per continuare.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ background: '#cd9a4f', color: '#000', border: 0, borderRadius: 999, padding: '10px 22px', fontWeight: 700, cursor: 'pointer' }}
          >
            Ricarica la pagina
          </button>
          <a href="/" style={{ color: '#cd9a4f', fontSize: 13 }}>Torna alla home</a>
        </main>
      </body>
    </html>
  );
}
