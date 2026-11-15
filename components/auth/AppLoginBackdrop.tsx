'use client';

// Nell'app installata (html.is-app) Accedi e Registrati restano nello stile dell'ingresso dell'app:
// video della barberia dietro e modulo in un foglio scuro dal basso (15/11/2026, richiesta di Eliseo).
// Sul sito resta la scheda doppia col fumo d'oro. Il video si carica solo nell'app.
import { useEffect, useState } from 'react';

export function AppLoginBackdrop() {
  const [app, setApp] = useState(false);
  useEffect(() => { setApp(document.documentElement.classList.contains('is-app')); }, []);
  if (!app) return null;
  return (
    <div className="login-app-fondo" aria-hidden>
      <video src="/assets/app/ingresso.mp4?v=3" poster="/assets/app/ingresso-poster.jpg?v=3" muted loop playsInline autoPlay preload="auto" />
      <div className="login-app-velo" />
    </div>
  );
}
