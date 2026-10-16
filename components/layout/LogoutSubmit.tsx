'use client';

import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';

// Pulsante "Esci" con feedback: mentre l'uscita è in corso si disattiva (un solo clic basta) e mostra il testo di attesa.
export function LogoutSubmit({
  className,
  children,
  pendingLabel,
  ariaLabel,
}: {
  className?: string;
  children: ReactNode;
  pendingLabel: ReactNode;
  ariaLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      aria-label={ariaLabel}
      className={`${className ?? ''} ${pending ? 'cursor-wait opacity-60' : ''}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
