'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Github } from 'lucide-react';
import { signInWithOAuth } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';

function OAuthSubmitButton({
  provider,
  label,
  pendingLabel,
  icon,
}: {
  provider: 'google' | 'github';
  label: string;
  pendingLabel: string;
  icon?: ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" className="w-full" disabled={pending}>
      {icon}
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function OAuthLoginButtons({
  redirectTo = '/area-cliente/dashboard',
  disabled = false,
}: {
  redirectTo?: string;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="space-y-2">
        <Button type="button" variant="outline" className="w-full" disabled>
          Accedi con Google
        </Button>
        <Button type="button" variant="outline" className="w-full" disabled>
          <Github size={18} />
          Accedi con GitHub
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <form action={signInWithOAuth}>
        <input type="hidden" name="provider" value="google" />
        <input type="hidden" name="redirect" value={redirectTo} />
        <OAuthSubmitButton
          provider="google"
          label="Accedi con Google"
          pendingLabel="Apertura Google in corso…"
        />
      </form>
      <form action={signInWithOAuth}>
        <input type="hidden" name="provider" value="github" />
        <input type="hidden" name="redirect" value={redirectTo} />
        <OAuthSubmitButton
          provider="github"
          label="Accedi con GitHub"
          pendingLabel="Apertura GitHub in corso…"
          icon={<Github size={18} />}
        />
      </form>
    </div>
  );
}