'use client';

import { useFormStatus } from 'react-dom';
import { signInWithGoogle } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';

function GoogleSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="outline" className="w-full" disabled={pending}>
      {pending ? 'Apertura Google in corso…' : 'Accedi con Google'}
    </Button>
  );
}

export function GoogleLoginButton({ redirectTo = '/area-cliente/dashboard' }: { redirectTo?: string }) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="redirect" value={redirectTo} />
      <GoogleSubmitButton />
    </form>
  );
}