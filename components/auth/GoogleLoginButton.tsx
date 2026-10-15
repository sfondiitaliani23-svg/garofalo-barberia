'use client';

import { useFormStatus } from 'react-dom';
import { signInWithGoogle } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';

function GoogleSubmitButton() {
  const { pending } = useFormStatus();
  const lang = useLang();

  return (
    <Button type="submit" variant="outline" className="w-full" disabled={pending}>
      {pending ? L(lang, 'Apertura Google in corso…', 'Opening Google…') : L(lang, 'Accedi con Google', 'Sign in with Google')}
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